import Link from "next/link";

export interface PhysioCardProps {
  id: string;
  fullName: string;
  specialisation: string | null;
  bio: string | null;
  photoUrl: string | null;
}

export function PhysioCard({ id, fullName, specialisation, bio, photoUrl }: PhysioCardProps) {
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-paper p-6">
      <div className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={fullName}
            className="h-16 w-16 shrink-0 rounded-[16px] object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] bg-azure-soft text-[18px] font-semibold text-azure-hover"
          >
            {initials}
          </div>
        )}
        <div>
          <p className="text-[18px] font-semibold leading-6 tracking-[-0.01em] text-ink">
            {fullName}
          </p>
          {specialisation && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              {specialisation}
            </p>
          )}
        </div>
      </div>

      {bio && <p className="text-[15px] leading-6 text-ink-soft">{bio}</p>}

      <Link
        href={`/book/${id}`}
        className="mt-auto flex h-11 items-center justify-center rounded-btn border border-line-strong bg-paper text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
      >
        Select
      </Link>
    </div>
  );
}
