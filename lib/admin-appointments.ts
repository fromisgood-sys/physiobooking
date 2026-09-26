import "server-only";
import { fromZonedTime } from "date-fns-tz";
import { CLINIC_TZ } from "./tz";

import { adminTimeWindowUtc, type AdminTimeOfDay } from "./admin-appointment-filters";

export interface AdminAppointmentFilters {
  dateFrom: string | null;
  dateTo: string | null;
  timeOfDay: AdminTimeOfDay | null;
  physioId: string | null;
  status: string | null;
  q: string | null;
}

export const ADMIN_APPOINTMENTS_SELECT =
  "id, starts_at, ends_at, status, reason_for_visit, notes, created_at, updated_at, created_by, physiotherapist_id, patient:profiles!appointments_patient_id_fkey(full_name, email, phone), creator:profiles!appointments_created_by_fkey(full_name, email), physiotherapists(full_name, photo_url)";

const ALLOWED_SORT = new Set(["starts_at", "created_at", "status"]);

export function parseAdminAppointmentFilters(searchParams: URLSearchParams): AdminAppointmentFilters {
  return {
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    timeOfDay: (searchParams.get("timeOfDay") as AdminTimeOfDay | null) ?? "all",
    physioId: searchParams.get("physioId"),
    status: searchParams.get("status"),
    q: searchParams.get("q"),
  };
}

export function parseAdminSort(searchParams: URLSearchParams): { sortBy: string; ascending: boolean } {
  const requested = searchParams.get("sortBy") ?? "starts_at";
  const sortBy = ALLOWED_SORT.has(requested) ? requested : "starts_at";
  const ascending = searchParams.get("sortDir") === "asc";
  return { sortBy, ascending };
}

export function dateFromUtc(dateFrom: string): string {
  return fromZonedTime(`${dateFrom}T00:00:00`, CLINIC_TZ).toISOString();
}

export function dateToUtc(dateTo: string): string {
  return fromZonedTime(`${dateTo}T23:59:59.999`, CLINIC_TZ).toISOString();
}

/** Applies filters to a Supabase query builder. Both the list and export routes share this so the export always matches what's on screen. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAdminAppointmentFilters<T extends { gte: any; lte: any; eq: any; or: any }>(
  query: T,
  filters: AdminAppointmentFilters
): T {
  let q = query;
  if (filters.dateFrom) q = q.gte("starts_at", dateFromUtc(filters.dateFrom));
  if (filters.dateTo) q = q.lte("starts_at", dateToUtc(filters.dateTo));
  if (filters.timeOfDay && filters.timeOfDay !== "all" && filters.dateFrom) {
    const window = adminTimeWindowUtc(filters.dateFrom, filters.timeOfDay, CLINIC_TZ);
    if (window) {
      q = q.gte("starts_at", window.start).lt("starts_at", window.end);
    }
  }
  if (filters.physioId) q = q.eq("physiotherapist_id", filters.physioId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, "");
    q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`, { foreignTable: "patient" });
  }
  return q;
}
