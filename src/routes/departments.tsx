import { createFileRoute, Link } from "@tanstack/react-router";
import { DEPARTMENTS } from "@/lib/departments";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — Throne Room of God Kingdom Center" },
      {
        name: "description",
        content:
          "Explore the ministry departments of TRoGKC — Worship, Discipleship, Outreach, Media, Youth, Finance and the School of Ministry.",
      },
      { property: "og:title", content: "Departments of TRoGKC" },
      {
        property: "og:description",
        content: "Ministry departments and their vision, purpose and manuals.",
      },
    ],
  }),
  component: DepartmentsIndex,
});

function DepartmentsIndex() {
  return (
    <>
      <section className="container-editorial pb-16 pt-24 md:pt-32">
        <p className="eyebrow">Departments</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          Structured for <em className="text-teal">alignment</em>, released for
          impact.
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Every department reports through the Senior Apostle and operates in
          alignment with the vision and mission of the house. Each carries its
          own scriptural mandate, functions and downloadable manuals.
        </p>
      </section>

      <section className="container-editorial pb-24">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.slug}
              to="/departments/$slug"
              params={{ slug: d.slug }}
              className="group flex flex-col border border-border bg-card"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={d.image}
                  alt={d.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[0.65rem] uppercase tracking-[0.22em] text-teal">
                  {d.pillar} · {d.scripture}
                </p>
                <h2 className="mt-2 font-serif text-2xl">{d.name}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                  {d.vision}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-foreground">
                  Open department →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
