import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero-sanctuary.jpg";
import communityImage from "@/assets/community.jpg";
import bibleImage from "@/assets/bible-candle.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroImage}
            alt="Sunlight through stained glass in the Grace Chapel sanctuary"
            width={1920}
            height={1280}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/85" />
        </div>

        <div className="container-editorial flex min-h-[92vh] flex-col justify-end pb-20 pt-32 text-cream">
          <p className="eyebrow text-brass">Est. 1904 · Cedar Hollow</p>
          <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
            A quiet welcome, an open door, a shared table.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-cream/85">
            Grace Chapel is a small, warm-hearted church gathering weekly in
            song, scripture, and service. Whoever you are, wherever you've
            been — there is a seat here for you.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/services"
              className="border border-cream bg-cream px-7 py-3.5 text-xs font-medium uppercase tracking-widest text-ink transition-colors hover:bg-transparent hover:text-cream"
            >
              Plan a visit
            </Link>
            <Link
              to="/sermons"
              className="border border-cream/60 px-7 py-3.5 text-xs font-medium uppercase tracking-widest text-cream transition-colors hover:bg-cream/10"
            >
              Listen to sermons
            </Link>
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section className="container-editorial grid gap-16 py-28 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow">A word of welcome</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
            <em className="text-terracotta">Come as you are.</em>{" "}
            Stay as long as you'd like.
          </h2>
        </div>
        <div className="space-y-6 text-base leading-loose text-muted-foreground md:col-span-6 md:col-start-7">
          <p>
            For over a century, our little chapel on Willow Street has been a
            gathering place for pilgrims, seekers, doubters, and old friends
            alike. We believe faith is a slow, honest conversation — one worth
            having together.
          </p>
          <p>
            Whether this is your first Sunday in years or your first Sunday
            ever, we're glad you're considering us. There is coffee. There
            are hymns. There is time to think, and time to be still.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-3 text-sm font-medium text-foreground"
          >
            <span className="rule-brass" />
            <span className="tracking-wide">Read our story</span>
          </Link>
        </div>
      </section>

      {/* Rhythms — three pillars */}
      <section className="border-y border-border/60 bg-secondary/50">
        <div className="container-editorial py-24">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow">Our rhythms</p>
            <h2 className="mt-4 font-serif text-4xl md:text-5xl">
              Gather. Grow. Give.
            </h2>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { n: "01", t: "Worship together", d: "Sunday mornings we gather with candles, scripture, hymns old and new, and a table set for anyone who's hungry.", link: "/services" },
              { n: "02", t: "Grow in community", d: "Midweek circles, kids' Sunday school, prayer suppers, and unhurried conversations over shared meals.", link: "/about" },
              { n: "03", t: "Serve our neighbors", d: "A community pantry, a hospital chaplaincy, and a garden that grows for the food bank down the road.", link: "/contact" },
            ].map((c) => (
              <div key={c.n} className="border-t border-foreground pt-6">
                <p className="font-serif text-2xl text-brass">{c.n}</p>
                <h3 className="mt-6 font-serif text-2xl">{c.t}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                <Link to={c.link} className="mt-6 inline-block text-xs font-medium uppercase tracking-widest text-foreground">
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image + verse */}
      <section className="container-editorial grid gap-12 py-28 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <img
            src={communityImage}
            alt="Church community gathered outdoors after Sunday service"
            width={1600}
            height={1100}
            loading="lazy"
            className="w-full object-cover shadow-editorial"
          />
        </div>
        <blockquote className="md:col-span-5">
          <p className="font-serif text-3xl leading-snug text-foreground md:text-4xl">
            <span className="text-brass">“</span>
            For where two or three are gathered in my name, there am I among them.
            <span className="text-brass">”</span>
          </p>
          <footer className="mt-6 text-sm uppercase tracking-widest text-muted-foreground">
            — Matthew 18:20
          </footer>
        </blockquote>
      </section>

      {/* This week */}
      <section className="border-y border-border/60">
        <div className="container-editorial grid gap-12 py-24 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">This week</p>
            <h2 className="mt-4 font-serif text-4xl">Come sit with us</h2>
          </div>
          <ul className="divide-y divide-border md:col-span-8">
            {[
              { day: "Sunday", time: "8:30 am", title: "Contemplative Service", place: "Sanctuary" },
              { day: "Sunday", time: "10:00 am", title: "Family Worship + Kids' Church", place: "Sanctuary & Hall" },
              { day: "Wednesday", time: "6:30 pm", title: "Prayer & Compline", place: "Chapel" },
              { day: "Saturday", time: "9:00 am", title: "Community Garden", place: "Willow St. lot" },
            ].map((e) => (
              <li key={e.day + e.time + e.title} className="grid grid-cols-12 gap-4 py-6">
                <div className="col-span-4 md:col-span-3">
                  <p className="text-xs uppercase tracking-widest text-brass">{e.day}</p>
                  <p className="mt-1 font-serif text-xl">{e.time}</p>
                </div>
                <div className="col-span-8 md:col-span-9">
                  <p className="font-serif text-xl">{e.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{e.place}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={bibleImage} alt="" width={1400} height={1000} loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink/80" />
        </div>
        <div className="container-editorial py-28 text-center text-cream">
          <p className="eyebrow text-brass">Visiting on Sunday?</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl leading-tight md:text-5xl">
            We'll save you a seat, a bulletin, and the good coffee.
          </h2>
          <Link
            to="/contact"
            className="mt-10 inline-block border border-cream bg-cream px-8 py-4 text-xs font-medium uppercase tracking-widest text-ink transition-colors hover:bg-transparent hover:text-cream"
          >
            Say hello →
          </Link>
        </div>
      </section>
    </>
  );
}
