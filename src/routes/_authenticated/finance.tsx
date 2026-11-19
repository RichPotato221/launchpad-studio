import { createFileRoute, redirect } from "@tanstack/react-router";

/** Finance now lives inside the Finance department portal. */
export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Financial Administrator | TRoGKC" }, { name: "description", content: "Finance stewardship, approvals, payments, budgets and audit history." }, { property: "og:title", content: "Financial Administrator | TRoGKC" }, { property: "og:description", content: "Finance stewardship, approvals, payments, budgets and audit history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/departments/$slug", params: { slug: "finance" } });
  },
  component: () => null,
});
