import "server-only";
import { createAdminClient } from "./supabase/admin";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface CalendarEventInput {
  physiotherapistName: string;
  physiotherapistEmail: string;
  reasonForVisit?: string | null;
  reference: string;
  startUtc: string;
  endUtc: string;
}

function buildEventBody(input: CalendarEventInput) {
  return {
    summary: `Physiotherapy — ${input.physiotherapistName}`,
    description: `${input.reasonForVisit ? `${input.reasonForVisit}\n\n` : ""}Reference: ${input.reference}`,
    start: { dateTime: input.startUtc },
    end: { dateTime: input.endUtc },
    attendees: [{ email: input.physiotherapistEmail }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 24 * 60 },
        { method: "popup", minutes: 60 },
      ],
    },
  };
}

/**
 * Returns a usable access token for the patient's Google account, refreshing
 * it if expired. Returns null if the patient never granted calendar access,
 * or the grant has since been revoked (in which case the stored token is
 * cleared so a future sign-in prompts them to reconnect) — callers must treat
 * null as "skip the calendar step," never as an error to surface to the user.
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_tokens")
    .select("provider_token, provider_refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.provider_token) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const isExpired = expiresAt < Date.now() + 60_000;

  if (!isExpired) return data.provider_token;
  if (!data.provider_refresh_token) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: data.provider_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.warn("[google-calendar] token refresh failed", res.status);
      if (res.status === 400 || res.status === 401) {
        // Refresh token revoked or invalid — clear it so the user is
        // prompted to reconnect their calendar on next sign-in.
        await admin.from("google_tokens").delete().eq("user_id", userId);
      }
      return null;
    }

    const json = await res.json();
    const expires_at = new Date(Date.now() + json.expires_in * 1000).toISOString();

    await admin
      .from("google_tokens")
      .update({ provider_token: json.access_token, expires_at })
      .eq("user_id", userId);

    return json.access_token as string;
  } catch (err) {
    console.error("[google-calendar] token refresh failed", err);
    return null;
  }
}

/** Creates the event on the patient's primary calendar. Returns the event id, or null if skipped/failed. */
export async function createEvent(
  userId: string,
  input: CalendarEventInput
): Promise<string | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  try {
    const res = await fetch(`${CALENDAR_EVENTS_URL}?sendUpdates=all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildEventBody(input)),
    });

    if (!res.ok) {
      console.warn("[google-calendar] createEvent failed", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    return json.id as string;
  } catch (err) {
    console.error("[google-calendar] createEvent error", err);
    return null;
  }
}

/** Patches an existing event in place (reschedule). Returns whether it succeeded. */
export async function updateEvent(
  userId: string,
  eventId: string,
  input: CalendarEventInput
): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return false;

  try {
    const res = await fetch(`${CALENDAR_EVENTS_URL}/${eventId}?sendUpdates=all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildEventBody(input)),
    });
    return res.ok;
  } catch (err) {
    console.error("[google-calendar] updateEvent error", err);
    return false;
  }
}

/** Deletes an event (cancellation). A 404/410 counts as success — it's already gone. */
export async function deleteEvent(userId: string, eventId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return false;

  try {
    const res = await fetch(`${CALENDAR_EVENTS_URL}/${eventId}?sendUpdates=all`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error("[google-calendar] deleteEvent error", err);
    return false;
  }
}
