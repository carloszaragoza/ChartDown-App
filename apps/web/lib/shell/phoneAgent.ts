/**
 * A phone, as the design handoff's section 5 says (R-03.8): narrower than 600 CSS pixels, or
 * shorter than 500 in landscape. The chart's own rows wrap at the same width (chart.css).
 */
export const PHONE_QUERY = "(max-width: 599px), (max-height: 499px)";

/** Whether a browser says it is a phone, so the server draws the phone layout from the start. */
export function isPhoneAgent(userAgent: string | null | undefined): boolean {
  return /\biPhone\b|\biPod\b|\bAndroid\b.*\bMobile\b|\bMobile\b.*\bFirefox\b/.test(
    userAgent ?? "",
  );
}
