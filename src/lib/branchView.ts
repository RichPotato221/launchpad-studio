import { useSyncExternalStore } from "react";

/**
 * Which branch a Senior Pastor is currently looking at.
 *
 * This is a *view* preference only — it can never widen access. The database
 * decides what each person may read or write; this simply lets Senior Pastors
 * (who legitimately see every branch) narrow the dashboard to one branch.
 */
export const BRANCH_LABELS: Record<string, string> = {
  etwatwa: "Etwatwa",
  joburg_north: "Joburg North",
  joburg_south: "Joburg South",
};

export const ALL_BRANCHES = "all" as const;

const KEY = "trogkc.branchView";
let current: string = typeof window !== "undefined" ? localStorage.getItem(KEY) || ALL_BRANCHES : ALL_BRANCHES;
const listeners = new Set<() => void>();

export function setBranchView(value: string) {
  current = value;
  if (typeof window !== "undefined") localStorage.setItem(KEY, value);
  listeners.forEach((l) => l());
}

export function useBranchView(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => ALL_BRANCHES,
  );
}

export function branchLabel(branch: string | null | undefined) {
  if (!branch) return "All Branches";
  return BRANCH_LABELS[branch] ?? branch;
}
