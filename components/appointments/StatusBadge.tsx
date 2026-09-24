const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  confirmed: { label: "Confirmed", dot: "bg-state-ok", text: "text-state-ok" },
  rescheduled: { label: "Rescheduled", dot: "bg-state-warn", text: "text-state-warn" },
  cancelled: { label: "Cancelled", dot: "bg-state-danger", text: "text-state-danger" },
  completed: { label: "Completed", dot: "bg-ink-muted", text: "text-ink-muted" },
  no_show: { label: "No-show", dot: "bg-state-danger", text: "text-state-danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[15px] font-medium ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
