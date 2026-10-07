"use client";

import { Icon } from "@astryxdesign/core/Icon";
import { ArrowsPointingOutIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

// Icons that server components put in Astryx buttons. An icon component is a function, which
// cannot travel from the server to the client, so these elements are made here, on the client.

export function EditIcon() {
  return <Icon icon={PencilSquareIcon} />;
}

export function StandIcon() {
  return <Icon icon={ArrowsPointingOutIcon} />;
}
