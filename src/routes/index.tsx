import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "TRoGKC Leadership Portal" }, { name: "description", content: "Church leadership, departments and serving members." }, { property: "og:title", content: "TRoGKC Leadership Portal" }, { property: "og:description", content: "Church leadership, departments and serving members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
  component: () => null,
});
