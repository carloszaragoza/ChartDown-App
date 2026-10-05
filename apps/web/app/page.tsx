import { authEnabled, waitlistEnabled } from "../lib/auth/enabled";
import { createClient } from "../lib/supabase/server";
import { Home } from "./_components/Home";
import { Landing, type WaitlistResult } from "./_landing/Landing";
import { Invitations, type Invitation } from "./_components/Invitations";

type Search = Promise<{ password?: string; account?: string; waitlist?: string }>;
const RESULTS: readonly string[] = ["sent", "invalid", "unavailable"];

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const { password, account, waitlist } = await searchParams;
  // Visitors get the landing page (T-1201); signed-in people get their home.
  const landing = (
    <Landing
      signInEnabled={authEnabled()}
      waitlistReady={waitlistEnabled()}
      result={RESULTS.includes(waitlist ?? "") ? (waitlist as WaitlistResult) : null}
    />
  );
  if (!authEnabled()) return landing;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user && account !== "deleted") return landing;
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
