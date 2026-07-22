import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchDepartments } from "@/lib/portal";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({ meta: [{ title: "Departments — TRoGKC Portal" }] }),
  component: DepartmentsLayout,
});

function DepartmentsLayout() {
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId === "/_authenticated/departments/$slug");
  if (hasChild) return <Outlet />;
  return <DepartmentsIndex />;
}

function DepartmentsIndex() {
  const { data, isLoading } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  if (isLoading) return <div className="mx-auto max-w-7xl p-8 text-muted-foreground">Loading…</div>;

  const groups: { key: string; label: string; note?: string }[] = [
    { key: "governmental", label: "Governmental Structure", note: "Oversight and pastoral leadership." },
    { key: "functional", label: "Functional Structure", note: "Weekly service operations." },
    { key: "developmental", label: "Developmental Structure", note: "Discipleship pathways and ministry schools." },
    { key: "support_services", label: "Support Services", note: "Care and connection ministries." },
  ];

  const mountains = (data ?? []).filter((d) => d.kind === "seven_mountain");
  const fiveFold = (data ?? []).filter((d) => d.kind === "five_fold");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Departments</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">All portals</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Each portal contains overview, KPI dashboard, team roster, reports and SOPs.
      </p>

      {groups.map((g) => {
        const items = (data ?? []).filter((d) => d.kind === g.key);
        if (items.length === 0) return null;
        return (
          <section key={g.key} className="mt-10">
            <h2 className="font-serif text-2xl">{g.label}</h2>
            {g.note && <p className="mb-4 text-xs text-muted-foreground">{g.note}</p>}
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((d) => (
                <Link key={d.slug} to="/departments/$slug" params={{ slug: d.slug }}>
                  <Card className="p-5 transition hover:border-foreground">
                    <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{d.scripture}</p>
                    <p className="mt-2 font-serif text-xl">{d.name}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Open portal →</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {mountains.length > 0 && (
        <section className="mt-12 rounded-lg border border-border bg-muted/30 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">School of Ministry (TSOM)</p>
          <h2 className="mt-1 font-serif text-2xl">Seven Mountains of Influence</h2>
          <p className="mb-4 text-xs text-muted-foreground">Kingdom assignments across every sphere of society.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mountains.map((d) => (
              <Link key={d.slug} to="/departments/$slug" params={{ slug: d.slug }}>
                <Card className="p-5 transition hover:border-foreground">
                  <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{d.scripture}</p>
                  <p className="mt-2 font-serif text-xl">{d.name}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Open portal →</p>
                </Card>
              </Link>
            ))}
          </div>

          {fiveFold.length > 0 && (
            <div className="mt-8 rounded-md border border-border/70 bg-background p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Under the Religion Mountain</p>
              <h3 className="mt-1 font-serif text-xl">Five-Fold Ministry</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fiveFold.map((d) => (
                  <Link key={d.slug} to="/departments/$slug" params={{ slug: d.slug }}>
                    <Card className="p-4 transition hover:border-foreground">
                      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{d.scripture}</p>
                      <p className="mt-2 font-serif text-lg">{d.name}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
