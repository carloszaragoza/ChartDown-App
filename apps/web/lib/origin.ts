import { headers } from "next/headers";

/** This app's address, as the request reached it: for links sent outside the app. */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * A message to send by WhatsApp (R-04.2, T-3029): the person picks the contact in WhatsApp, so no
 * phone number or email ever goes into the link, only the text written for it.
 */
export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
