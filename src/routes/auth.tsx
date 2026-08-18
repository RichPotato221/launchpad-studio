import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { fetchDepartments } from "@/lib/portal";
import logo from "@/assets/trog-logo.png";
import { notifyPendingApproval } from "@/lib/notifyApproval.functions";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — TRoGKC Portal" },
      {
        name: "description",
        content: "Secure member sign-in for the Throne Room of God Kingdom Center leadership portal.",
      },
      { property: "og:title", content: "Sign in — TRoGKC Portal" },
      {
        property: "og:description",
        content: "Secure member sign-in for the Throne Room of God Kingdom Center leadership portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const BRANCHES = [
  { value: "etwatwa", label: "Etwatwa" },
  { value: "joburg_north", label: "Joburg North" },
  { value: "joburg_south", label: "Joburg South" },
] as const;

/** Only same-origin relative paths may be used as a post-sign-in destination. */
function safeNextPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState<string>("");
  const [deptSlug, setDeptSlug] = useState<string>("");
  const [requestedRole, setRequestedRole] = useState("");
  const [pendingMsg, setPendingMsg] = useState(false);
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  const goAfterAuth = () => {
    const next = safeNextPath();
    if (next) {
      window.location.replace(next);
      return;
    }
    navigate({ to: "/home", replace: true });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      const msg = /invalid.*credentials/i.test(error.message)
        ? "Email or password is incorrect. If you've forgotten your password, tap 'Forgot password?' below to reset it."
        : error.message;
      return toast.error(msg);
    }
    goAfterAuth();
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const next = safeNextPath();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? `${window.location.origin}${next}` : window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    setLoading(false);
    if (result.redirected) return;
    if (result.error) {
      const message = result.error instanceof Error ? result.error.message : String(result.error);
      return toast.error(message || "Google sign-in could not start.");
    }
    goAfterAuth();
  };


  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !deptSlug || !requestedRole.trim() || !fullName.trim()) {
      return toast.error("All fields are required.");
    }
    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          branch,
          department_slug: deptSlug,
          requested_role: requestedRole.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      const msg = /already registered|already exists|user.*exists/i.test(error.message)
        ? "This email is already registered. Try signing in, or use 'Forgot password?' to reset it."
        : error.message || "Sign up failed. Please try again.";
      return toast.error(msg);
    }
    // Notify admin (best effort — do not block user on failure)
    try {
      const deptLabel = depts.data?.find((d) => d.slug === deptSlug)?.name ?? deptSlug;
      const branchLabel = BRANCHES.find((b) => b.value === branch)?.label ?? branch;
      await notifyPendingApproval({
        data: {
          fullName,
          email: normalizedEmail,
          branch: branchLabel,
          department: deptLabel,
          role: requestedRole,
        },
      });
    } catch (err) {
      console.error("Approval notification failed", err);
    }
    // Immediately sign out so they wait for approval.
    await supabase.auth.signOut();
    setPendingMsg(true);
    toast.success("Account submitted for approval.");
  };

  if (pendingMsg) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <img src={logo} alt="" className="mx-auto h-14 w-auto" />
          <h1 className="mt-6 font-serif text-3xl">Awaiting approval</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Thank you for signing up. Your account request has been sent to the Admin team for
            approval. You will be able to sign in once you have been approved and added to your
            department.
          </p>
          <Button className="mt-6" onClick={() => setPendingMsg(false)}>Back to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div
        className="hidden flex-col justify-between p-12 text-background md:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url(/images/landing/marching-orders-2026-banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-3">
          <img src="/images/landing/logo-flame-emblem.jpg" alt="" className="h-10 w-10 rounded object-cover" />
          <div className="font-serif text-lg leading-tight">
            Throne Room of God
            <span className="block text-[0.65rem] uppercase tracking-[0.22em] opacity-70">Kingdom Center</span>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] opacity-70">Leadership &amp; Serving-Members Portal</p>
        </div>

        <p className="text-xs opacity-60">© {new Date().getFullYear()} TRoGKC · Under the headship of Jesus Christ</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <img src={logo} alt="" className="h-10 w-auto" />
          </div>
          <h2 className="font-serif text-3xl">Sign in to the portal</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use the credentials issued after your approval.</p>

          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    className="text-xs text-primary underline"
                    onClick={async () => {
                      const target = email.trim().toLowerCase();
                      if (!target) return toast.error("Enter your email first.");
                      const { error } = await supabase.auth.resetPasswordForEmail(target, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) return toast.error(error.message);
                      toast.success("Password reset link sent — check your email.");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <div className="relative py-1 text-center text-xs uppercase tracking-widest text-muted-foreground">
                  <span className="bg-background px-2">or</span>
                </div>
                <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={signInWithGoogle}>
                  Continue with Google
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name *</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password *</Label>
                  <Input id="signup-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Branch *</Label>
                  <Select value={branch} onValueChange={setBranch} required>
                    <SelectTrigger><SelectValue placeholder="Select your branch" /></SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department you serve in *</Label>
                  <Select value={deptSlug} onValueChange={setDeptSlug} required>
                    <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {[...(depts.data ?? [])]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((d) => (
                          <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Your role in that department *</Label>
                  <Input id="role" required placeholder="e.g. Media Lead, Usher, Sound Technician"
                    value={requestedRole} onChange={(e) => setRequestedRole(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Submitting…" : "Submit for approval"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your details are sent to the Admin for approval. You cannot sign in until approved.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
