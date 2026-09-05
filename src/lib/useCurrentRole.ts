import { useIdentity } from "@/lib/identity";

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
  const identity = useIdentity();
  const id = identity.data;
  const data: CurrentRoleInfo | undefined = id
    ? (() => {
        const roleNames = id.roles;
        const isHospitality =
          id.primaryDepartment === "hospitality" ||
          id.roleRows.some((r) => r.department_slug === "hospitality");
        return {
          userId: id.userId,
          roles: roleNames,
          branch: id.branch,
          canPostCrossBranch: roleNames.some((r) => CROSS_BRANCH.has(r)),
          isSeniorApostle: roleNames.includes("senior_apostle"),
          canViewCheckupWatch:
            isHospitality ||
            roleNames.some((r) =>
              ["senior_apostle", "chairperson", "lead_pastor", "associate_pastor"].includes(r),
            ),
          canSeeDeclineReasons: roleNames.some((r) => ADMIN_LIKE.has(r)),
        };
      })()
    : undefined;
  return { ...identity, data } as typeof identity & { data: CurrentRoleInfo | undefined };
}
