/** The kinds of set (Design Handoff 2.0: Rehearsal, Service and Concert; no "Practice"). */
export const SET_TYPES = ["rehearsal", "service", "concert"] as const;
export type SetType = (typeof SET_TYPES)[number];
