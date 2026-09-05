import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";

/**
 * ONE identity read for the whole portal.
 *
 * Every gate, badge and workspace used to fetch `user_roles` and `profiles`
 * for the signed-in user on its own — a single dashboard page fired ~20 of the
 * same requests, which is what made navigation drag. They all read from this
 * cached query instead.
 */
export type RoleRow = { role: string; department_slug: string | null };

export type Identity = {
  userId: string | null;
  email: string;
  roles: string[];
  roleRows: RoleRow[];
  branch: string | null;
  primaryDepartment: string | null;
  approvalStatus: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

const EMPTY: Identity = {
  userId: null,
  email: "",
  roles: [],
  roleRows: [],
  branch: null,
  primaryDepartment: null,
  approvalStatus: null,
  fullName: null,
  avatarUrl: null,
};

export const identityQueryOptions = {
  queryKey: ["identity"] as const,
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  queryFn: async (): Promise<Identity> => {
    const { data } = await getAuthUserResult();
    const uid = data.user?.id;
    if (!uid) return EMPTY;

    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role, department_slug").eq("user_id", uid),
      supabase
        .from("profiles")
        .select("branch, primary_department, approval_status, full_name, avatar_url, email")
        .eq("id", uid)
        .maybeSingle(),
    ]);

    const rows: RoleRow[] = (roleRows ?? []).map((r: any) => ({
      role: r.role as string,
      department_slug: (r.department_slug ?? null) as string | null,
    }));

    return {
      userId: uid,
      email: data.user?.email ?? (profile as any)?.email ?? "",
      roles: rows.map((r) => r.role),
      roleRows: rows,
      branch: (profile as any)?.branch ?? null,
      primaryDepartment: (profile as any)?.primary_department ?? null,
      approvalStatus: (profile as any)?.approval_status ?? null,
      fullName: (profile as any)?.full_name ?? null,
      avatarUrl: (profile as any)?.avatar_url ?? null,
    };
  },
};

export function useIdentity() {
  return useQuery<Identity>(identityQueryOptions);
}

export function getIdentity(queryClient: QueryClient) {
  return queryClient.ensureQueryData(identityQueryOptions);
}

export const ADMIN_ROLES = [
  "senior_apostle",
  "secretary",
  "chairperson",
  "lead_pastor",
  "associate_pastor",
];

export function hasAnyRole(identity: Identity | undefined, roles: string[]) {
  if (!identity) return false;
  return identity.roles.some((r) => roles.includes(r));
}
