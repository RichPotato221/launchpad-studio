import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  read: boolean;
  branch: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  kpi_alert_critical: "Critical KPI",
  kpi_alert: "KPI Alert",
  task_overdue: "Overdue Task",
  asset_maintenance: "Maintenance Due",
};

const TYPE_STYLE: Record<string, string> = {
  kpi_alert_critical: "bg-red-100 text-red-700",
  kpi_alert: "bg-orange-100 text-orange-700",
  task_overdue: "bg-amber-100 text-amber-700",
  asset_maintenance: "bg-amber-100 text-amber-700",
};

export function RiskDashboard() {
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: ["risk-dashboard-notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  const rows = notifications.data ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) return;
    qc.invalidateQueries({ queryKey: ["risk-dashboard-notifications"] });
  };

  const dismissAll = async () => {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
    if (error) return;
    qc.invalidateQueries({ queryKey: ["risk-dashboard-notifications"] });
  };

  return (
    <Card className="p-6 lg:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Risk Dashboard</p>
          <p className="mt-1 text-xs text-muted-foreground">Unread critical alerts, KPI risks, and overdue items addressed to you.</p>
        </div>
        {rows.length > 0 && (
          <Button size="sm" variant="outline" onClick={dismissAll}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {notifications.isError && <p className="mt-4 text-sm text-red-600">Couldn't load alerts. Try refreshing.</p>}

      {!notifications.isLoading && !notifications.isError && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(TYPE_LABEL).map(([type, label]) => (
              <div key={type} className="rounded-md border border-border/60 p-3 text-center">
                <p className={`font-serif text-2xl ${counts[type] ? "text-red-600" : "text-muted-foreground"}`}>
                  {counts[type] ?? 0}
                </p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="mt-6 text-sm text-muted-foreground">No open alerts — everything's clear. 🎉</p>
          )}

          <div className="mt-6 space-y-2">
            {rows.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[n.type] ?? "bg-muted text-muted-foreground"}`}>
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                    {n.branch && <span className="text-xs text-muted-foreground">{n.branch}</span>}
                  </div>
                  <p className="mt-1 text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="shrink-0">
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

