"use client";

import { Button, Icon } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { downloadSet, READER, storedSet } from "../../../lib/offline/store";
import styles from "../sets.module.css";

/**
 * “Download for offline” on the set screen (R-08.1, T-902): keeps the set's bundle and its
 * reader on this device, then says it is downloaded and opens it with no internet.
 */
export function OfflineButton({ setId }: { setId: string }) {
  const t = useTranslations("offline");
  const [state, setState] = useState<"checking" | "none" | "busy" | "kept" | "failed">("checking");

  useEffect(() => {
    let live = true;
    storedSet(setId).then((bundle) => {
      if (live) setState(bundle ? "kept" : "none");
    });
    return () => {
      live = false;
    };
  }, [setId]);

  if (state === "checking") return null;
  const download = async () => {
    setState("busy");
    setState((await downloadSet(setId)) ? "kept" : "failed");
  };
  return (
    <div className={styles.offline}>
      {state === "kept" && (
        <>
          <span className={styles.offlineMark} role="status">
            <Icon name="check" size={18} />
            {t("downloaded")}
          </span>
          {/* A plain link: the reader also opens with no internet, from this device. */}
          <a href={`${READER}/${setId}`} className="cd-button cd-button--secondary">
            {t("openOffline")}
          </a>
        </>
      )}
      <Button
        type="button"
        icon="download"
        onClick={download}
        {...(state === "busy" ? { disabledReason: t("downloading") } : {})}
      >
        {state === "kept" ? t("downloadAgain") : t("download")}
      </Button>
      {state === "failed" && (
        <span role="alert" className={styles.alert}>
          {t("downloadFailed")}
        </span>
      )}
    </div>
  );
}
