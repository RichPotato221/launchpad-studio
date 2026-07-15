import { createFileRoute, Link } from "@tanstack/react-router";
import preaching from "@/assets/preaching.jpg";
import sermonSeat from "@/assets/sermon-seat.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Vision — Throne Room of God Kingdom Center" },
      {
        name: "description",
        content:
          "The vision, mission, core values and governance of Throne Room of God Kingdom Center under the leadership of the Senior Apostle.",
      },
      { property: "og:title", content: "About Throne Room of God Kingdom Center" },
      {
        property: "og:description",
        content: "Vision, mission, core values and apostolic governance.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="container-editorial pb-16 pt-24 md:pt-32">
        <p className="eyebrow">About the house</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          One vision. One mission. <em className="text-teal">One house.</em>
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Throne Room of God Kingdom Center (TRoGKC) is an autonomous local
          church under the headship of Jesus Christ and the leadership of the
          Senior Apostle. Every ministry, department and ambassador of the
          house is aligned to what the Lord has spoken.
        </p>
      </section>

      <section className="border-y border-border/60 bg-secondary/50">
        <div className="container-editorial grid gap-12 py-20 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow">Vision</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl">
              The word of the Lord over TRoGKC.
            </h2>
          </div>
          <blockquote className="md:col-span-7">
            <p className="font-serif text-2xl leading-snug text-foreground md:text-3xl">
              “Our vision is to doctrinally equip the saints in alignment with
              the biblical standards of God's Kingdom, forming a Christ-centred
              nature and culture that reflects the character of our Lord Jesus
              Christ. We are committed to establishing strong apostolic
              foundations that effectively resource and steward Kingdom
              assignments for global impact, while restoring integrity and
              purity within the prophetic ministry.”
            </p>
          </blockquote>
        </div>
      </section>

      <section className="container-editorial grid gap-12 py-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow">Mission</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">
            Five commitments of the house.
          </h2>
        </div>
        <ol className="md:col-span-7 space-y-6">
          {[
            "Consistently teach and mature believers in the biblical doctrines of the Christian faith.",
            "Intentionally model and cultivate a life that reflects Christ-centeredness.",
            "Provide training and development for leaders and ministers called for Kingdom purposes.",
            "Commission fully equipped ambassadors and establish Kingdom Centres for global assignments.",
            "Bring clarity, order and distinction to prophetic expressions within the Body of Christ.",
          ].map((m, i) => (
            <li key={i} className="flex gap-6 border-t border-border pt-6">
              <span className="font-serif text-3xl text-gold">0{i + 1}</span>
              <p className="text-base leading-relaxed text-foreground">{m}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Image band */}
      <section className="container-editorial grid gap-6 pb-20 md:grid-cols-2">
        <img src={preaching} alt="Senior Apostle preaching the Word" className="h-full w-full object-cover" />
        <img src={sermonSeat} alt="Ministering under the Word — Matthew 28:19–20" className="h-full w-full object-cover" />
      </section>

      {/* Core values */}
      <section className="border-y border-border/60 bg-secondary/50">
        <div className="container-editorial py-20">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Core values</p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl">
              What shapes our culture and conduct.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              ["Christ-Centeredness", "Jesus Christ is the centre of all doctrine, worship, leadership and ministry."],
              ["Biblical Authority", "The Holy Scriptures are the final authority in faith, governance and moral conduct."],
              ["Prayer", "Our primary source of spiritual power, wisdom and direction."],
              ["Holiness", "Pursued through obedience to God's Word and the transforming work of the Holy Spirit."],
              ["Love", "Agape love shapes all relationships and ministry."],
              ["Excellence", "We honour God by serving with excellence and intentional stewardship."],
            ].map(([t, d]) => (
              <div key={t} className="border-t border-foreground pt-5">
                <h3 className="font-serif text-xl">{t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="container-editorial grid gap-12 py-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow">Governance</p>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl">
            Under the headship of <em className="text-teal">Christ</em>.
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Jesus Christ is the supreme head of TRoGKC. Under His authority the
            Senior Apostle (also serving as Senior Pastor) stewards vision,
            doctrine and strategic direction — and all Department Chairs
            operate directly under this office.
          </p>
        </div>
        <div className="md:col-span-7">
          <pre className="overflow-x-auto whitespace-pre border border-border bg-card p-6 text-xs leading-relaxed text-foreground">
{`                    ┌───────────────────────────┐
                    │      JESUS CHRIST          │
                    │   Head of the Church       │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  SENIOR APOSTLE / PASTOR   │
                    │  Vision · Doctrine · Direction │
                    └─────┬───────────────┬──────┘
                          │               │
              ┌───────────▼──┐      ┌─────▼──────────┐
              │  Associate    │      │  Department    │
              │  Pastors      │      │  Chairpersons  │
              └───────┬───────┘      └─────┬──────────┘
                      │                    │
                      ▼                    ▼
              Portfolio Teams        Ministry Teams
                                    (Worship, Discipleship,
                                     Outreach, Media, Youth,
                                     Finance, School of Ministry)`}
          </pre>
          <p className="mt-4 text-xs text-muted-foreground">
            No external apostolic council or deacon board governs this house;
            the church operates as an autonomous local body under Christ.
          </p>
        </div>
      </section>

      {/* Manuals CTA */}
      <section className="border-t border-border/60 bg-ink text-cream">
        <div className="container-editorial py-20 text-center">
          <p className="eyebrow text-gold">Governance library</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl md:text-4xl">
            Download the constitution and manuals.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              ["Constitution", "/manuals/1_Apostolic_Constitution.docx"],
              ["Governance Manual", "/manuals/2_Governance_Manual.docx"],
              ["Ministry Operations", "/manuals/3_Ministry_Operations_Manual.docx"],
              ["Finance Manual", "/manuals/4_Finance_Manual.docx"],
              ["KPI Manual", "/manuals/5_KPI_Manual.docx"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="border border-cream/60 px-5 py-3 text-xs font-medium uppercase tracking-widest text-cream hover:bg-cream/10"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="mt-10">
            <Link
              to="/departments"
              className="text-xs uppercase tracking-widest text-gold hover:text-cream"
            >
              Explore the departments →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
