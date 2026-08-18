import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDepartments, ROLE_LABELS, type AppRole } from "@/lib/portal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
 
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — TRoGKC Portal" }] }),
  component: AdminPage,
});
 
const ROLES: AppRole[] = [
  "senior_apostle", "chairperson", "secretary", "lead_pastor",
  "associate_pastor", "department_chair", "team_member",
];
 
function AdminPage() {
  const qc = useQueryClient();
  const access = useQuery({
    queryKey: ["is-chairperson"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return { isChair: false, userId: null as string | null };
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      // Senior Pastors oversee every branch and department alongside the Chairpersons.
      return {
        isChair: (roles ?? []).some((r: any) => r.role === "chairperson" || r.role === "senior_apostle"),
        userId: uid,
      };
    },
  });
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const profiles = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const [{ data: ps }, { data: rs }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("*"),
      ]);
      return (ps ?? []).map((p) => ({ ...p, roles: (rs ?? []).filter((r) => r.user_id === p.id) }));
    },
  });
  const theme = useQuery({
    queryKey: ["setting", "theme_of_year"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("key", "theme_of_year").maybeSingle()).data,
  });
  const apostle = useQuery({
    queryKey: ["setting", "senior_apostle"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("key", "senior_apostle").maybeSingle()).data,
  });
 
  const themeV = (theme.data?.value ?? {}) as any;
  const apostleV = (apostle.data?.value ?? {}) as any;
  const [themeForm, setThemeForm] = useState({ year: "", title: "", description: "" });
  const [apostleForm, setApostleForm] = useState({ name: "", bio: "", photo_url: "" });
 
  const saveTheme = async () => {
    const val = {
      year: Number(themeForm.year || themeV.year || 0),
      title: themeForm.title || themeV.title,
      description: themeForm.description || themeV.description,
    };
    const { error } = await supabase.from("settings").upsert({ key: "theme_of_year", value: val });
    if (error) return toast.error(error.message);
    toast.success("Theme saved");
    qc.invalidateQueries({ queryKey: ["setting"] });
  };
  const saveApostle = async () => {
    const val = {
      name: apostleForm.name || apostleV.name,
      bio: apostleForm.bio || apostleV.bio,
      photo_url: apostleForm.photo_url || apostleV.photo_url,
    };
    const { error } = await supabase.from("settings").upsert({ key: "senior_apostle", value: val });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["setting"] });
  };
 
  const assignRole = async (userId: string, role: AppRole, department_slug: string | null, existing: any[]) => {
    // Guard against the duplicate chips we were seeing: same role + same department.
    if (existing.some((r) => r.role === role && (r.department_slug ?? null) === department_slug)) {
      return toast.error("That role is already assigned for this department.");
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role, department_slug });
    if (error) return toast.error(error.message);

    /**
     * An assignment must give the member the *actual* access of that office.
     * Two things follow every grant:
     *  1. Attaching a member to an office department (Chairperson, Secretary,
     *     Lead / Associate Pastor, Strategic Adviser) grants the matching
     *     church role, so navigation and permissions match the office.
     *  2. The department they are assigned to becomes their primary department
     *     so their workspaces, KPIs and team views resolve to it.
     */
    const officeRole = department_slug ? OFFICE_ROLES[department_slug] : undefined;
    if (officeRole && officeRole !== role && !existing.some((r) => r.role === officeRole && !r.department_slug)) {
      await supabase.from("user_roles").insert({ user_id: userId, role: officeRole, department_slug: null });
    }
    if (department_slug) {
      await supabase.from("profiles").update({ primary_department: department_slug }).eq("id", userId);
    }

    toast.success("Role assigned");
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
    qc.invalidateQueries({ queryKey: ["dept-team"] });
    qc.invalidateQueries({ queryKey: ["current-role"] });
    qc.invalidateQueries({ queryKey: ["leadership-access"] });
    qc.invalidateQueries({ queryKey: ["branch-scope"] });
  };

  /** Chairperson may move a member between registered churches (branches). */
  const moveBranch = async (userId: string, branch: string) => {
    const { error } = await supabase.from("profiles").update({ branch: branch as any }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Member moved");
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
    qc.invalidateQueries({ queryKey: ["branch-scope"] });
  };
  const removeRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
    qc.invalidateQueries({ queryKey: ["current-role"] });
    qc.invalidateQueries({ queryKey: ["leadership-access"] });
  };

  const removeRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
  };
 
  const approve = async (userId: string, ok: boolean) => {
    const { error } = await supabase.rpc("approve_member", { _user_id: userId, _approve: ok });
    if (error) return toast.error(error.message);
    toast.success(ok ? "Member approved and added to department" : "Request rejected");
    qc.invalidateQueries({ queryKey: ["all-profiles"] });
  };
 
  const pending = (profiles.data ?? []).filter((p: any) => p.approval_status === "pending");
  const others = (profiles.data ?? []).filter((p: any) => p.approval_status !== "pending");
 
  const BRANCH_GROUPS = [
    { key: "etwatwa", label: "Etwatwa" },
    { key: "joburg_north", label: "Joburg North" },
    { key: "joburg_south", label: "Joburg South" },
  ] as const;
  const othersByBranch = BRANCH_GROUPS.map((g) => ({
    ...g,
    members: others.filter((p: any) => p.branch === g.key),
  }));
  const unassignedOthers = others.filter(
    (p: any) => !BRANCH_GROUPS.some((g) => g.key === p.branch)
  );
 
  if (access.isLoading) return <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">Loading…</div>;
  if (!access.data?.isChair)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <h1 className="font-serif text-3xl">Restricted</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The Admin console is available to Chairpersons only.
        </p>
      </div>
    );

  return (

    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">User &amp; portal settings</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Only Senior Apostle, Church Secretary and Chairpersons can write here (enforced server-side by RLS).
        Approval notifications are directed to <strong>richardmashaba.19@gmail.com</strong>.
      </p>
 
      {/* Pending approvals */}
      <h2 className="mt-10 font-serif text-2xl">
        Pending approvals {pending.length > 0 && <span className="text-sm text-amber-600">({pending.length})</span>}
      </h2>
      <div className="mt-4 space-y-3">
        {pending.length === 0 && (
          <Card className="p-5 text-sm text-muted-foreground">No pending requests.</Card>
        )}
        {pending.map((p: any) => (
          <Card key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-serif text-lg">{p.full_name ?? "(no name)"}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
                <p className="mt-2 text-sm">
                  Branch: <strong>{p.branch ?? "—"}</strong> · Department: <strong>{p.requested_department_slug ?? "—"}</strong> · Role: <strong>{p.requested_role ?? "—"}</strong>
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(p.id, true)}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => approve(p.id, false)}>Reject</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
 
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Theme of the year</p>
          <div className="mt-4 space-y-3">
            <div><Label>Year</Label><Input placeholder={String(themeV.year ?? "")} onChange={(e) => setThemeForm({ ...themeForm, year: e.target.value })} /></div>
            <div><Label>Title</Label><Input placeholder={themeV.title ?? ""} onChange={(e) => setThemeForm({ ...themeForm, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea placeholder={themeV.description ?? ""} onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })} /></div>
            <Button onClick={saveTheme}>Save theme</Button>
          </div>
        </Card>
 
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Senior Apostle / Pastor</p>
          <div className="mt-4 space-y-3">
            <div><Label>Name</Label><Input placeholder={apostleV.name ?? ""} onChange={(e) => setApostleForm({ ...apostleForm, name: e.target.value })} /></div>
            <div><Label>Photo URL</Label><Input placeholder={apostleV.photo_url ?? ""} onChange={(e) => setApostleForm({ ...apostleForm, photo_url: e.target.value })} /></div>
            <div><Label>Bio</Label><Textarea placeholder={apostleV.bio ?? ""} onChange={(e) => setApostleForm({ ...apostleForm, bio: e.target.value })} /></div>
            <Button onClick={saveApostle}>Save</Button>
          </div>
        </Card>
      </div>
 
      <h2 className="mt-12 font-serif text-2xl">Approved users &amp; roles</h2>
 
      {others.length === 0 && (
        <Card className="mt-4 p-6 text-sm text-muted-foreground">No approved users yet.</Card>
      )}
 
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {othersByBranch.map((group) => (
          <div key={group.key} className="rounded-lg border border-border p-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
              {group.label} {group.members.length > 0 && `(${group.members.length})`}
            </h3>
            <div className="mt-3 space-y-4">
              {group.members.map((p: any) => (
                <UserRow
                  key={p.id}
                  profile={p}
                  departments={depts.data ?? []}
                  onAssign={(role, dept) => assignRole(p.id, role, dept, p.roles ?? [])}
                  onRemove={removeRole}
                  onMoveBranch={(b) => moveBranch(p.id, b)}
                />
              ))}
              {group.members.length === 0 && (
                <p className="text-sm text-muted-foreground">No members from {group.label} yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
 
      {unassignedOthers.length > 0 && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
            No branch set ({unassignedOthers.length})
          </h3>
          <div className="mt-3 space-y-4">
            {unassignedOthers.map((p: any) => (
              <UserRow
                key={p.id}
                profile={p}
                departments={depts.data ?? []}
                onAssign={(role, dept) => assignRole(p.id, role, dept, p.roles ?? [])}
                onRemove={removeRole}
                onMoveBranch={(b) => moveBranch(p.id, b)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({
  profile,
  departments,
  onAssign,
  onRemove,
  onMoveBranch,
}: {
  profile: any;
  departments: { slug: string; name: string }[];
  onAssign: (role: AppRole, department: string | null) => void;
  onRemove: (id: string) => void;
  onMoveBranch: (branch: string) => void;
}) {
  const [role, setRole] = useState<AppRole>("team_member");
  const [dept, setDept] = useState<string>("");

  const deptName = (slug: string) => departments.find((d) => d.slug === slug)?.name ?? slug;

  // Every department this member belongs to: their registered department plus
  // each department they have been assigned a role in.
  const memberships: string[] = Array.from(
    new Set(
      [profile.primary_department, ...(profile.roles ?? []).map((r: any) => r.department_slug)].filter(
        Boolean,
      ) as string[],
    ),
  );

  return (
    <div className="rounded-md border border-border/60 p-3">
      <p className="text-sm font-medium">{profile.full_name ?? "(no name)"}</p>
      <p className="text-xs text-muted-foreground">{profile.email}</p>

      {memberships.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Departments: {memberships.map(deptName).join(", ")}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Select value={profile.branch ?? ""} onValueChange={onMoveBranch}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="etwatwa">Etwatwa</SelectItem>
            <SelectItem value="joburg_north">Joburg North</SelectItem>
            <SelectItem value="joburg_south">Joburg South</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">Move church</span>
      </div>

      {profile.roles?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {dedupeRoles(profile.roles).map((r: any) => (
            <span
              key={r.id}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {ROLE_LABELS?.[r.role as AppRole] ?? r.role}
              {r.department_slug ? ` · ${r.department_slug}` : ""}
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                className="ml-1 text-muted-foreground hover:text-red-600"
                aria-label="Remove role"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS?.[r] ?? r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" onClick={() => onAssign(role, dept || null)}>
          Assign
        </Button>
      </div>
    </div>
  );
}


/** Collapse duplicate role rows (same role + department) so chips show once. */
function dedupeRoles(roles: any[]) {
  const seen = new Set<string>();
  return roles.filter((r) => {
    const key = `${r.role}::${r.department_slug ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
