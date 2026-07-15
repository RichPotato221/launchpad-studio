import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/governance")({
  head: () => ({ meta: [{ title: "Governance — TRoGKC Portal" }] }),
  component: () => (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Governance</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Chairpersons &amp; Church Secretary</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Shared workspace for Joint Governance &amp; Department Audits (Article V of the Constitution).
      </p>
      <Card className="mt-8 p-6 text-sm text-muted-foreground">
        Cross-department dashboards, department audits, and joint-governance actions will be built here in Phase 4.
      </Card>
    </div>
  ),
});
