import { useIdentity } from "@/lib/identity";

/**
 * Gates pages meant only for church-wide leadership oversight
 * (the Senior Pastor Cockpit and the Governance workspace).
 */
export function useLeadershipAccess() {
  const identity = useIdentity();
  const id = identity.data;
  const data = id
    ? (() => {
        const roleNames = id.roles;
        const isSeniorApostle = roleNames.includes("senior_apostle");
        const hasAccess =
          isSeniorApostle ||
          roleNames.includes("chairperson") ||
          roleNames.includes("secretary") ||
          roleNames.includes("lead_pastor") ||
          roleNames.includes("associate_pastor");
        return { hasAccess, isSeniorApostle, userId: id.userId };
      })()
    : undefined;
  return { ...identity, data } as typeof identity & {
    data: { hasAccess: boolean; isSeniorApostle: boolean; userId: string | null } | undefined;
  };
}
