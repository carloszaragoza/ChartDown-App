"use client";

import { Icon } from "@astryxdesign/core/Icon";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  NoSymbolIcon,
  EnvelopeIcon,
  FlagIcon,
  MusicalNoteIcon,
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

export function RevisionIcon() {
  return <Icon icon={ArrowPathIcon} color="secondary" />;
}

export function InviteIcon() {
  return <Icon icon={EnvelopeIcon} color="secondary" />;
}

export function ReportIcon() {
  return <Icon icon={FlagIcon} color="secondary" />;
}

export function NoteIcon() {
  return <Icon icon={ChatBubbleLeftRightIcon} color="secondary" />;
}

export function GoIcon() {
  return <Icon icon={ArrowRightIcon} size="sm" color="secondary" />;
}

export function VersionIcon() {
  return <Icon icon={MusicalNoteIcon} />;
}

export function GuideIcon() {
  return <Icon icon={BookOpenIcon} />;
}

export function InviteCodeIcon() {
  return <Icon icon={KeyIcon} color="secondary" />;
}

export function InstrumentsIcon() {
  return <Icon icon={MusicalNoteIcon} color="secondary" />;
}

export function DeactivateIcon() {
  return <Icon icon={NoSymbolIcon} />;
}

export function ReactivateIcon() {
  return <Icon icon={CheckCircleIcon} />;
}

export function CopyIcon() {
  return <Icon icon={ClipboardDocumentIcon} />;
}

export function HideIcon() {
  return <Icon icon={EyeSlashIcon} />;
}

export function ShowIcon() {
  return <Icon icon={EyeIcon} />;
}
