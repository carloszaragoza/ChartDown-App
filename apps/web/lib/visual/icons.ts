// The visual editor's icons (SPEC-13, R-13.16): one list, one icon per action, so each action is
// known by its picture as well as its name. Marks of the chart use the notation icons of
// @chartdown/ui, drawn as the chart draws them; the rest, the interface's Heroicons.
import { notationIcon } from "@chartdown/ui";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownIcon,
  ArrowLongLeftIcon,
  ArrowLongRightIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTurnDownLeftIcon,
  ArrowUpTrayIcon,
  ArrowUpIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3BottomLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  CloudArrowUpIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  RectangleStackIcon,
  SpeakerWaveIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export const VISUAL_ICONS = {
  // The editor
  undo: ArrowUturnLeftIcon,
  redo: ArrowUturnRightIcon,
  details: AdjustmentsHorizontalIcon,
  import: ArrowUpTrayIcon,
  addAudio: SpeakerWaveIcon,
  openText: CodeBracketIcon,
  done: CheckIcon,
  save: CloudArrowUpIcon,
  // Sections
  addSection: RectangleStackIcon,
  addRow: Bars3BottomLeftIcon,
  rename: PencilSquareIcon,
  addNote: ChatBubbleBottomCenterTextIcon,
  repeatSection: ArrowPathIcon,
  duplicate: DocumentDuplicateIcon,
  moveUp: ArrowUpIcon,
  moveDown: ArrowDownIcon,
  editOriginal: ArrowTopRightOnSquareIcon,
  deleteSection: TrashIcon,
  deleteNote: TrashIcon,
  // Bars
  insertBefore: ArrowLongLeftIcon,
  insertAfter: ArrowLongRightIcon,
  newRow: ArrowTurnDownLeftIcon,
  deleteBar: TrashIcon,
  deleteRow: TrashIcon,
  // The chord's marks
  push: notationIcon("push"),
  shortPush: notationIcon("shortPush"),
  stab: notationIcon("stab"),
  fermata: notationIcon("fermata"),
  hold: notationIcon("hold"),
  // The bar's marks
  repeatStart: notationIcon("repeatStart"),
  repeatEnd: notationIcon("repeatEnd"),
  ending1: notationIcon("ending1"),
  ending2: notationIcon("ending2"),
  pickup: notationIcon("pickup"),
  rest: notationIcon("rest"),
  repeatBar: notationIcon("repeatBar"),
  // Navigation
  Segno: notationIcon("segno"),
  Coda: notationIcon("coda"),
  "To Coda": notationIcon("toCoda"),
  "D.S. al Coda": notationIcon("dsAlCoda"),
  "D.C. al Fine": notationIcon("dcAlFine"),
  Fine: notationIcon("fine"),
  // Dynamics
  pp: notationIcon("pp"),
  p: notationIcon("p"),
  mp: notationIcon("mp"),
  mf: notationIcon("mf"),
  f: notationIcon("f"),
  ff: notationIcon("ff"),
  "cresc.": notationIcon("cresc"),
  "decresc.": notationIcon("decresc"),
} as const;

export type VisualAction = keyof typeof VISUAL_ICONS;
