import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";

const ParentPortal = lazy(() => import("@/components/kids/ParentPortal"));

export const Route = createFileRoute("/_authenticated/kids-parent")({
  head: () => ({
    meta: [
      { title: "Parent Portal — TRoGKC Children's Ministry" },
      { name: "description", content: "View your children's check-in code, attendance, discipleship milestones and what they are learning in TRoGKC kids church." },
      { property: "og:title", content: "Parent Portal — TRoGKC Children's Ministry" },
      { property: "og:description", content: "Your child's attendance, discipleship journey and secure check-in code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParentPortalPage,
});

function ParentPortalPage() {
  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl">Parent Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your children's check-in codes, attendance, discipleship milestones and recent lessons.
        </p>
      </header>
      <Suspense fallback={<Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
        <ParentPortal />
      </Suspense>
    </div>
  );
}
