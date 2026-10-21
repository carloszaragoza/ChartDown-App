"use client";

import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Item } from "@astryxdesign/core/Item";
import { List } from "@astryxdesign/core/List";
import { StackItem } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { SignalIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useLive } from "./LiveProvider";

/**
 * Live mode's line in a set's stand mode (T-1603, T-1604, T-1606): for the leader, who is
 * connected and the live options; for a musician, "Live now" with Join, then who they follow,
 * the cue, Back to live, and a lost connection. Nothing when there is no session.
 */
export function LiveStrip({ sections }: { sections: readonly string[] }) {
  const t = useTranslations("live");
  const live = useLive();
  const [isOpen, setOpen] = useState(false);
  if (!live) return null;
  const { session, role, isJoined, status, isDetached, hasEnded, cue, connected } = live;
  const cueName = cue !== null ? sections[cue] : undefined;
  const next = cueName ? t("next", { section: cueName }) : null;

  if (hasEnded && !session)
    return (
      <HStack gap={2} vAlign="center" wrap="wrap" role="status">
        <Token label={t("live")} size="sm" />
        <StackItem size="fill">
          <Text>{t("ended")}</Text>
        </StackItem>
        <Button label={t("dismiss")} variant="ghost" size="sm" onClick={live.dismissEnded} />
      </HStack>
    );
  if (!session) return null;

  if (role === "leader") {
    const others = connected.filter((person) => person.id !== live.me);
    return (
      <>
        <HStack gap={2} vAlign="center" wrap="wrap" role="status">
          <Token label={t("live")} size="sm" color="red" />
          <StackItem size="fill">
            <Text>
              {[t("leading", { count: others.length }), next].filter(Boolean).join(" · ")}
            </Text>
          </StackItem>
          {status === "paused" && <Text type="supporting">{t("reconnecting")}</Text>}
          <Button
            label={t("options")}
            variant="secondary"
            icon={<Icon icon={SignalIcon} />}
            onClick={() => setOpen(true)}
          />
        </HStack>
        <BottomSheet isOpen={isOpen} onOpenChange={setOpen} label={t("options")} height="hug">
          <VStack gap={4} padding={4}>
            <Heading level={2}>{t("options")}</Heading>
            {/* The next section, marked ahead so the band sees it coming (R-12.4). */}
            <VStack gap={2}>
              <Text type="label">{t("cue")}</Text>
              <HStack gap={2} wrap="wrap">
                {sections.map((name, index) => (
                  <Button
                    key={index}
                    // The cued one says so in words too, not only by its fill.
                    label={cue === index ? t("cued", { section: name }) : name}
                    variant={cue === index ? "primary" : "secondary"}
                    onClick={() => live.setCue(cue === index ? null : index)}
                  >
                    {name}
                  </Button>
                ))}
              </HStack>
              <Text type="supporting">{t("cueHint")}</Text>
            </VStack>
            {/* Who is connected, and handing over (R-12.2, R-12.11). */}
            <VStack gap={2}>
              <Text type="label">{t("connected", { count: others.length })}</Text>
              {others.length === 0 ? (
                <Text type="supporting">{t("nobodyYet")}</Text>
              ) : (
                <List hasDividers edgeCompensation="inline">
                  {others.map((person) => (
                    <Item
                      key={person.id}
                      as="li"
                      label={person.name}
                      endContent={
                        <Button
                          label={t("handOver", { name: person.name })}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOpen(false);
                            void live.handOver(person.id);
                          }}
                        >
                          {t("handOverShort")}
                        </Button>
                      }
                    />
                  ))}
                </List>
              )}
            </VStack>
            <HStack gap={2} hAlign="end">
              <Button
                label={t("end")}
                variant="destructive"
                onClick={() => {
                  setOpen(false);
                  void live.end();
                }}
              />
            </HStack>
          </VStack>
        </BottomSheet>
      </>
    );
  }

  if (!isJoined)
    return (
      <HStack gap={2} vAlign="center" wrap="wrap" role="status">
        <Token label={t("liveNow")} size="sm" color="red" />
        <StackItem size="fill">
          <Text>{t("isLeading", { name: session.leaderName })}</Text>
        </StackItem>
        <Button label={t("join")} variant="primary" onClick={live.join} />
      </HStack>
    );

  return (
    <HStack gap={2} vAlign="center" wrap="wrap" role="status">
      <Token label={t("live")} size="sm" color="red" />
      {status === "paused" ? (
        <>
          <StatusDot variant="warning" label={t("paused")} />
          <StackItem size="fill">
            <Text>{t("paused")}</Text>
          </StackItem>
        </>
      ) : (
        <StackItem size="fill">
          <Text>
            {[t("following", { name: session.leaderName }), next].filter(Boolean).join(" · ")}
          </Text>
        </StackItem>
      )}
      {isDetached && <Button label={t("backToLive")} variant="primary" onClick={live.backToLive} />}
    </HStack>
  );
}

/** In View: the MD starts live mode for the set (R-12.1). */
export function GoLive() {
  const t = useTranslations("live");
  const live = useLive();
  const [isStarting, setStarting] = useState(false);
  if (!live || !live.canLead || live.session) return null;
  return (
    <VStack gap={1}>
      <Text type="label">{t("title")}</Text>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Button
          label={t("start")}
          variant="secondary"
          icon={<Icon icon={SignalIcon} />}
          isLoading={isStarting}
          onClick={() => {
            setStarting(true);
            void live.start().finally(() => setStarting(false));
          }}
        />
      </HStack>
      <Text type="supporting">
        {live.error === "already" ? t("already") : live.error ? t("failed") : t("startHint")}
      </Text>
    </VStack>
  );
}
