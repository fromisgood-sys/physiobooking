import "server-only";
import { fromZonedTime } from "date-fns-tz";
import { CLINIC_TZ } from "./tz";

export interface AdminAppointmentFilters {
  dateFrom: string | null;
  dateTo: string | null;
  physioId: string | null;
  status: string | null;
  q: string | null;
}

export const ADMIN_APPOINTMENTS_SELECT =
  "id, starts_at, ends_at, status, reason_for_visit, notes, created_at, physiotherapist_id, patient:profiles!appointments_patient_id_fkey(full_name, email, phone), physiotherapists(full_name)";

const ALLOWED_SORT = new Set(["starts_at", "created_at", "status"]);

export function parseAdminAppointmentFilters(searchParams: URLSearchParams): AdminAppointmentFilters {
  return {
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
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
  if (filters.physioId) q = q.eq("physiotherapist_id", filters.physioId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, "");
    q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`, { foreignTable: "patient" });
  }
  return q;
}
