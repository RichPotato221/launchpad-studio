import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — TRoGKC Portal" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase-js parses the recovery hash automatically on page load; confirm we have a session.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    await supabase.auth.signOut();
    toast.success("Password updated. Please sign in.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md">
        <h1 className="font-serif text-3xl">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your new password below to complete the reset.
        </p>
        {!ready && (
          <p className="mt-4 rounded-md bg-muted p-4 text-sm text-muted-foreground">
            Verifying your reset link… If this stays here for more than a few seconds, the link may
            have expired. Request a new one from the sign-in page.
          </p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !ready}>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
