import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "@/app/actions/auth";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/book");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-paper px-6 py-24 text-center">
      <h1 className="max-w-lg text-[44px] leading-[48px] font-bold tracking-[-0.03em] text-ink lg:text-[60px] lg:leading-[62px]">
        Need physio?
        <br />
        You&rsquo;re in the right place.
      </h1>
      <p className="max-w-sm text-[15px] leading-6 text-ink-soft">
        Book a 45-minute session with a physiotherapist you trust. Takes a few clicks.
      </p>
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="mt-2 h-11 rounded-full bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
