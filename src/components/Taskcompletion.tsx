import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

type CompletionRow = { total_tasks: number; done_tasks: number; overdue_tasks: number };
type DeadlineRow = {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  department_slug: string | null;
  branch: string | null;
  assigned_to: string | null;
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};

export function TaskCompletion() {
  const completion = useQuery({
    queryKey: ["task-completion"],
    queryFn: async (): Promise<CompletionRow> => {
      const { data, error } = await supabase.rpc("get_task_completion", { _days: 30 });
      if (error) throw error;
      return (data?.[0] as CompletionRow) ?? { total_tasks: 0, done_tasks: 0, overdue_tasks: 0 };
    },
  });

  const deadlines = useQuery({
    queryKey: ["upcoming-deadlines"],
    queryFn: async (): Promise<DeadlineRow[]> => {
      const { data, error } = await supabase.rpc("get_upcoming_deadlines", { _limit: 8 });
      if (error) throw error;
      return (data ?? []) as DeadlineRow[];
    },
  });

  const pct = completion.data && completion.data.total_tasks > 0
    ? Math.round((completion.data.done_tasks / completion.data.total_tasks) * 100)
    : 0;

  const barColor = pct >= 90 ? "bg-emerald-600" : pct >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="p-6 lg:col-span-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Task Completion — Last 30 Days</p>

      {completion.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {completion.isError && <p className="mt-4 text-sm text-red-600">Couldn't load task completion.</p>}

      {completion.data && (
        <>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="font-serif text-3xl">{pct}%</p>
            <p className="text-xs text-muted-foreground">
              {completion.data.done_tasks} of {completion.data.total_tasks} completed
              {completion.data.overdue_tasks > 0 && (
                <span className="ml-2 text-red-600">· {completion.data.overdue_tasks} overdue</span>
              )}
            </p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </>
      )}

      <div className="mt-6 border-t border-border/60 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Upcoming Deadlines</p>

        {deadlines.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {deadlines.isError && <p className="mt-3 text-sm text-red-600">Couldn't load upcoming deadlines.</p>}
        {!deadlines.isLoading && !deadlines.isError && (deadlines.data?.length ?? 0) === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Nothing due — all clear.</p>
        )}

        <div className="mt-3 space-y-2">
          {(deadlines.data ?? []).map((d) => {
            const isOverdue = new Date(d.due_date) < new Date(new Date().toDateString());
            return (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[d.branch, d.department_slug].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[d.priority] ?? PRIORITY_COLOR.normal}`}>
                    {d.priority}
                  </span>
                  <span className={`text-xs ${isOverdue ? "font-medium text-red-600" : "text-muted-foreground"}`}>
                    {d.due_date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

