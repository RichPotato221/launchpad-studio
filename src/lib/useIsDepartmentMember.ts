import { useIdentity, ADMIN_ROLES } from "@/lib/identity";

/**
 * Returns whether the current signed-in user should see the extra
 * "Workspace" tab for a given department slug — true if they are an
 * approved member of that department OR an admin.
 */
export function useIsDepartmentMember(slug: string) {
  const identity = useIdentity();
  const id = identity.data;
  const data = id
    ? (() => {
        const isAdmin = id.roles.some((r) => ADMIN_ROLES.includes(r));
        const roleInDept = id.roleRows.some((r) => r.department_slug === slug);
        const primary = id.approvalStatus === "approved" && id.primaryDepartment === slug;
        return { isMember: isAdmin || roleInDept || primary, isAdmin, userId: id.userId };
      })()
    : undefined;
  return { ...identity, data } as typeof identity & {
    data: { isMember: boolean; isAdmin: boolean; userId: string | null } | undefined;
  };
}
