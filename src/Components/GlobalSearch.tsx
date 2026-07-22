import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type ResultGroup = {
  label: string;
  items: { id: string; title: string; subtitle: string; path: string }[];
};

export function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const results = useQuery({
    queryKey: ["global-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async (): Promise<ResultGroup[]> => {
      const q = `%${term.trim()}%`;

      const [members, tasks, departments, kpis, events] = await Promise.all([
        supabase.from("profiles").select("id, full_name, branch, primary_department")
          .ilike("full_name", q).limit(5),
        supabase.from("tasks").select("id, title, status, department_slug, branch")
          .ilike("title", q).limit(5),
        supabase.from("departments").select("slug, name, kind")
          .ilike("name", q).limit(5),
        supabase.from("kpis").select("id, kpi_name, department_slug, branch")
          .ilike("kpi_name", q).limit(5),
        supabase.from("events").select("id, title, event_date, department_slug, branch")
          .ilike("title", q).limit(5),
      ]);

      const groups: ResultGroup[] = [];

      if (members.data?.length) {
        groups.push({
          label: "Members",
          items: members.data.map((m) => ({
            id: m.id,
            title: m.full_name ?? "Unnamed",
            subtitle: [m.branch, m.primary_department].filter(Boolean).join(" · "),
            path: `/admin?user=${m.id}`,
          })),
        });
      }
      if (tasks.data?.length) {
        groups.push({
          label: "Tasks",
          items: tasks.data.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: [t.branch, t.department_slug, t.status].filter(Boolean).join(" · "),
            path: `/tasks?id=${t.id}`,
          })),
        });
      }
      if (departments.data?.length) {
        groups.push({
          label: "Departments",
          items: departments.data.map((d) => ({
            id: d.slug,
            title: d.name,
            subtitle: d.kind,
            path: `/departments/${d.slug}`,
          })),
        });
      }
      if (kpis.data?.length) {
        groups.push({
          label: "KPIs",
          items: kpis.data.map((k) => ({
            id: k.id,
            title: k.kpi_name,
            subtitle: [k.branch, k.department_slug].filter(Boolean).join(" · "),
            path: `/departments/${k.department_slug}?tab=kpis`,
          })),
        });
      }
      if (events.data?.length) {
        groups.push({
          label: "Events",
          items: events.data.map((e) => ({
            id: e.id,
            title: e.title,
            subtitle: [e.branch, e.department_slug, e.event_date].filter(Boolean).join(" · "),
            path: `/events?id=${e.id}`,
          })),
        });
      }

      return groups;
    },
  });

  const hasResults = useMemo(
    () => (results.data ?? []).some((g) => g.items.length > 0),
    [results.data]
  );

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search members, tasks, departments..."
          className="pl-8"
        />
      </div>

      {open && term.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-96 overflow-y-auto">
          {results.isLoading && (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          )}
          {!results.isLoading && !hasResults && (
            <p className="p-3 text-sm text-muted-foreground">No results for "{term}".</p>
          )}
          {results.data?.map((group) => (
            <div key={group.label} className="border-b border-border/60 last:border-0">
              <p className="px-3 pt-2 text-xs uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => {
  window.location.href = item.path;
  setOpen(false);
  setTerm("");
}}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-accent"
                >
                  <span className="text-sm font-medium">{item.title}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
    }
