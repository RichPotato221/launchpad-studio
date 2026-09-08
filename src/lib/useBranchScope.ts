import { useIdentity } from "@/lib/identity";
import { ALL_BRANCHES, useBranchView } from "@/lib/branchView";

/**
 * Branch visibility rule for the whole portal.
 *
 * Every member — Chairpersons, Associate / Lead Pastors and Secretaries
 * included — only sees activities, teams and records that belong to their
 * own branch. Only the Senior Pastors (senior_apostle) oversee every branch.
 */
const ALL_BRANCH_ROLES = ["senior_apostle"];

export type BranchScope = {
  branch: string | null;
  seesAllBranches: boolean;
};

export function useBranchScope() {
  const identity = useIdentity();
  const view = useBranchView();
  const data: BranchScope | undefined = identity.data
    ? (() => {
        const seesAll = identity.data.roles.some((r) => ALL_BRANCH_ROLES.includes(r));
        // A Senior Pastor may narrow the dashboard to one branch. Everyone else
        // is pinned to their own branch — the view preference is ignored.
        if (seesAll && view !== ALL_BRANCHES) {
          return { branch: view, seesAllBranches: false };
        }
        return { branch: identity.data.branch, seesAllBranches: seesAll };
      })()
    : undefined;
  return { ...identity, data } as typeof identity & { data: BranchScope | undefined };
}

/**
 * Keeps rows that belong to the viewer's branch. Rows with no branch are
 * church-wide and stay visible to everyone.
 */
export function filterByBranch<T extends { branch?: string | null }>(
  rows: T[],
  scope: BranchScope | undefined,
): T[] {
  if (!scope || scope.seesAllBranches) return rows;
  if (!scope.branch) return rows.filter((r) => !r.branch);
  return rows.filter((r) => !r.branch || r.branch === scope.branch);
}
