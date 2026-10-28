"use client";

import { editorIcon } from "@chartdown/ui";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const VisualIcon = editorIcon("visual");
const TextIcon = editorIcon("text");

/**
 * Edit on a version's page for an administrator, who has both editors (R-13.1): the visual editor
 * or the Chart editor, where the text is written.
 */
export function EditChoice({ id, icon, size }: { id: string; icon: ReactNode; size: "md" | "lg" }) {
  const t = useTranslations("version");
  const router = useRouter();
  return (
    <DropdownMenu
      button={{ label: t("edit"), icon, size }}
      presentation="adaptive"
      items={[
        {
          label: t("editVisual"),
          icon: <Icon icon={VisualIcon} />,
          onClick: () => router.push(`/versions/${id}/visual`),
        },
        {
          label: t("editText"),
          icon: <Icon icon={TextIcon} />,
          onClick: () => router.push(`/versions/${id}/edit`),
        },
      ]}
    />
  );
}
