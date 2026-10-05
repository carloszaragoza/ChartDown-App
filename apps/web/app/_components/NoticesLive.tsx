"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "../../lib/supabase/browser";

/**
 * Brings a new notice in as soon as it is made (T-1002): Supabase Realtime sends the person's
 * own notices only (row-level security), and the page and its unread count are read again.
 */
export function NoticesLive({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let stopped = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (stopped) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (stopped) return;
      channel = supabase
        .channel(`notices:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
    })();
    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, router]);
  return null;
}
