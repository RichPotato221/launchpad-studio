import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";

/**
 * Gates pages meant only for church-wide leadership oversight
 * (the Senior Pastor Cockpit and the Governance workspace).
 *
 * Per the Governance Manual: governance-level reports and final
 * approvals are received by the Senior Apostle and the Chairperson
 * of the Apostolic Council; the Church Secretary supports both.
 */
export function useLeadershipAccess() {
  return useQuery({
    queryKey: ["leadership-access"],
    queryFn: async () => {
      const { data: userRes } = await getAuthUserResult();
      const uid = userRes.user?.id;
      if (!uid) return { hasAccess: false, isSeniorApostle: false, userId: null as string | null };

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roleNames = (roles ?? []).map((r: any) => r.role);
      const isSeniorApostle = roleNames.includes("senior_apostle");
      const hasAccess =
        isSeniorApostle ||
        roleNames.includes("chairperson") ||
        roleNames.includes("secretary") ||
        roleNames.includes("lead_pastor") ||
        roleNames.includes("associate_pastor");

      return { hasAccess, isSeniorApostle, userId: uid };
    },
  });
}
