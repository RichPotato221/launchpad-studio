import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PORTAL_IMAGES } from "@/lib/portalImages";

export const Route = createFileRoute("/_authenticated/governance")({
  head: () => ({ meta: [{ title: "Governance — TRoGKC Portal" }] }),
  component: () => (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Governance</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Chairpersons &amp; Church Secretary</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Shared workspace for Joint Governance &amp; Department Audits (Article V of the Constitution).
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card className="p-6 text-sm text-muted-foreground">
          Cross-department dashboards, department audits, and joint-governance actions will be built here in Phase 4.
        </Card>
        <Card className="overflow-hidden p-0">
          <img
            src={PORTAL_IMAGES.governanceSecretary}
            alt="Church Secretary reading an official announcement"
            className="h-64 w-full object-cover"
          />
          <div className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Church Secretary</p>
            <p className="mt-1 font-serif text-lg">Official announcements &amp; records</p>
          </div>
        </Card>
      </div>
    </div>
  ),
});

