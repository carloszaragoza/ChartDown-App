"use client";

import { Icon } from "@astryxdesign/core/Icon";
import {
  ArrowsPointingOutIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

// Icons that server components put in Astryx buttons. An icon component is a function, which
// cannot travel from the server to the client, so these elements are made here, on the client.

export function EditIcon() {
  return <Icon icon={PencilSquareIcon} />;
}

export function StandIcon() {
  return <Icon icon={ArrowsPointingOutIcon} />;
}

export function ForkIcon() {
  return <Icon icon={DocumentDuplicateIcon} />;
}

export function AddIcon() {
  return <Icon icon={PlusIcon} />;
}

export function PublicIcon() {
  return <Icon icon={GlobeAltIcon} size="sm" color="secondary" />;
}
