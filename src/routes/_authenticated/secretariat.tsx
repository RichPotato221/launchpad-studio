import { createFileRoute, redirect } from "@tanstack/react-router";

/** The Secretarial Office now lives inside the Secretary department portal. */
export const Route = createFileRoute("/_authenticated/secretariat")({
  head: () => ({ meta: [{ title: "Secretary Office — TRoGKC Portal" }, { name: "description", content: "Church secretarial records, meetings and correspondence for TRoGKC." }, { property: "og:title", content: "Secretary Office — TRoGKC Portal" }, { property: "og:description", content: "Church secretarial records, meetings and correspondence for TRoGKC." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/departments/$slug", params: { slug: "secretary" } });
  },
  component: () => null,
});
