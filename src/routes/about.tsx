import { createFileRoute } from "@tanstack/react-router";
import exteriorImage from "@/assets/exterior.jpg";
import communityImage from "@/assets/community.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Grace Chapel" },
      { name: "description", content: "Our story, what we believe, and the people behind Grace Chapel in Cedar Hollow." },
      { property: "og:title", content: "About Grace Chapel" },
      { property: "og:description", content: "Rooted in 1904, gathered today. Meet our community." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="container-editorial pb-8 pt-24 md:pt-32">
        <p className="eyebrow">About us</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          A little chapel with a <em className="text-terracotta">long, gentle story</em>.
        </h1>
      </section>

      <section className="container-editorial pb-20 pt-8">
        <img
          src={exteriorImage}
          alt="Grace Chapel exterior at dusk"
          width={1400}
          height={1000}
          loading="lazy"
          className="w-full object-cover shadow-editorial"
        />
      </section>

      <section className="container-editorial grid gap-16 pb-24 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="eyebrow">Our story</p>
        </div>
        <div className="space-y-6 text-base leading-loose text-muted-foreground md:col-span-8">
          <p className="font-serif text-2xl leading-relaxed text-foreground">
            Grace Chapel was raised in 1904 by a handful of families who wanted
            a quiet place to pray at the edge of a growing town.
          </p>
          <p>
            More than a century later, the town has grown, the chapel has been
            patched and painted and re-roofed a dozen times, and the pews still
            fill each Sunday with people from every walk of life — nurses and
            farmers, students and grandparents, newcomers and lifers.
          </p>
          <p>
            We're a small church by design. Small enough that the pastor knows
            your name, that a first-time visitor feels seen, and that
            hospitality doesn't need a committee.
          </p>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/50">
        <div className="container-editorial grid gap-16 py-24 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">What we believe</p>
            <h2 className="mt-4 font-serif text-4xl">Simple things, held dearly.</h2>
          </div>
          <div className="md:col-span-8">
            <dl className="divide-y divide-border">
              {[
                { t: "Scripture, read together", d: "We read the Bible slowly, in conversation with the church across ages and continents." },
                { t: "A table that's wide open", d: "Communion is offered every Sunday, to anyone who wishes to receive." },
                { t: "Prayer as a way of life", d: "Morning prayer, table graces, and quiet vigils shape the ordinary week." },
                { t: "Justice, kindly done", d: "We show up for our neighbors — with food, presence, and a willingness to listen." },
              ].map((v) => (
                <div key={v.t} className="grid gap-4 py-6 md:grid-cols-12">
                  <dt className="font-serif text-2xl md:col-span-5">{v.t}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:col-span-7">{v.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="container-editorial py-24">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow">Our people</p>
          <h2 className="mt-4 font-serif text-4xl">The ones who keep the lights on.</h2>
        </div>
        <div className="grid gap-10 md:grid-cols-3">
          {[
            { name: "Rev. Miriam Hollis", role: "Lead Pastor", bio: "Trained in Edinburgh, ordained in Portland. Loves sourdough, slow theology, and Sunday afternoon naps." },
            { name: "Daniel Osei", role: "Music Director", bio: "Choir, hymnody, and the very old organ. Believes singing together is its own kind of prayer." },
            { name: "Priya Balan", role: "Community Care", bio: "Coordinates the pantry, the meal train, and the hundred small ways we show up for each other." },
          ].map((p) => (
            <article key={p.name} className="border-t border-foreground pt-6">
              <h3 className="font-serif text-2xl">{p.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-widest text-brass">{p.role}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-editorial pb-24">
        <img
          src={communityImage}
          alt="Members of Grace Chapel gathered after service"
          width={1600}
          height={1100}
          loading="lazy"
          className="w-full object-cover shadow-editorial"
        />
      </section>
    </>
  );
}
