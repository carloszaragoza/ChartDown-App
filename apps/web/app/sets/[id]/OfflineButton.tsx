"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { downloadSet, READER, storedSet } from "../../../lib/offline/store";

/**
 * “Download for offline” on the set screen (R-08.1, T-902; Design Handoff 2.0 screen 02): keeps
 * the set's bundle and its reader on this device, then says it is ready offline and opens it
 * with no internet.
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
    <HStack gap={2} vAlign="center" wrap="wrap">
      {state === "kept" && (
        <>
          <HStack gap={1} vAlign="center">
            <StatusDot variant="success" label={t("downloaded")} />
            <Text type="supporting" role="status">
              {t("downloaded")}
            </Text>
          </HStack>
          {/* A plain link: the reader also opens with no internet, from this device. */}
          <Button label={t("openOffline")} href={`${READER}/${setId}`} />
        </>
      )}
      <Button
        label={state === "kept" ? t("downloadAgain") : t("download")}
        icon={<Icon icon={ArrowDownTrayIcon} />}
        onClick={download}
        isLoading={state === "busy"}
      />
      {state === "failed" && (
        <Text type="supporting" role="alert">
          {t("downloadFailed")}
        </Text>
      )}
    </HStack>
  );
}
