import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REMOVAL_OFFICES = ["chairperson", "senior_apostle"];

/**
 * Remove a member from the portal.
 *
 * Chairpersons (and the Senior Pastor) may do this. Roles and notification
 * preferences are always cleared. The sign-in account and profile are deleted
 * outright when nothing in the church record depends on them; where the member
 * is referenced by minutes, finance or pastoral history the account is instead
 * revoked, so the historical record is never silently destroyed.
 */
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: myRoles } = await (context.supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = ((myRoles ?? []) as any[]).some((r) => REMOVAL_OFFICES.includes(String(r.role)));
    if (!allowed) throw new Error("Only Chairpersons and the Senior Pastor may remove members.");
    if (data.userId === context.userId) throw new Error("You cannot remove your own account.");

    const { getAdmin } = await import("@/lib/notifications/service.server");
    const admin = await getAdmin();

    const { data: target } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("That member no longer exists.");

    await admin.from("user_roles").delete().eq("user_id", data.userId);
    await admin.from("notification_preferences").delete().eq("user_id", data.userId);

    const del = await admin.auth.admin.deleteUser(data.userId);
    if (del?.error) {
      await admin.from("profiles").update({ approval_status: "rejected" }).eq("id", data.userId);
      return {
        deleted: false,
        name: target.full_name ?? target.email,
        note: "Access revoked. The record is kept because church history refers to this member.",
      };
    }

    await admin.from("profiles").delete().eq("id", data.userId);
    return { deleted: true, name: target.full_name ?? target.email, note: "" };
  });
