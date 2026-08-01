import { createFileRoute, redirect } from "@tanstack/react-router";

/** Finance now lives inside the Finance department portal. */
export const Route = createFileRoute("/_authenticated/finance")({
  beforeLoad: () => {
    throw redirect({ to: "/departments/$slug", params: { slug: "finance" } });
  },
  component: () => null,
});
