import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "../../../../lib/auth/enabled";
import { BAND_COOKIE } from "../../../../lib/shell/shell";
import { createClient } from "../../../../lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The side navigation's band switcher (Design Handoff 2.0, section 4): remembers the band in a
 * cookie and opens it; the personal space opens its sets. Only a band the person is in.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) return new NextResponse(null, { status: 404 });
  const { id } = await params;
  const back = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!UUID.test(id)) return back("/bands");
  const supabase = await createClient();
  // Row-level security finds the band only for its members.
  const { data: band } = await supabase
    .from("bands")
    .select("id, is_personal")
    .eq("id", id)
    .maybeSingle();
  if (!band) return back("/bands");
  const response = back(band.is_personal ? `/bands/${id}/sets` : `/bands/${id}`);
  response.cookies.set(BAND_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
