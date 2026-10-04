"use server";

import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authEnabled } from "../../lib/auth/enabled";
import { authError } from "../../lib/auth/errors";
import { safeNext } from "../../lib/auth/redirect";
import { createClient } from "../../lib/supabase/server";

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

export async function signUp(form: FormData): Promise<void> {
  ensureEnabled();
  const password = secret(form, "password");
  if (password.length < MIN_PASSWORD) redirect("/auth/sign-up?error=weak_password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: text(form, "email"),
    password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/`,
      data: { full_name: text(form, "name"), language: await getLocale() },
    },
  });
  // An email that already has an account gets the same answer, so nobody learns which emails exist.
  if (error) redirect(`/auth/sign-up?error=${authError(error)}`);
  redirect("/auth/sign-up?sent=1");
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
