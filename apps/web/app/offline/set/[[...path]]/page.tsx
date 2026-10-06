import { OfflineReader } from "./OfflineReader";

/**
 * The reader of sets downloaded to this device (R-08.2, T-902). The page is only a shell: it
 * draws itself in the browser from the stored bundle, so it opens with no internet, when the
 * service worker serves it from the device.
 */
export default function OfflineSetPage() {
  return <OfflineReader />;
}
