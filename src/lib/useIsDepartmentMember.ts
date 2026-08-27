import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";

/**
 * Returns whether the current signed-in user should see the extra
 * "Workspace" tab for a given department slug — true if they are an
 * approved member of that department OR an admin (chairperson,
 * secretary, senior_apostle).
 */
export function useIsDepartmentMember(slug: string) {
  return useQuery({
    queryKey: ["is-dept-member", slug],
    queryFn: async () => {
      const { data: userRes } = await getAuthUserResult();
      const uid = userRes.user?.id;
      if (!uid) return { isMember: false, isAdmin: false, userId: null as string | null };

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("primary_department, approval_status").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role, department_slug").eq("user_id", uid),
      ]);

      const isAdmin = (roles ?? []).some((r: any) =>
        ["senior_apostle", "secretary", "chairperson", "lead_pastor", "associate_pastor"].includes(r.role)
      );
      const roleInDept = (roles ?? []).some((r: any) => r.department_slug === slug);
      const primary =
        profile?.approval_status === "approved" && profile?.primary_department === slug;

      return { isMember: isAdmin || roleInDept || primary, isAdmin, userId: uid };
    },
  });
}
