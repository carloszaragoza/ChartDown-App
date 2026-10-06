"use server";

import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authEnabled } from "../../lib/auth/enabled";
import { authError } from "../../lib/auth/errors";
import { isProvider } from "../../lib/auth/providers";
import { safeNext } from "../../lib/auth/redirect";
import { SIGNUP_EMAIL_COOKIE } from "../../lib/auth/signup";
import { TERMS_VERSION } from "../../lib/legal/texts";
import { createClient } from "../../lib/supabase/server";
import { profileLocale, rememberLocale } from "../../i18n/remember";

const MIN_PASSWORD = 8;
const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const secret = (form: FormData, name: string) => String(form.get(name) ?? "");

/** This app's address, for the links in sign-in emails. Supabase only accepts its allowed list. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}

function ensureEnabled() {
  if (!authEnabled()) notFound();
}

/** Step 1 of creating an account: an invite code and the email it is for (R-01.7). */
export async function claimInvite(form: FormData): Promise<void> {
  ensureEnabled();
  const email = text(form, "email").toLowerCase();
  // Creating an account means accepting the Terms of Use and the Privacy Notice (T-1202).
  if (form.get("terms") !== "accepted") redirect("/auth/sign-up?error=terms_required");
  const supabase = await createClient();
  const { data } = await supabase.rpc("claim_invite", {
    code: text(form, "code"),
    email,
    terms_version: TERMS_VERSION,
  });
  if (data !== "ok") redirect("/auth/sign-up?error=invite_invalid");
  const secure = (await origin()).startsWith("https://");
  (await cookies()).set(SIGNUP_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 30 * 60,
  });
  redirect("/auth/sign-up");
}

export async function startOver(): Promise<void> {
  (await cookies()).delete(SIGNUP_EMAIL_COOKIE);
  redirect("/auth/sign-up");
}

/** Step 2: a password for the claimed email. The sign-up hook checks the claim again. */
export async function signUp(form: FormData): Promise<void> {
  ensureEnabled();
  const store = await cookies();
  const email = store.get(SIGNUP_EMAIL_COOKIE)?.value;
  if (!email) redirect("/auth/sign-up");
  const password = secret(form, "password");
  if (password.length < MIN_PASSWORD) redirect("/auth/sign-up?error=weak_password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/`,
      data: { full_name: text(form, "name"), language: await getLocale() },
    },
  });
  // An email that already has an account gets the same answer, so nobody learns which emails exist.
  if (error) redirect(`/auth/sign-up?error=${authError(error)}`);
  store.delete(SIGNUP_EMAIL_COOKIE);
  redirect("/auth/sign-up?sent=1");
}

/** Without a code, a person leaves their email on the waitlist (R-01.8). */
export async function joinWaitlist(form: FormData): Promise<void> {
  ensureEnabled();
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_waitlist", {
    email: text(form, "email"),
    language: await getLocale(),
  });
  if (error) redirect("/auth/waitlist?error=email_invalid");
  redirect("/auth/waitlist?sent=1");
}

export async function signIn(form: FormData): Promise<void> {
  ensureEnabled();
  const next = safeNext(text(form, "next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(form, "email"),
    password: secret(form, "password"),
  });
  if (error) redirect(`/auth/sign-in?error=${authError(error)}&next=${encodeURIComponent(next)}`);
  // The profile's language follows the person to any browser (R-01.5).
  const { data } = await supabase.auth.getUser();
  const locale = data.user ? await profileLocale(supabase, data.user.id) : undefined;
  if (locale) await rememberLocale(locale);
  redirect(next);
}

export async function signOut(): Promise<void> {
  ensureEnabled();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(form: FormData): Promise<void> {
  ensureEnabled();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(text(form, "email"), {
    redirectTo: `${await origin()}/auth/callback?next=/auth/reset-password`,
  });
  // The same answer whether or not the email has an account; only a rate limit is reported.
  if (error && authError(error) === "rate_limited")
    redirect("/auth/forgot-password?error=rate_limited");
  redirect("/auth/forgot-password?sent=1");
}

export async function updatePassword(form: FormData): Promise<void> {
  ensureEnabled();
  const password = secret(form, "password");
  if (password.length < MIN_PASSWORD) redirect("/auth/reset-password?error=weak_password");
  if (password !== secret(form, "confirm")) redirect("/auth/reset-password?error=passwords_differ");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/auth/reset-password?error=${authError(error)}`);
  redirect("/?password=updated");
}

/** "Continue with Google, Microsoft or Apple": off to the provider, back through /auth/callback. */
export async function signInWithProvider(form: FormData): Promise<void> {
  ensureEnabled();
  const provider = text(form, "provider");
  const next = safeNext(text(form, "next"));
  if (!isProvider(provider)) redirect("/auth/sign-in?error=unknown");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      // Microsoft only shares the email when asked for it; ChartDown links accounts by email.
      ...(provider === "azure" ? { scopes: "email" } : {}),
    },
  });
  if (error || !data.url) redirect(`/auth/sign-in?error=${authError(error)}`);
  redirect(data.url);
}
