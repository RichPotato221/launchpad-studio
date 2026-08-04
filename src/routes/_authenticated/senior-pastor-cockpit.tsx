import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllKpis, fetchDepartments, KPI_CATEGORIES, type KpiCategory } from "@/lib/portal";
import { useLeadershipAccess } from "@/lib/useLeadershipAccess";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RiskDashboard } from "@/components/RiskDashboard";
import { ApostolicCenter } from "@/components/apostolic/ApostolicCenter";

export const Route = createFileRoute("/_authenticated/senior-pastor-cockpit")({
  head: () => ({ meta: [{ title: "Senior Pastor Cockpit — TRoGKC Portal" }] }),
  component: CockpitPage,
});

function CockpitPage() {
  const access = useLeadershipAccess();

  if (access.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  if (!access.data?.hasAccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Restricted</p>
        <h1 className="mt-2 font-serif text-3xl">Senior Pastor Cockpit</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This dashboard is reserved for the Senior Apostle, the Chairperson of the Apostolic Council, and the Church
          Secretary, per the Governance Manual.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Office of the Senior Apostle</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Apostolic Command Centre</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
        The highest level of oversight — every branch, department, office, financial system, governance structure,
        development project and Kingdom assignment in one real-time view.
      </p>

      <Button variant="outline" size="sm" onClick={() => window.print()} className="mt-4 print:hidden">
        Export Dashboard as PDF
      </Button>

      <ApostolicCenter />

      <div className="mt-12">
        <h2 className="font-serif text-2xl">Apostolic broadcasts</h2>
        {access.data.isSeniorApostle && <CockpitComposer />}
        <CockpitPosts />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <RiskDashboard />
        <BranchScorecards />
        <RedFlagKpis />
        <PendingApprovals />
        <ReportingCompliance />
        <MembershipPulse />
      </div>
    </div>
  );
}


/* -------------------- Cockpit posts (Senior Pastor Cockpit feed) -------------------- */
function CockpitComposer() {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [targetBranch, setTargetBranch] = useState("all");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    const { data: userRes } = await supabase.auth.getUser();
    let attachment_url: string | null = null;
    let attachment_name: string | null = null;
    if (file && userRes.user) {
      const path = `${userRes.user.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("cockpit-attachments").upload(path, file);
      if (up.error) {
        setPosting(false);
        return toast.error(up.error.message);
      }
      attachment_url = path;
      attachment_name = file.name;
    }
    const { error } = await supabase.from("cockpit_posts").insert({
      author_id: userRes.user!.id,
      body: body.trim(),
      target_branch: targetBranch as any,
      attachment_url,
      attachment_name,
    });
    setPosting(false);
    if (error) return toast.error(error.message);
    setBody("");
    setFile(null);
    toast.success("Posted to leadership");
    qc.invalidateQueries({ queryKey: ["cockpit-posts"] });
  };

  return (
    <Card className="mt-8 p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Broadcast from the Senior Pastor</p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a directive, encouragement, or update…"
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
          required
        />
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Target</span>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="all">All Branches</option>
              <option value="twatwa">Twatwa</option>
              <option value="joburg_north">Joburg North</option>
              <option value="joburg_south">Joburg South</option>
            </select>
          </div>
          <Button type="submit" disabled={posting}>
            {posting ? "Posting…" : "Post"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CockpitPosts() {
  const qc = useQueryClient();
  const posts = useQuery({
    queryKey: ["cockpit-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cockpit_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((p: any) => p.author_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as any[] };
      const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      return (data ?? []).map((p: any) => ({ ...p, author_name: nameMap.get(p.author_id) ?? "Senior Pastor" }));
    },
  });

  return (
    <div className="mt-6 space-y-4">
      {posts.data?.map((p) => (
        <CockpitPostItem key={p.id} post={p} onChange={() => qc.invalidateQueries({ queryKey: ["cockpit-posts"] })} />
      ))}
      {!posts.isLoading && (posts.data?.length ?? 0) === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">No cockpit broadcasts yet.</Card>
      )}
    </div>
  );
}

function CockpitPostItem({ post, onChange }: { post: any; onChange: () => void }) {
  const [attachUrl, setAttachUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (post.attachment_url) {
      supabase.storage
        .from("cockpit-attachments")
        .createSignedUrl(post.attachment_url, 3600)
        .then(({ data }) => setAttachUrl(data?.signedUrl ?? null));
    }
  }, [post.attachment_url]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("cockpit_post_comments")
      .select("id, author_id, body, created_at")
      .eq("post_id", post.id)
      .order("created_at");
    const ids = Array.from(new Set((data ?? []).map((c: any) => c.author_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as any[] };
    const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    setComments((data ?? []).map((c: any) => ({ ...c, author_name: nameMap.get(c.author_id) ?? "Member" })));
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("cockpit_post_comments").insert({
      post_id: post.id,
      author_id: userRes.user!.id,
      body: comment.trim(),
    });
    if (error) return toast.error(error.message);
    setComment("");
    loadComments();
    onChange();
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{post.author_name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleString()} ·{" "}
            {post.target_branch === "all" ? "All Branches" : post.target_branch}
          </p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>
      {attachUrl && (
        <a
          href={attachUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-primary underline"
        >
          📎 {post.attachment_name ?? "attachment"}
        </a>
      )}
      <button
        onClick={() => {
          setShowComments((s) => {
            if (!s) loadComments();
            return !s;
          });
        }}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground"
      >
        {showComments ? "Hide comments" : "Show comments"}
      </button>
      {showComments && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium">{c.author_name}</span>{" "}
              <span className="text-xs text-muted-foreground">· {new Date(c.created_at).toLocaleString()}</span>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={addComment}>
              Send
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* -------------------- Red-Flag KPIs -------------------- */
function RedFlagKpis() {
  const kpis = useQuery({ queryKey: ["all-kpis"], queryFn: fetchAllKpis });
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  const deptName = (slug: string) => depts.data?.find((d) => d.slug === slug)?.name ?? slug;
  const categoryLabel = (c: KpiCategory) => KPI_CATEGORIES.find((k) => k.key === c)?.label ?? c;

  const flags = useMemo(() => {
    if (!kpis.data) return [];
    const latest = new Map<string, (typeof kpis.data)[number]>();
    for (const row of kpis.data) {
      const key = `${row.branch}::${row.department_slug}::${row.kpi_name}`;
      const existing = latest.get(key);
      if (!existing || row.period_date > existing.period_date) latest.set(key, row);
    }
    return Array.from(latest.values())
      .filter((r) => r.target != null && (r.actual == null || Number(r.actual) < Number(r.target)))
      .sort((a, b) => {
        const pctA = a.actual == null ? -1 : Number(a.actual) / Number(a.target);
        const pctB = b.actual == null ? -1 : Number(b.actual) / Number(b.target);
        return pctA - pctB;
      });
  }, [kpis.data]);

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Red-Flag KPIs</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Most recent period per KPI, below target or not yet reported.
      </p>
      <div className="mt-4 space-y-3">
        {flags.map((r) => {
          const notReported = r.actual == null;
          const pct = notReported ? 0 : Math.round((Number(r.actual) / Number(r.target)) * 100);
          const badgeClass = notReported
            ? "bg-muted text-muted-foreground"
            : pct < 60
              ? "bg-red-100 text-red-700"
              : "bg-orange-100 text-orange-700";
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{r.kpi_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.branch} · {deptName(r.department_slug)} · {categoryLabel(r.category)} · {r.period_date}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
                {notReported ? "Not reported" : `${pct}% of target`}
              </span>
            </div>
          );
        })}
        {kpis.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!kpis.isLoading && flags.length === 0 && (
          <p className="text-sm text-muted-foreground">No red flags — every reported KPI is on target. 🎉</p>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Branch Health Scorecards ---------------- */
function BranchScorecards() {
  const kpis = useQuery({ queryKey: ["all-kpis"], queryFn: fetchAllKpis });

  const scores = useMemo(() => {
    if (!kpis.data) return [];
    const latest = new Map<string, (typeof kpis.data)[number]>();
    for (const row of kpis.data) {
      const key = `${row.branch}::${row.department_slug}::${row.kpi_name}`;
      const existing = latest.get(key);
      if (!existing || row.period_date > existing.period_date) latest.set(key, row);
    }
    const byBranch: Record<string, { total: number; count: number; redFlags: number }> = {};
    for (const row of latest.values()) {
      if (!row.branch || row.target == null || row.actual == null) continue;
      const b = row.branch;
      byBranch[b] ??= { total: 0, count: 0, redFlags: 0 };
      const pct = (Number(row.actual) / Number(row.target)) * 100;
      byBranch[b].total += Math.min(pct, 100);
      byBranch[b].count += 1;
      if (pct < 60) byBranch[b].redFlags += 1;
    }
    return Object.entries(byBranch).map(([branch, v]) => ({
      branch,
      score: v.count ? Math.round(v.total / v.count) : 0,
      redFlags: v.redFlags,
    }));
  }, [kpis.data]);

  const scoreColor = (score: number) =>
    score >= 90 ? "text-green-600" : score >= 60 ? "text-orange-500" : "text-red-600";

  return (
    <Card className="p-6 lg:col-span-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Church Health Score — By Branch</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Average KPI achievement across reported KPIs per branch, out of 100.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {scores.map((s) => (
          <div key={s.branch} className="rounded-md border border-border/60 p-4 text-center">
            <p className={`font-serif text-3xl ${scoreColor(s.score)}`}>{s.score}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.branch}</p>
            {s.redFlags > 0 && (
              <p className="mt-1 text-xs text-red-600">
                {s.redFlags} red flag{s.redFlags === 1 ? "" : "s"}
              </p>
            )}
          </div>
        ))}
      </div>
      {kpis.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
    </Card>
  );
}

/* -------------------- Pending Approvals (expense claims awaiting Senior Pastor sign-off) -------------------- */
function PendingApprovals() {
  const qc = useQueryClient();
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const claims = useQuery({
    queryKey: ["cockpit-pending-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .eq("status", "chair_approved")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deptName = (slug: string) => depts.data?.find((d) => d.slug === slug)?.name ?? slug;

  const advance = async (id: string, status: "senior_pastor_approved" | "rejected") => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("expense_claims")
      .update(status === "senior_pastor_approved" ? { status, approved_by_senior: userRes.user?.id } : { status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "senior_pastor_approved" ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["cockpit-pending-claims"] });
  };

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Pending Your Approval</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Expense claims already chair-approved, awaiting final sign-off.
      </p>
      <div className="mt-4 space-y-3">
        {claims.data?.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium">
                R {Number(r.amount).toFixed(2)} · {r.claim_type ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {deptName(r.department_slug)} · {r.description}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => advance(r.id, "senior_pastor_approved")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => advance(r.id, "rejected")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
        {claims.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!claims.isLoading && (claims.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Nothing waiting on you right now.</p>
        )}
      </div>
    </Card>
  );
}

/* -------------------- Reporting Compliance -------------------- */
function ReportingCompliance() {
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const reports = useQuery({
    queryKey: ["cockpit-reports-this-month"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("report_entries")
        .select("department_slug, created_at")
        .gte("created_at", start.toISOString());
      if (error) throw error;
      return data;
    },
  });

  const reportedSlugs = new Set((reports.data ?? []).map((r) => r.department_slug));

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Reporting Compliance — This Month</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Every department is expected to submit a monthly activity report.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {depts.data?.map((d) => {
          const reported = reportedSlugs.has(d.slug);
          return (
            <div
              key={d.slug}
              className={`rounded-md px-3 py-2 text-xs ${reported ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {d.name}
              <span className="block text-[0.65rem] uppercase tracking-widest opacity-80">
                {reported ? "Submitted" : "Missing"}
              </span>
            </div>
          );
        })}
        {depts.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </Card>
  );
}

/* -------------------- Membership Pulse -------------------- */
function MembershipPulse() {
  const stages = useQuery({
    queryKey: ["cockpit-membership-pulse"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_lifecycle").select("stage");
      if (error) throw error;
      return data;
    },
  });

  const STAGE_LABELS: Record<string, string> = {
    visitor: "Visitors",
    new_convert: "New Converts",
    member: "Members",
    serving: "Serving",
    leader: "Leaders",
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { visitor: 0, new_convert: 0, member: 0, serving: 0, leader: 0 };
    for (const row of stages.data ?? []) c[row.stage] = (c[row.stage] ?? 0) + 1;
    return c;
  }, [stages.data]);

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Membership Pulse</p>
      <p className="mt-1 text-xs text-muted-foreground">Current count by lifecycle stage.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(STAGE_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-md border border-border/60 p-3 text-center">
            <p className="font-serif text-2xl">{counts[key] ?? 0}</p>
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {stages.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
    </Card>
  );
}
