import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { DEPARTMENTS, MANUALS } from "@/lib/departments";

export const Route = createFileRoute("/departments/$slug")({
  loader: ({ params }) => {
    const dept = DEPARTMENTS.find((d) => d.slug === params.slug);
    if (!dept) throw notFound();
    return { dept };
  },
  head: ({ loaderData }) => {
    const dept = loaderData?.dept;
    if (!dept) {
      return { meta: [{ title: "Department — Throne Room of God Kingdom Center" }] };
    }
    return {
      meta: [
        { title: `${dept.name} — Throne Room of God Kingdom Center` },
        { name: "description", content: dept.vision },
        { property: "og:title", content: `${dept.name} — TRoGKC` },
        { property: "og:description", content: dept.vision },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-editorial py-32 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="mt-4 font-serif text-4xl">Department not found</h1>
      <Link to="/departments" className="mt-6 inline-block text-sm underline">
        Back to departments
      </Link>
    </div>
  ),
  component: DepartmentDetail,
});

function DepartmentDetail() {
  const { dept } = Route.useLoaderData();

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0 -z-10">
          <img src={dept.image} alt="" aria-hidden className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/70 to-ink" />
        </div>
        <div className="container-editorial py-28 md:py-36">
          <Link to="/departments" className="text-xs uppercase tracking-widest text-gold">
            ← All departments
          </Link>
          <p className="eyebrow mt-6 text-gold">{dept.pillar}</p>
          <h1 className="mt-3 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
            {dept.name}
          </h1>
          <p className="mt-6 text-sm uppercase tracking-[0.22em] text-cream/70">
            Scriptural foundation · {dept.scripture}
          </p>
        </div>
      </section>

      {/* Vision / Mission / Purpose */}
      <section className="container-editorial grid gap-10 py-20 md:grid-cols-3">
        {[
          ["Vision", dept.vision],
          ["Mission", dept.mission],
          ["Purpose", dept.purpose],
        ].map(([label, body]) => (
          <div key={label} className="border-t border-foreground pt-6">
            <p className="eyebrow">{label}</p>
            <p className="mt-4 text-base leading-relaxed text-foreground">{body}</p>
          </div>
        ))}
      </section>

      {/* Functions */}
      <section className="border-y border-border/60 bg-secondary/50">
        <div className="container-editorial grid gap-12 py-20 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Functions</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl">
              What this department carries.
            </h2>
          </div>
          <ul className="md:col-span-8 space-y-5">
            {dept.functions.map((f, i) => (
              <li key={i} className="flex gap-6 border-t border-border pt-5">
                <span className="font-serif text-2xl text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-base leading-relaxed text-foreground">{f}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reporting flow */}
      <section className="container-editorial grid gap-12 py-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="eyebrow">Reporting flow</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">
            How authority flows.
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            All Department Chairs report directly to the Senior Apostle and
            coordinate with Associate Pastors as assigned.
          </p>
        </div>
        <pre className="overflow-x-auto whitespace-pre border border-border bg-card p-6 text-xs leading-relaxed text-foreground md:col-span-8">
{`Jesus Christ (Head)
     │
     ▼
Senior Apostle / Senior Pastor
     │
     ├─── Associate Pastor (portfolio oversight)
     │
     ▼
${dept.name} — Department Chair
     │
     ├─ Team Leads (per function)
     │
     └─ Volunteers & Members`}
        </pre>
      </section>

      {/* Manuals */}
      <section className="border-t border-border/60 bg-ink text-cream">
        <div className="container-editorial py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-gold">Download the manuals</p>
              <h2 className="mt-4 font-serif text-3xl md:text-4xl">
                Governance library for this department.
              </h2>
            </div>
            <Link
              to="/departments"
              className="text-xs uppercase tracking-widest text-gold hover:text-cream"
            >
              Back to departments →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dept.manuals.map((key) => {
              const m = MANUALS[key];
              return (
                <a
                  key={key}
                  href={m.href}
                  className="group block border border-cream/20 p-6 transition-colors hover:border-gold hover:bg-cream/5"
                >
                  <p className="text-[0.65rem] uppercase tracking-[0.22em] text-gold">
                    Download · .docx
                  </p>
                  <h3 className="mt-2 font-serif text-xl">{m.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-cream/70">{m.note}</p>
                  <span className="mt-5 inline-block text-xs uppercase tracking-widest text-gold group-hover:text-cream">
                    Download →
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
