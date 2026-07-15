import { createFileRoute, Link } from "@tanstack/react-router";
import bibleImage from "@/assets/bible-candle.jpg";

export const sermons = [
  {
    slug: "the-slow-work-of-god",
    title: "The Slow Work of God",
    speaker: "Rev. Miriam Hollis",
    date: "July 6, 2026",
    scripture: "Isaiah 55:8–13",
    excerpt: "On patience, on trusting the growing thing you cannot yet see, and on why the kingdom of God tends to arrive on foot.",
    body: [
      "It is often the same hands that plant a seed and never see the tree. The prophet Isaiah, writing to a people in exile, speaks of God's word as rain that soaks the earth and returns not empty. It is a slow image — nothing quick about rain.",
      "We live in an age of the immediate: the same-day, the overnight, the notification-now. And yet the deepest goods of a human life — love, wisdom, forgiveness, faith — all of them arrive slowly, over years, over decades, sometimes over generations.",
      "This morning, I want to invite us to consider our own impatience — with God, with each other, with ourselves — and to consider instead the long, quiet work God is already doing, right here, in this ordinary room, on this ordinary Sunday.",
    ],
  },
  {
    slug: "a-table-wide-enough",
    title: "A Table Wide Enough",
    speaker: "Rev. Miriam Hollis",
    date: "June 29, 2026",
    scripture: "Luke 14:15–24",
    excerpt: "The parable of the great banquet, and what it means to be a church whose table has more chairs than it needs.",
    body: [
      "In Luke's gospel, a man throws a great feast and finds his invited guests too busy to attend. So he sends his servants out — first to the streets of the city, then to the roads and countryside — until every seat is filled.",
      "This is a strange and beautiful vision of God's kingdom: not a members-only club, but a house of open doors, of extra chairs pulled up, of latecomers made welcome.",
      "What would it mean for us — for this church, on this street — to be that kind of table?",
    ],
  },
  {
    slug: "on-mercy-in-small-doses",
    title: "On Mercy, in Small Doses",
    speaker: "Daniel Osei",
    date: "June 22, 2026",
    scripture: "Micah 6:6–8",
    excerpt: "Justice, mercy, humility. Not as grand gestures, but as the daily grammar of a faithful life.",
    body: [
      "The prophet Micah famously asks what the Lord requires of us. His answer is disarmingly small: to do justice, to love mercy, and to walk humbly with your God.",
      "Notice: not to change the world overnight. Not to solve every injustice. Just — to do justice today. To love mercy today. To walk, humbly, today.",
      "The Christian life is not built out of heroic moments. It is built out of small, faithful, unglamorous choices, repeated across a lifetime.",
    ],
  },
  {
    slug: "the-god-who-listens",
    title: "The God Who Listens",
    speaker: "Rev. Miriam Hollis",
    date: "June 15, 2026",
    scripture: "Psalm 34",
    excerpt: "A meditation on the psalms of complaint, and the strange freedom of a God who welcomes our honesty.",
    body: [
      "The psalms teach us that we can bring anything to God — our joy, our doubt, our anger, our grief. Nothing is too small or too dark for that conversation.",
      "Psalm 34 sings that the Lord is near to the brokenhearted, and saves the crushed in spirit. It is a psalm for the days when praise comes easily, and for the days when it does not.",
    ],
  },
];

export const Route = createFileRoute("/sermons")({
  head: () => ({
    meta: [
      { title: "Sermons & Reflections — Throne Room of God Kingdom Center" },
      { name: "description", content: "Recent sermons, reflections, and readings from Throne Room of God Kingdom Center." },
      { property: "og:title", content: "Sermons & Reflections — Throne Room of God Kingdom Center" },
      { property: "og:description", content: "Recent sermons and reflections from our pulpit." },
    ],
  }),
  component: Sermons,
});

function Sermons() {
  const [featured, ...rest] = sermons;

  return (
    <>
      <section className="container-editorial pb-8 pt-24 md:pt-32">
        <p className="eyebrow">Sermons & reflections</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight md:text-7xl">
          A pulpit, a quiet room, and <em className="text-terracotta">something worth saying</em>.
        </h1>
      </section>

      {/* Featured */}
      <section className="container-editorial pb-20 pt-12">
        <Link
          to="/sermons/$slug"
          params={{ slug: featured.slug }}
          className="group grid gap-10 md:grid-cols-12"
        >
          <div className="md:col-span-7">
            <img
              src={bibleImage}
              alt="Open Bible and lit candle"
              width={1400}
              height={1000}
              loading="lazy"
              className="w-full object-cover shadow-editorial transition-transform duration-500 group-hover:scale-[1.01]"
            />
          </div>
          <div className="flex flex-col justify-center md:col-span-5">
            <p className="eyebrow">Latest sermon · {featured.date}</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              {featured.title}
            </h2>
            <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
              {featured.speaker} · {featured.scripture}
            </p>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              {featured.excerpt}
            </p>
            <span className="mt-8 inline-flex items-center gap-3 text-sm font-medium">
              <span className="rule-brass" />
              <span className="tracking-wide">Read the sermon</span>
            </span>
          </div>
        </Link>
      </section>

      {/* Archive */}
      <section className="border-t border-border">
        <div className="container-editorial py-20">
          <p className="eyebrow mb-10">Recent</p>
          <ul className="divide-y divide-border border-y border-border">
            {rest.map((s) => (
              <li key={s.slug}>
                <Link
                  to="/sermons/$slug"
                  params={{ slug: s.slug }}
                  className="group grid gap-6 py-10 md:grid-cols-12"
                >
                  <div className="md:col-span-3">
                    <p className="text-xs uppercase tracking-widest text-brass">{s.date}</p>
                    <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{s.speaker}</p>
                  </div>
                  <div className="md:col-span-9">
                    <h3 className="font-serif text-3xl transition-colors group-hover:text-terracotta">{s.title}</h3>
                    <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{s.scripture}</p>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{s.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
