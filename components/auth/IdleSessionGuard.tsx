"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"] as const;

export function IdleSessionGuard() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    let active = false;
    const signOutForIdle = async () => {
      if (!active) return;
      await supabase.auth.signOut();
      router.replace("/?reason=session-expired");
    };
    const resetTimer = () => {
      if (!active) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(signOutForIdle, IDLE_TIMEOUT_MS);
    };
    supabase.auth.getSession().then(({ data }) => {
      active = Boolean(data.session);
      resetTimer();
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      active = Boolean(session);
      if (event === "SIGNED_IN") resetTimer();
      if (event === "SIGNED_OUT" && timer.current) clearTimeout(timer.current);
    });
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      subscription.subscription.unsubscribe();
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [router, supabase]);

  return null;
}
