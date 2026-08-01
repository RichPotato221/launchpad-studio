import { createFileRoute, redirect } from "@tanstack/react-router";

/** The Secretarial Office now lives inside the Secretary department portal. */
export const Route = createFileRoute("/_authenticated/secretariat")({
  beforeLoad: () => {
    throw redirect({ to: "/departments/$slug", params: { slug: "secretary" } });
  },
  component: () => null,
});
