import { authEnabled } from "../lib/auth/enabled";
import { createClient } from "../lib/supabase/server";
import { Home } from "./_components/Home";

type Search = Promise<{ password?: string }>;

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const { password } = await searchParams;
  if (!authEnabled()) return <Home />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? (await supabase.from("profiles").select("name").eq("id", data.user.id).maybeSingle()).data
    : null;
  return (
    <Home
      signInEnabled
      account={data.user ? { name: profile?.name ?? data.user.email ?? "" } : null}
      passwordUpdated={password === "updated"}
    />
  );
}
