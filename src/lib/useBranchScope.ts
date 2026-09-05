import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";

/**
 * Branch visibility rule for the whole portal.
 *
 * Every member — Chairpersons, Associate / Lead Pastors and Secretaries
 * included — only sees activities, teams and records that belong to their
 * own branch. Only the Senior Pastors (senior_apostle) oversee every branch.
 */
const ALL_BRANCH_ROLES = new Set(["senior_apostle"]);

export type BranchScope = {
  branch: string | null;
  seesAllBranches: boolean;
};

export function useBranchScope() {
  return useQuery<BranchScope>({
    queryKey: ["branch-scope"],
    queryFn: async () => {
      const { data: userRes } = await getAuthUserResult();
      const uid = userRes.user?.id;
      if (!uid) return { branch: null, seesAllBranches: false };

      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("branch").eq("id", uid).maybeSingle(),
      ]);

      const seesAllBranches = (roles ?? []).some((r: any) => ALL_BRANCH_ROLES.has(r.role));
      return { branch: (profile as any)?.branch ?? null, seesAllBranches };
    },
  });
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
