import { rootCallback } from "../lib/auth/callback";
import { authEnabled, waitlistEnabled } from "../lib/auth/enabled";
import { createClient } from "../lib/supabase/server";
import { redirect } from "next/navigation";
import { Home } from "./_components/Home";
import { Landing, type WaitlistResult } from "./_landing/Landing";
import { Invitations, type Invitation } from "./_components/Invitations";

type Search = Promise<Record<string, string | string[] | undefined>>;
const RESULTS: readonly string[] = ["sent", "invalid", "unavailable"];

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  // A sign-in Supabase sent back here instead of /auth/callback finishes there (T-401).
  const callback = authEnabled() ? rootCallback(search) : null;
  if (callback) redirect(callback);
  const text = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  const [password, account, waitlist] = [
    text(search.password),
    text(search.account),
    text(search.waitlist),
  ];
  // Visitors get the landing page (T-1201); signed-in people get their home.
  const landing = (
    <Landing
      signInEnabled={authEnabled()}
      waitlistReady={waitlistEnabled()}
      result={RESULTS.includes(waitlist ?? "") ? (waitlist as WaitlistResult) : null}
      accountDeleted={account === "deleted"}
    />
  );
  if (!authEnabled()) return landing;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return landing;
  const [profile, invitations] = data.user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("name")
          .eq("id", data.user.id)
          .maybeSingle()
          .then((r) => r.data),
        supabase.rpc("my_invitations").then((r) => (r.data ?? []) as Invitation[]),
      ])
    : [null, []];
  return (
    <Home
      signInEnabled
      account={data.user ? { name: profile?.name ?? data.user.email ?? "" } : null}
      passwordUpdated={password === "updated"}
      accountDeleted={account === "deleted"}
    >
      <Invitations invitations={invitations} />
    </Home>
  );
}
