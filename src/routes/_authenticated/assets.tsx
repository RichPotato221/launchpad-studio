import { createFileRoute, redirect } from "@tanstack/react-router";

/** Assets now live inside the Office of the Resource Administrator (EAFMS). */
export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Resource Administrator — TRoGKC Portal" }, { name: "description", content: "Church assets, resource stewardship and inter-branch asset movements for TRoGKC." }, { property: "og:title", content: "Resource Administrator — TRoGKC Portal" }, { property: "og:description", content: "Church assets, resource stewardship and inter-branch asset movements for TRoGKC." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/departments/$slug", params: { slug: "resource-administrator" } });
  },
  component: () => null,
});
