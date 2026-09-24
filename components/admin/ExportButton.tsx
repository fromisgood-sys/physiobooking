export interface ExportButtonProps {
  query: string;
}

export function ExportButton({ query }: ExportButtonProps) {
  return (
    <a
      href={`/api/admin/export?${query}`}
      className="flex h-10 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
    >
      Export to Excel
    </a>
  );
}
