import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CurrentRoleInfo = {
  userId: string | null;
  roles: string[];
  branch: string | null;
  canPostCrossBranch: boolean;
  isSeniorApostle: boolean;
  canViewCheckupWatch: boolean;
  canSeeDeclineReasons: boolean;
};

const CROSS_BRANCH = new Set([
  "senior_apostle",
  "chairperson",
  "lead_pastor",
  "secretary",
  "associate_pastor",
  "strategic_adviser",
]);

const ADMIN_LIKE = new Set([
  "senior_apostle",
  "chairperson",
  "lead_pastor",
  "secretary",
  "associate_pastor",
]);

export function useCurrentRole() {
  return useQuery<CurrentRoleInfo>({
    queryKey: ["current-role"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      if (!uid) {
        return {
          userId: null,
          roles: [],
          branch: null,
          canPostCrossBranch: false,
          isSeniorApostle: false,
          canViewCheckupWatch: false,
          canSeeDeclineReasons: false,
        };
      }
      const [{ data: roles }, { data: profile }, { data: hospDept }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("branch, primary_department").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("department_slug").eq("user_id", uid).eq("department_slug", "hospitality"),
      ]);
      const roleNames = (roles ?? []).map((r: any) => r.role as string);
      const isHospitality =
        profile?.primary_department === "hospitality" || (hospDept ?? []).length > 0;
      return {
        userId: uid,
        roles: roleNames,
        branch: (profile as any)?.branch ?? null,
        canPostCrossBranch: roleNames.some((r) => CROSS_BRANCH.has(r)),
        isSeniorApostle: roleNames.includes("senior_apostle"),
        canViewCheckupWatch:
          isHospitality ||
          roleNames.some((r) =>
            ["senior_apostle", "chairperson", "lead_pastor", "associate_pastor"].includes(r),
          ),
        canSeeDeclineReasons: roleNames.some((r) => ADMIN_LIKE.has(r)),
      };
    },
  });
}
