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

  const groups: { key: string; label: string }[] = [
    { key: "functional", label: "Functional Ministry Departments" },
    { key: "developmental", label: "Developmental Structures" },
    { key: "seven_mountain", label: "Seven Mountains" },
    { key: "five_fold", label: "Five-Fold Ministry (under Religion)" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Departments</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">All portals</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Each department portal contains overview, KPI dashboard, team roster, reports and SOPs.
      </p>

      {groups.map((g) => {
        const items = (data ?? []).filter((d) => d.kind === g.key);
        if (items.length === 0) return null;
        return (
          <section key={g.key} className="mt-10">
            <h2 className="mb-4 font-serif text-2xl">{g.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
