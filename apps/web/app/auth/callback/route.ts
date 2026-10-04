import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { authError } from "../../../lib/auth/errors";
import { safeNext } from "../../../lib/auth/redirect";
import { createClient } from "../../../lib/supabase/server";

/**
 * Where confirmation, recovery and provider sign-in links return (Technical Plan 12.1):
 * starts the session, then goes on to a path inside this app only.
 */
export async function GET(request: NextRequest) {
  if (!authEnabled()) return new NextResponse(null, { status: 404 });
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let failed: { code?: string | undefined } | null = params.get("error_code")
    ? { code: "otp_expired" }
    : null;
  if (!failed) {
    const supabase = await createClient();
    if (code) failed = (await supabase.auth.exchangeCodeForSession(code)).error;
    else if (tokenHash && type)
      failed = (await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
    else failed = { code: "otp_expired" };
  }
  const target = failed ? `/auth/sign-in?error=${authError(failed)}` : safeNext(params.get("next"));
  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}
