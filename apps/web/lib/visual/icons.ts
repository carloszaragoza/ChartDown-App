// The visual editor's icons (SPEC-13, R-13.16): one list, one icon per action, so each action is
// known by its picture as well as its name. Marks of the chart use the notation icons of
// @chartdown/ui, drawn as the chart draws them; the rest, ChartDown's own editor icons, drawn the
// same way (owner's decision, October 27, 2026: never generic ones).
import { editorIcon, notationIcon } from "@chartdown/ui";

export const VISUAL_ICONS = {
  // The editor
  undo: editorIcon("undo"),
  redo: editorIcon("redo"),
  details: editorIcon("details"),
  import: editorIcon("import"),
  addAudio: editorIcon("audio"),
  openText: editorIcon("text"),
  done: editorIcon("done"),
  save: editorIcon("save"),
  // Sections
  addSection: editorIcon("addSection"),
  addRow: editorIcon("addRow"),
  rename: editorIcon("rename"),
  addNote: editorIcon("addNote"),
  repeatSection: editorIcon("repeatSection"),
  duplicate: editorIcon("duplicate"),
  moveUp: editorIcon("moveUp"),
  moveDown: editorIcon("moveDown"),
  editOriginal: editorIcon("editOriginal"),
  deleteSection: editorIcon("delete"),
  deleteNote: editorIcon("deleteNote"),
  // Bars
  insertBefore: editorIcon("insertBefore"),
  insertAfter: editorIcon("insertAfter"),
  newRow: editorIcon("newRow"),
  deleteBar: editorIcon("delete"),
  deleteRow: editorIcon("deleteRow"),
  rowChange: editorIcon("rowChange"),
  holdUntil: editorIcon("holdUntil"),
  copyBar: editorIcon("copyBar"),
  copyRow: editorIcon("copyRow"),
  paste: editorIcon("paste"),
  pasteAfter: editorIcon("pasteAfter"),
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
