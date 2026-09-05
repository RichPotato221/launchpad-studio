import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { useIdentity, ADMIN_ROLES } from "@/lib/identity";
import { PortalShell } from "@/components/PortalShell";
import { Button } from "@/components/ui/button";
import logo from "@/assets/trog-logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await getAuthUserResult();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Gate,
});

function Gate() {
  // Cached for the whole session: the access check used to re-run (and block
  // the screen) on every remount of the portal shell.
  const identity = useIdentity();

  const state: "loading" | "ok" | "pending" | "rejected" = (() => {
    const id = identity.data;
    if (!id) return "loading";
    if (!id.userId) return "pending";
    if (id.roles.some((r) => ADMIN_ROLES.includes(r))) return "ok";
    if (!id.approvalStatus || id.approvalStatus === "pending") return "pending";
    if (id.approvalStatus === "rejected") return "rejected";
    return "ok";
  })();

  if (state === "loading") {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Checking access…</div>;
  }

  if (state === "pending" || state === "rejected") {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <img src={logo} alt="" className="mx-auto h-14 w-auto" />
          <h1 className="mt-6 font-serif text-3xl">
            {state === "pending" ? "Awaiting approval" : "Access not granted"}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {state === "pending"
              ? "Your account is still awaiting approval by the Admin team. You will be able to sign in once approved and attached to your department."
              : "Your request was not approved. Please contact the Admin team if you believe this is a mistake."}
          </p>
          <Button
            className="mt-6"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }
  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}
