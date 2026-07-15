import { createFileRoute } from "@tanstack/react-router";
import ringsFamily from "@/assets/rings-family.jpg";
import leaderSuit from "@/assets/leader-suit.jpg";
import leaderVest from "@/assets/leader-vest.jpg";
import { SEVEN_MOUNTAINS, MANUALS } from "@/lib/departments";

export const Route = createFileRoute("/seven-mountains")({
  head: () => ({
    meta: [
      { title: "Seven Mountains — Throne Room of God Kingdom Center" },
      {
        name: "description",
        content:
          "TRoGKC engages the seven mountains of society — Religion, Family, Education, Government, Media, Arts, and Business — for God's Kingdom.",
      },
      { property: "og:title", content: "Seven Mountains — TRoGKC" },
      {
        property: "og:description",
        content: "Kingdom ambassadors across the seven spheres of society.",
      },
    ],
  }),
  component: SevenMountains,
});

function SevenMountains() {
  return (
    <>
      <section className="container-editorial pb-16 pt-24 md:pt-32">
        <p className="eyebrow">Seven mountains</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          Ambassadors on <em className="text-teal">every mountain</em>.
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          TRoGKC embraces the vision of influencing the seven spheres of
          society for God's Kingdom. Every ambassador of the house is
          released to engage their mountain with integrity, excellence and a
          Christ-centred distinction.
        </p>
      </section>

      {/* Feature ambassadors — marketplace couple */}
      <section className="container-editorial grid gap-6 pb-16 md:grid-cols-3">
        <img src={leaderSuit} alt="Marketplace ambassador — Business mountain" className="w-full object-cover" />
        <img src={leaderVest} alt="Marketplace ambassador — Business mountain" className="w-full object-cover" />
        <img src={ringsFamily} alt="Kingdom marriage — Family mountain" className="w-full object-cover" />
      </section>

      <section className="container-editorial pb-16">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Above: ambassadors from the house standing in the Business and Family
          mountains — a picture of Kingdom identity carried into every sphere.
        </p>
      </section>

      {/* The seven */}
      <section className="border-y border-border/60 bg-secondary/50">
        <div className="container-editorial py-20">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">The seven</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl">
              Where the house sends its ambassadors.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SEVEN_MOUNTAINS.map((m, i) => (
              <div key={m.key} className="border-t border-foreground pt-5">
                <p className="font-serif text-2xl text-gold">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-serif text-2xl">{m.name}</h3>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.22em] text-teal">
                  {m.verse}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {m.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manuals */}
      <section className="border-t border-border/60 bg-ink text-cream">
        <div className="container-editorial py-20">
          <p className="eyebrow text-gold">Governance library</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">
            Equip your mountain — download the manuals.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(MANUALS).map(([key, m]) => (
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
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
