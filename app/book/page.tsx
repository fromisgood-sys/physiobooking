import { createClient } from "@/lib/supabase/server";
import { PhysioCard } from "@/components/booking/PhysioCard";

export default async function BookPage() {
  const supabase = await createClient();
  const { data: physiotherapists, error } = await supabase
    .from("physiotherapists")
    .select("id, full_name, specialisation, bio, photo_url")
    .eq("is_active", true)
    .order("full_name");

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="max-w-md text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Choose a physiotherapist
      </h1>
      <p className="mt-2 max-w-md text-[15px] leading-6 text-ink-soft">
        Pick who you&rsquo;d like to see. You can change this next time.
      </p>

      {error && (
        <p className="mt-10 text-[15px] text-state-danger">
          Couldn&rsquo;t load physiotherapists. Try refreshing the page.
        </p>
      )}

      {!error && physiotherapists?.length === 0 && (
        <p className="mt-10 text-[15px] text-ink-soft">
          No physiotherapists are available right now.
        </p>
      )}

      {!error && physiotherapists && physiotherapists.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {physiotherapists.map((p) => (
            <PhysioCard
              key={p.id}
              id={p.id}
              fullName={p.full_name}
              specialisation={p.specialisation}
              bio={p.bio}
              photoUrl={p.photo_url}
            />
          ))}
        </div>
      )}
    </main>
  );
}
