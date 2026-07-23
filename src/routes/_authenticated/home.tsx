import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchDepartments, fetchSetting } from "@/lib/portal";
import { Card } from "@/components/ui/card";
import { PORTAL_IMAGES, DEPARTMENT_HERO } from "@/lib/portalImages";


export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — TRoGKC Portal" }] }),
  component: HomePage,
});

function HomePage() {
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const theme = useQuery({ queryKey: ["setting", "theme_of_year"], queryFn: () => fetchSetting("theme_of_year") });
  const church = useQuery({ queryKey: ["setting", "church_info"], queryFn: () => fetchSetting("church_info") });
  const apostle = useQuery({ queryKey: ["setting", "senior_apostle"], queryFn: () => fetchSetting("senior_apostle") });

  const info = (church.data?.value ?? {}) as { vision?: string; mission?: string[]; founding_date?: string };
  const themeV = (theme.data?.value ?? {}) as { year?: number; title?: string; description?: string };
  const apostleV = (apostle.data?.value ?? {}) as { name?: string; bio?: string; photo_url?: string };

  const functional = depts.data?.filter((d) => d.kind === "functional") ?? [];
  const developmental = depts.data?.filter((d) => d.kind === "developmental") ?? [];
  const mountains = depts.data?.filter((d) => d.kind === "seven_mountain") ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      {/* 2026 Marching Orders banner */}
      <section className="mb-8 overflow-hidden rounded-lg border border-border bg-muted">
        <img
          src={PORTAL_IMAGES.marchingOrdersBanner}
          alt="2026 Marching Orders — Intimacy, Identity, Purpose"
          className="mx-auto max-h-[36rem] w-full object-contain"
        />
      </section>

      {/* Vision */}
      <section className="rounded-lg border border-border bg-card p-6 md:p-10">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Our Vision</p>
        <p className="mt-4 font-serif text-xl leading-relaxed md:text-2xl">{info.vision}</p>
      </section>


      {/* Mission */}
      <section className="mt-6 rounded-lg border border-border bg-card p-6 md:p-10">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Our Mission</p>
        <ol className="mt-4 space-y-3">
          {(info.mission ?? []).map((m, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-serif text-2xl text-teal-600">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm leading-relaxed md:text-base">{m}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Theme + Apostle */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-foreground p-6 text-background md:p-10">
          <p className="text-xs uppercase tracking-[0.22em] opacity-70">Theme for {themeV.year ?? new Date().getFullYear()}</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{themeV.title}</h2>
          <p className="mt-4 text-sm opacity-80">{themeV.description}</p>
        </section>
        <section className="overflow-hidden rounded-lg border border-border bg-card md:p-0">
          <div className="grid grid-cols-2">
            <div>
              <div className="bg-muted">
                <img
                  src={PORTAL_IMAGES.seniorPastor}
                  alt="Senior Pastor ministering during Sunday service"
                  className="mx-auto h-96 w-full object-cover object-top"
                />
              </div>
              <div className="p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Senior Pastor</p>
                {apostleV.name ? (
                  <>
                    <h3 className="mt-3 font-serif text-2xl">{apostleV.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{apostleV.bio}</p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Not yet set. Ask the Church Secretary to complete this from the <Link to="/admin" className="underline">Admin</Link> area.
                  </p>
                )}
              </div>
            </div>
            <div>
              <div className="bg-muted">
                <img
                  src={PORTAL_IMAGES.sevenMountainsFemale}
                  alt="Senior Pastor ministering during Sunday service"
                  className="mx-auto h-96 w-full object-cover object-top"
                />
              </div>
              <div className="p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Senior Pastor</p>
                <h3 className="mt-3 font-serif text-2xl">Prophetess Ntombikayise Mnyandu</h3>
              </div>
            </div>
          </div>
          {info.founding_date && (
            <p className="p-6 pt-0 text-xs uppercase tracking-widest text-muted-foreground md:px-8">
              Founded {info.founding_date}
            </p>
          )}
        </section>

      </div>

      {/* Org structure */}
      <section className="mt-6 rounded-lg border border-border bg-card p-6 md:p-10">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Organisational Structure</p>
        <h2 className="mt-2 font-serif text-3xl">Governance flow</h2>
        <div className="mt-8 space-y-3">
          <FlowBox title="Jesus Christ" subtitle="Chief Cornerstone" emphasis />
          <FlowConnector />
          <FlowBox title=" Senior Pastors" />
          <FlowConnector />
          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <FlowBox title="Governmental Structure" compact />
              <FlowSubList
                items={[
                  "Chairperson",
                  "Finance & Admin",
                  "Strategic Advisor",
                  "Resource Admin",
                  "Church Secretary",
                  "Assistant / Associate Pastors",
                  "Elders",
                ]}
              />
            </div>
            <div>
              <FlowBox title="Functional Structure" compact />
            </div>
            <div>
              <FlowBox title="Developmental Structure" compact />
            </div>
            <div>
              <FlowBox title="Support Services" compact />
            </div>
            <div>
              <div>
              <FlowBox title="TSOM" compact />
              <FlowConnector />
              <FlowBox title="Dean" compact />
              <FlowConnector />
              <FlowBox title="Principal" compact />
              <FlowConnector />
              <div className="mt-3 grid gap-3">
                  <FlowConnector />
                <FlowBox title="Discipleship + TithemiSOM" compact />
                    <FlowConnector />
                  <FlowBox title="7 Mountains" compact />
                  <FlowSubList
                    items={[
                      "Religion mountain →",
                      "Five-Fold Ministry",
                    ]}
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>


      {/* Department tiles */}
      <DeptGroup title="Functional Structure" items={functional} />
      <DeptGroup title="Developmental Structure" items={developmental} />
      <DeptGroup title="Seven Mountains" items={mountains} basePath="/departments" />
    </div>
  );
}

function FlowBox({
  title,
  subtitle,
  compact,
  emphasis,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`mx-auto rounded-lg border text-center shadow-sm ${
        emphasis ? "border-teal-600 bg-teal-50" : "border-border bg-card"
      } ${compact ? "max-w-xs px-4 py-3" : "max-w-sm px-6 py-4"}`}
    >
      <p className={`font-serif ${compact ? "text-base" : "text-lg"}`}>{title}</p>
      {subtitle && (
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function FlowConnector() {
  return <div className="mx-auto h-6 w-px bg-border" />;
}

function FlowSubList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1 text-center text-xs text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function DeptGroup({ title, items, basePath = "/departments" }: {
  title: string;
  items: { slug: string; name: string; scripture: string | null }[];
  basePath?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">{title}</h2>
        <Link to="/departments" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">All departments →</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((d) => {
          const hero = DEPARTMENT_HERO[d.slug];
          return (
            <Link key={d.slug} to={`${basePath}/$slug`} params={{ slug: d.slug }}>
              <Card className="overflow-hidden p-0 transition hover:border-foreground">
                {hero ? (
                  <div className="flex h-56 w-full items-center justify-center bg-muted">
                    <img src={hero.src} alt={hero.alt} className="h-full w-full object-cover object-top" />
                  </div>
                ) : (
                  <div className="h-56 w-full bg-muted" />
                )}
                <div className="p-4">
                  <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{d.scripture}</p>
                  <p className="mt-2 font-serif text-lg">{d.name}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

