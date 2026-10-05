import { authEnabled } from "../lib/auth/enabled";
import { createClient } from "../lib/supabase/server";
import { Home } from "./_components/Home";
import { Invitations, type Invitation } from "./_components/Invitations";

type Search = Promise<{ password?: string; account?: string }>;

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const { password, account } = await searchParams;
  if (!authEnabled()) return <Home />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
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
