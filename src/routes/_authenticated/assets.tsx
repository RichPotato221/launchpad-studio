import { createFileRoute, redirect } from "@tanstack/react-router";

/** Assets now live inside the Office of the Resource Administrator (EAFMS). */
export const Route = createFileRoute("/_authenticated/assets")({
  beforeLoad: () => {
    throw redirect({ to: "/departments/$slug", params: { slug: "resource-administrator" } });
  },
  component: () => null,
});
