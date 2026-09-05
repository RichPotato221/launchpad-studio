import { useIdentity } from "@/lib/identity";

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
  const data: BranchScope | undefined = identity.data
    ? {
        branch: identity.data.branch,
        seesAllBranches: identity.data.roles.some((r) => ALL_BRANCH_ROLES.includes(r)),
      }
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
