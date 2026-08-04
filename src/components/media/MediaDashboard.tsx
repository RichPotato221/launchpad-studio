import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { pct, today } from "@/lib/intercession";
import { engagementRate, medLabel } from "@/lib/media";

const sb = supabase as any;

/** MODULE — Media command dashboard. */
export default function MediaDashboard() {
  const [s, setS] = useState<any>({ requests: [], projects: [], posts: [], streams: [], assets: [], volunteers: [] });

  useEffect(() => {
    (async () => {
      const [requests, projects, posts, streams, assets, volunteers] = await Promise.all([
        sb.from("med_requests").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("med_projects").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("med_posts").select("*").limit(300),
        sb.from("med_livestreams").select("*").order("starts_at", { ascending: false }).limit(60),
        sb.from("med_assets").select("*").limit(300),
        sb.from("med_volunteers").select("*").limit(200),
      ]);
      setS({
        requests: requests.data ?? [],
        projects: projects.data ?? [],
        posts: posts.data ?? [],
        streams: streams.data ?? [],
        assets: assets.data ?? [],
        volunteers: volunteers.data ?? [],
      });
    })();
  }, []);

  const openRequests = s.requests.filter((r: any) => !["published", "declined"].includes(r.status));
  const overdue = openRequests.filter((r: any) => r.needed_by && r.needed_by < today());
  const activeProjects = s.projects.filter((p: any) => p.stage !== "archived");
  const reach = s.posts.reduce((a: number, p: any) => a + (p.reach ?? 0), 0);
  const eng = s.posts.reduce((a: number, p: any) => a + (p.engagements ?? 0), 0);
  const nextStream = s.streams.find((x: any) => x.status !== "completed");
  const streamReadiness = nextStream
    ? pct((nextStream.checklist ?? []).filter((c: any) => c.done).length, (nextStream.checklist ?? []).length)
    : 0;

  const tile = (label: string, value: string | number, rag?: "green" | "amber" | "red", hint?: string) => (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="font-serif text-2xl">{value}</p>
        {rag && <Badge className={RAG_CLASS[rag]}>{rag}</Badge>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {tile("Open requests", openRequests.length, overdue.length > 0 ? "red" : openRequests.length > 0 ? "amber" : "green", `${overdue.length} past their needed-by date`)}
        {tile("Active projects", activeProjects.length, "green", `${s.projects.filter((p: any) => p.stage === "publishing").length} publishing`)}
        {tile("Scheduled posts", s.posts.filter((p: any) => p.status === "scheduled").length, "green", `${s.posts.length} posts on record`)}
        {tile(
          "Next stream readiness",
          `${streamReadiness}%`,
          streamReadiness >= 90 ? "green" : streamReadiness >= 60 ? "amber" : "red",
          nextStream ? `${nextStream.title} · ${nextStream.starts_at ? fmtDate(nextStream.starts_at) : "TBC"}` : "No stream scheduled",
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {tile("Total reach", reach.toLocaleString(), "green")}
        {tile("Engagement rate", `${engagementRate(eng, reach)}%`, engagementRate(eng, reach) >= 3 ? "green" : "amber")}
        {tile("Archive assets", s.assets.length, "green", `${s.assets.filter((a: any) => a.brand_approved).length} brand approved`)}
        {tile("Team members", s.volunteers.length, "green", `${s.volunteers.filter((v: any) => v.availability === "available").length} available`)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Requests needing attention</p>
          <div className="mt-3 space-y-3">
            {openRequests.slice(0, 6).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{medLabel(r.request_type)} · {r.department_slug ?? "—"} · due {fmtDate(r.needed_by)}</p>
                </div>
                <Badge className={RAG_CLASS[r.needed_by && r.needed_by < today() ? "red" : "amber"]}>{medLabel(r.status)}</Badge>
              </div>
            ))}
            {openRequests.length === 0 && <p className="text-sm text-muted-foreground">No open requests.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Production pipeline</p>
          <div className="mt-3 space-y-3">
            {activeProjects.slice(0, 6).map((p: any) => (
              <div key={p.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <Badge className={RAG_CLASS[(p.progress_pct ?? 0) >= 80 ? "green" : (p.progress_pct ?? 0) >= 40 ? "amber" : "red"]}>{medLabel(p.stage)}</Badge>
                </div>
                <div className="mt-2 h-1.5 w-full rounded bg-muted">
                  <div className="h-1.5 rounded bg-primary" style={{ width: `${p.progress_pct ?? 0}%` }} />
                </div>
              </div>
            ))}
            {activeProjects.length === 0 && <p className="text-sm text-muted-foreground">No active projects.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
