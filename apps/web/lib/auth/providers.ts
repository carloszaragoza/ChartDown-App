/** The sign-in providers ChartDown offers (Technical Plan 12.1), in the order they appear. */
export const PROVIDERS = ["google", "azure", "apple"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** Provider names are brands: the same in every language. */
export const PROVIDER_NAMES: Record<Provider, string> = {
  google: "Google",
  azure: "Microsoft",
  apple: "Apple",
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

/** The providers turned on in Supabase's public settings (`/auth/v1/settings`). */
export function providersFromSettings(settings: unknown): Provider[] {
  const external = (settings as { external?: Record<string, unknown> } | null)?.external ?? {};
  return PROVIDERS.filter((provider) => external[provider] === true);
}

/** Reads which providers this Supabase project has enabled; none if it can't be reached. */
export async function enabledProviders(): Promise<Provider[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 300 },
    });
    return response.ok ? providersFromSettings(await response.json()) : [];
  } catch {
    return [];
  }
}
