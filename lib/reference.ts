/** Display-only booking reference derived from an appointment's id, e.g. "APT-8F3C21". */
export function appointmentReference(id: string): string {
  return `APT-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
