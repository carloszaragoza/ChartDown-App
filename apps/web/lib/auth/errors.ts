/** The sign-in errors the interface explains; everything else is "unknown". */
export const AUTH_ERRORS = [
  "invalid_credentials",
  "email_not_confirmed",
  "weak_password",
  "passwords_differ",
  "rate_limited",
  "link_invalid",
  "invite_invalid",
  "invite_required",
  "email_invalid",
  "terms_required",
  "unknown",
] as const;
export type AuthError = (typeof AUTH_ERRORS)[number];

/** Maps a Supabase Auth error to one the interface explains. */
export function authError(
  error: {
    code?: string | undefined;
    status?: number | undefined;
    message?: string | undefined;
  } | null,
): AuthError {
  // The sign-up hook refuses a new account without an invite (T-402).
  if (error?.message?.includes("invite_required")) return "invite_required";
  switch (error?.code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "weak_password":
      return "weak_password";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rate_limited";
    case "otp_expired":
    case "bad_code_verifier":
    case "flow_state_not_found":
    case "flow_state_expired":
      return "link_invalid";
    default:
      return error?.status === 429 ? "rate_limited" : "unknown";
  }
}

export function isAuthError(value: unknown): value is AuthError {
  return typeof value === "string" && (AUTH_ERRORS as readonly string[]).includes(value);
}
