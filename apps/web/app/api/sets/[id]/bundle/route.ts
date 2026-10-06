import { NextResponse } from "next/server";
import { authEnabled } from "../../../../../lib/auth/enabled";
import { createClient } from "../../../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A set's bundle for the person asking, to keep on their device (R-08.1, T-902). It runs with
 * their session, so it holds only what they may see; nothing outside the band gets anything.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!authEnabled() || !UUID.test(id)) return new NextResponse(null, { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_bundle", { set_id: id });
  if (error || !data) return new NextResponse(null, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
