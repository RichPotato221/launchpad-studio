import { createFileRoute, Link } from "@tanstack/react-router";
import choirImage from "@/assets/choir.jpg";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Gatherings — Grace Chapel" },
      { name: "description", content: "Sunday and weekday services at Grace Chapel — times, what to expect, and how to plan your visit." },
      { property: "og:title", content: "Services & Gatherings — Grace Chapel" },
      { property: "og:description", content: "Sunday services, midweek prayer, and community gatherings." },
    ],
  }),
  component: Services,
});

function Services() {
  const services = [
    {
      day: "Sunday",
      time: "8:30 am",
      title: "Contemplative Service",
      length: "45 min",
      desc: "A quiet, candlelit service of scripture, silence, sung psalms, and communion. A gentle way to begin the week.",
    },
    {
      day: "Sunday",
      time: "10:00 am",
      title: "Family Worship",
      length: "70 min",
      desc: "Our main service — hymns and new songs, a sermon, prayers of the people, and the Lord's Table. Kids' Church runs alongside for ages 3–11.",
    },
    {
      day: "Wednesday",
      time: "6:30 pm",
      title: "Prayer & Compline",
      length: "30 min",
      desc: "A short, ancient office of night prayer in the side chapel. Come as you are — straight from work if you need to.",
    },
    {
      day: "First Friday",
      time: "7:00 pm",
      title: "Table Supper",
      length: "2 hrs",
      desc: "A shared meal, a passage, and unhurried conversation. Bring a dish if you can, and yourself if you can't.",
    },
  ];

  return (
    <>
      <section className="container-editorial pb-16 pt-24 md:pt-32">
        <p className="eyebrow">Services & gatherings</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          Come and see.<br />
          <em className="text-terracotta">Stay for coffee.</em>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground">
          Every gathering at Grace Chapel is open — no membership, no dress
          code, no expectation. Here's what a week with us looks like.
        </p>
      </section>

      <section className="container-editorial pb-24">
        <img
          src={choirImage}
          alt="Grace Chapel choir singing in warm stage light"
          width={1400}
          height={1000}
          loading="lazy"
          className="w-full object-cover shadow-editorial"
        />
      </section>

      <section className="container-editorial pb-24">
        <ul className="divide-y divide-border border-y border-border">
          {services.map((s) => (
            <li key={s.title} className="grid gap-6 py-10 md:grid-cols-12">
              <div className="md:col-span-3">
                <p className="text-xs uppercase tracking-widest text-brass">{s.day}</p>
                <p className="mt-2 font-serif text-3xl">{s.time}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.length}</p>
              </div>
              <div className="md:col-span-9">
                <h2 className="font-serif text-3xl">{s.title}</h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-secondary/50">
        <div className="container-editorial grid gap-16 py-24 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow">Planning your visit</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight">What to expect on your first Sunday.</h2>
          </div>
          <div className="space-y-8 md:col-span-7">
            {[
              { t: "Just arrive.", d: "There's parking on Willow Street and along the side lot. A greeter will meet you at the red door." },
              { t: "Wear what feels like you.", d: "Some folks come in cardigans, some in overalls. It's all fine." },
              { t: "Kids are welcome everywhere.", d: "Kids' Church runs during the 10:00 service; wiggly kids in the main sanctuary are also very welcome." },
              { t: "Stay for coffee.", d: "We linger in the hall afterward — this is often the best part of the morning." },
            ].map((i, idx) => (
              <div key={i.t} className="flex gap-6">
                <p className="font-serif text-2xl text-brass">{String(idx + 1).padStart(2, "0")}</p>
                <div>
                  <h3 className="font-serif text-xl">{i.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-editorial py-24 text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-4xl leading-tight">Have a question before Sunday?</h2>
        <Link
          to="/contact"
          className="mt-8 inline-block border border-foreground bg-foreground px-8 py-4 text-xs font-medium uppercase tracking-widest text-background transition-colors hover:bg-transparent hover:text-foreground"
        >
          Get in touch
        </Link>
      </section>
    </>
  );
}
