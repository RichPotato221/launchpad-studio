import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/trog-logo.png";
import theme2026 from "@/assets/theme-2026.jpg";
import preaching from "@/assets/preaching.jpg";
import podiumWoman from "@/assets/podium-woman.jpg";
import { DEPARTMENTS } from "@/lib/departments";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0 -z-10">
          <img
            src={preaching}
            alt=""
            aria-hidden
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-ink" />
        </div>

        <div className="container-editorial flex min-h-[92vh] flex-col justify-center gap-10 py-24 md:flex-row md:items-center">
          <div className="md:w-1/2">
            <div className="mb-8 flex items-center gap-4">
              <img
                src={logo}
                alt="Throne Room of God Kingdom Center logo"
                width={868}
                height={540}
                className="h-16 w-auto brightness-0 invert-[0.95] contrast-125 md:h-20"
                style={{ filter: "drop-shadow(0 0 12px rgba(0,0,0,0.4))" }}
              />
              <div className="font-serif text-2xl leading-tight">
                Throne Room of God
                <span className="block text-xs uppercase tracking-[0.28em] text-gold">
                  Kingdom Center
                </span>
              </div>
            </div>
            <p className="eyebrow text-gold">2026 · The year of</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
              Intimacy. Identity. <em className="text-gold">Purpose.</em>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-cream/85">
              Doctrinally equipping the saints in alignment with the biblical
              standards of God's Kingdom — forming a Christ-centred nature and
              culture that reflects the character of our Lord Jesus Christ.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/about"
                className="border border-gold bg-gold px-7 py-3.5 text-xs font-medium uppercase tracking-widest text-ink transition-colors hover:bg-transparent hover:text-gold"
              >
                Vision &amp; Mission
              </Link>
              <Link
                to="/departments"
                className="border border-cream/60 px-7 py-3.5 text-xs font-medium uppercase tracking-widest text-cream transition-colors hover:bg-cream/10"
              >
                Explore Departments
              </Link>
            </div>
          </div>

          <div className="md:w-1/2">
            <img
              src={theme2026}
              alt="Throne Room of God Kingdom Center — 2026 theme: Intimacy, Identity, Purpose"
              width={1086}
              height={705}
              className="w-full rounded shadow-editorial ring-1 ring-gold/30"
            />
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="container-editorial grid gap-16 py-24 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow">Our vision</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
            An apostolic house for the <em className="text-teal">nations</em>.
          </h2>
        </div>
        <div className="space-y-6 text-base leading-relaxed text-muted-foreground md:col-span-6 md:col-start-7">
          <p>
            We are committed to establishing strong apostolic foundations that
            effectively resource and steward Kingdom assignments for global
            impact, while restoring integrity and purity within the prophetic
            ministry.
          </p>
          <p>
            Under the headship of Jesus Christ and the leadership of the Senior
            Apostle, every department, ministry and ambassador of TRoGKC is
            aligned to one Vision, one Mission and one set of Core Values.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-3 text-sm font-medium text-foreground"
          >
            <span className="rule-brass" />
            <span className="tracking-wide">Read the full vision</span>
          </Link>
        </div>
      </section>

      {/* Mission pillars */}
      <section className="border-y border-border/60 bg-secondary/50">
        <div className="container-editorial py-24">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow">Our mission</p>
            <h2 className="mt-4 font-serif text-4xl md:text-5xl">
              Five commitments of the house.
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
            {[
              "Consistently teach and mature believers in the biblical doctrines of the Christian faith.",
              "Intentionally model and cultivate a life that reflects Christ-centeredness.",
              "Provide training and development for leaders and ministers called for Kingdom purposes.",
              "Commission fully equipped ambassadors and establish Kingdom Centres for global assignments.",
              "Bring clarity, order and distinction to prophetic expressions within the Body of Christ.",
            ].map((m, i) => (
              <div key={i} className="border-t border-foreground pt-5">
                <p className="font-serif text-2xl text-gold">
                  0{i + 1}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments preview */}
      <section className="container-editorial py-24">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="eyebrow">Departments</p>
            <h2 className="mt-4 font-serif text-4xl md:text-5xl">
              How the house is structured.
            </h2>
          </div>
          <Link
            to="/departments"
            className="border border-foreground px-6 py-3 text-xs font-medium uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background"
          >
            All departments
          </Link>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.slice(0, 6).map((d) => (
            <Link
              key={d.slug}
              to="/departments/$slug"
              params={{ slug: d.slug }}
              className="group block border border-border bg-card"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={d.image}
                  alt={d.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-6">
                <p className="text-[0.65rem] uppercase tracking-[0.22em] text-teal">
                  {d.pillar}
                </p>
                <h3 className="mt-2 font-serif text-2xl">{d.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {d.vision}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Verse + image */}
      <section className="container-editorial grid gap-12 py-16 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <img
            src={podiumWoman}
            alt="Minister at the pulpit of Throne Room of God Kingdom Center"
            className="w-full object-cover shadow-editorial"
          />
        </div>
        <blockquote className="md:col-span-5">
          <p className="font-serif text-3xl leading-snug text-foreground md:text-4xl">
            <span className="text-gold">“</span>
            Go therefore and make disciples of all nations, baptising them in
            the name of the Father, and of the Son, and of the Holy Spirit.
            <span className="text-gold">”</span>
          </p>
          <footer className="mt-6 text-sm uppercase tracking-widest text-muted-foreground">
            — Matthew 28:19
          </footer>
        </blockquote>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-ink text-cream">
        <div className="container-editorial py-28 text-center">
          <p className="eyebrow text-gold">Come home to the house</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl leading-tight md:text-5xl">
            There is a seat, a covering and an assignment for you.
          </h2>
          <Link
            to="/contact"
            className="mt-10 inline-block border border-gold bg-gold px-8 py-4 text-xs font-medium uppercase tracking-widest text-ink transition-colors hover:bg-transparent hover:text-gold"
          >
            Plan your visit →
          </Link>
        </div>
      </section>
    </>
  );
}
