import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeadershipAccess } from "@/lib/useLeadershipAccess";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, ShieldAlert, Lock } from "lucide-react";
import { fetchDepartments } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Central Vault — TRoGKC Portal" },
      { name: "description", content: "Leadership-only archive of every file uploaded anywhere in the portal." },
    ],
  }),
  component: VaultPage,
});

type UploadRow = {
  source: string;
  source_id: string;
  title: string | null;
  file_url: string | null;
  file_name: string | null;
  department_slug: string | null;
  branch: string | null;
  uploader_id: string | null;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  documents: "Documents",
  announcements: "Announcements",
  announcement_media: "Announcement media",
  cockpit_posts: "Senior Pastor Cockpit",
  report_entries: "Department Reports",
  finance_entries: "Finance",
  expense_claims: "Expense Receipts",
  editorial_posts: "Media & Editorial",
  songs: "Worship Charts",
  governance_documents: "Governance",
  avatars: "Member Avatars",
};

function VaultPage() {
  const access = useLeadershipAccess();
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const uploads = useQuery({
    queryKey: ["central-vault"],
    enabled: access.data?.hasAccess === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_uploads");
      if (error) throw error;
      return (data ?? []) as UploadRow[];
    },
  });

  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: 0 };
    (uploads.data ?? []).forEach((r) => {
      map.all += 1;
      map[r.source] = (map[r.source] ?? 0) + 1;
    });
    return map;
  }, [uploads.data]);

  const filtered = useMemo(() => {
    return (uploads.data ?? []).filter((r) => {
      if (tab !== "all" && r.source !== tab) return false;
      if (deptFilter !== "all" && r.department_slug !== deptFilter) return false;
      if (branchFilter !== "all" && r.branch !== branchFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.title ?? ""} ${r.file_name ?? ""} ${r.source} ${r.department_slug ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [uploads.data, tab, deptFilter, branchFilter, search]);

  if (access.isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!access.data?.hasAccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Lock className="h-10 w-10 text-muted-foreground" />
          <h1 className="font-serif text-2xl">Leadership only</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The Central Vault is a leadership-oversight archive for Senior Pastors, the Chairperson,
            the Church Secretary and Lead/Associate Pastors. If you need a file, please ask them.
          </p>
        </Card>
      </div>
    );
  }

  const sourceTabs = ["all", ...Object.keys(SOURCE_LABELS)];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Leadership oversight</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">Central Vault</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Every file uploaded anywhere on the portal — announcements, department reports, finance
          receipts, cockpit posts, worship charts, editorial media, avatars and more — indexed in one
          place so leadership can review or download at any time.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" /> Visible only to leadership. Files stay in their
          original workspaces — this is a read-only index.
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, file name, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(depts.data ?? []).map((d) => (
              <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            <SelectItem value="etwatwa">Etwatwa</SelectItem>
            <SelectItem value="joburg_north">Joburg North</SelectItem>
            <SelectItem value="joburg_south">Joburg South</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {sourceTabs.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs">
              {s === "all" ? "All" : SOURCE_LABELS[s]}
              <span className="ml-2 rounded-full bg-muted px-1.5 text-[0.65rem] text-muted-foreground">
                {counts[s] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {uploads.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading vault…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No files match these filters.</Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">Department</th>
                <th className="px-4 py-2 text-left">Branch</th>
                <th className="px-4 py-2 text-left">Uploaded</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.source}-${r.source_id}`} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.title || r.file_name || "Untitled"}</div>
                    {r.file_name && r.file_name !== r.title && (
                      <div className="text-xs text-muted-foreground">{r.file_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">{SOURCE_LABELS[r.source] ?? r.source}</td>
                  <td className="px-4 py-2 text-xs">{r.department_slug ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{r.branch ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.file_url ? (
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <a href={r.file_url} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5" /> Open
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">no link</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
