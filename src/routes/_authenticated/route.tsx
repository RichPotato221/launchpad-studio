import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/PortalShell";
import { Button } from "@/components/ui/button";
import logo from "@/assets/trog-logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Gate,
});

function Gate() {
  const [state, setState] = useState<"loading" | "ok" | "pending" | "rejected">("loading");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setState("pending");
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("approval_status").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const isAdmin = (roles ?? []).some((r) =>
        ["senior_apostle", "secretary", "chairperson"].includes(r.role),
      );
      if (isAdmin) return setState("ok");
      if (!profile || profile.approval_status === "pending") return setState("pending");
      if (profile.approval_status === "rejected") return setState("rejected");
      setState("ok");
    })();
  }, []);

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
