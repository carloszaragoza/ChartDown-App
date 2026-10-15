"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { ReactNode } from "react";
import { usePhone } from "../../lib/shell/phone";

/**
 * A list row with several actions (R-03.9): the actions at its end on an iPad or a desktop; on a
 * phone the title and its details keep the full width, and the actions wrap under them.
 */
export function ActionRow({
  label,
  description,
  startContent,
  actions,
  phone = false,
}: {
  label: string;
  /** Shown before the title, such as a version's source. */
  startContent?: ReactNode;
  description?: string | undefined;
  actions: ReactNode;
  /** The server's guess that the page opens on a phone. */
  phone?: boolean;
}) {
  const isPhone = usePhone(phone);
  if (!isPhone)
    return (
      <Item
        as="li"
        label={label}
        {...(description ? { description } : {})}
        {...(startContent ? { startContent } : {})}
        endContent={
          <HStack gap={2} vAlign="center">
            {actions}
          </HStack>
        }
      />
    );
  return (
    <Item
      as="li"
      label={label}
      {...(startContent ? { startContent } : {})}
      description={
        <VStack gap={2}>
          {description && <Text type="supporting">{description}</Text>}
          <HStack gap={2} vAlign="center" wrap="wrap">
            {actions}
          </HStack>
        </VStack>
      }
    />
  );
}
