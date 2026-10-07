import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { LayoutHeader } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { ReactNode } from "react";

/**
 * The header of an Administration page (Design Handoff 2.0 screens 11 to 14): the breadcrumb back
 * to the Overview (or its overline), the title, what the page is for, and its main action.
 */
export function AdminHeader({
  area,
  title,
  description,
  action,
  tabs,
}: {
  /** "Administration"; on a sub-page it links back to the Overview. */
  area: { label: string; isLink: boolean };
  title: string;
  description: string;
  action?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <LayoutHeader hasDivider={!tabs}>
      <VStack gap={4}>
        <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
          <VStack gap={1}>
            {area.isLink ? (
              <Breadcrumbs variant="supporting">
                <BreadcrumbItem href="/admin">{area.label}</BreadcrumbItem>
                <BreadcrumbItem>{title}</BreadcrumbItem>
              </Breadcrumbs>
            ) : (
              <Text type="supporting" color="secondary">
                {area.label}
              </Text>
            )}
            <Heading level={1}>{title}</Heading>
            <Text color="secondary">{description}</Text>
          </VStack>
          {action}
        </HStack>
        {tabs}
      </VStack>
    </LayoutHeader>
  );
}
