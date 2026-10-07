import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { noticeHref } from "../../../lib/notices/notice";
import { createClient } from "../../../lib/supabase/server";

/**
 * Opening a notice (T-1002, Design Handoff 2.0 screen 01): marks it read and goes to what it is
 * about. A link, so the whole row of the list opens it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authEnabled()) return new NextResponse(null, { status: 404 });
  const { id } = await params;
  const back = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const supabase = await createClient();
  // Row-level security finds only the person's own notice; where it leads is read from it.
  const { data } = await supabase
    .from("notifications")
    .select("type, detail")
    .eq("id", id)
    .maybeSingle();
  if (!data) return back("/notices");
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  revalidatePath("/", "layout");
  return back(noticeHref(data as { type: string; detail: Record<string, unknown> }));
}
