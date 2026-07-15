import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { sermons } from "./sermons";

export const Route = createFileRoute("/sermons/$slug")({
  loader: ({ params }) => {
    const sermon = sermons.find((s) => s.slug === params.slug);
    if (!sermon) throw notFound();
    return { sermon };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Sermon not found — Throne Room of God Kingdom Center" }, { name: "robots", content: "noindex" }] };
    }
    const { sermon } = loaderData;
    return {
      meta: [
        { title: `${sermon.title} — Throne Room of God Kingdom Center` },
        { name: "description", content: sermon.excerpt },
        { property: "og:title", content: sermon.title },
        { property: "og:description", content: sermon.excerpt },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: sermon.date },
        { property: "article:author", content: sermon.speaker },
      ],
    };
  },
  component: SermonPage,
  notFoundComponent: SermonNotFound,
});

function SermonPage() {
  const { sermon } = Route.useLoaderData();

  return (
    <article className="container-editorial max-w-3xl py-24 md:py-32">
      <Link to="/sermons" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← All sermons
      </Link>

      <header className="mt-10 border-b border-border pb-10">
        <p className="eyebrow">{sermon.date}</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight md:text-6xl">{sermon.title}</h1>
        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          {sermon.speaker} · {sermon.scripture}
        </p>
      </header>

      <div className="mt-12 space-y-8">
        <p className="font-serif text-2xl leading-relaxed text-foreground first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-7xl first-letter:leading-[0.85] first-letter:text-terracotta">
          {sermon.body[0]}
        </p>
        {sermon.body.slice(1).map((p: string, i: number) => (
          <p key={i} className="text-base leading-loose text-muted-foreground">{p}</p>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Preached at Throne Room of God Kingdom Center · Cedar Hollow, Oregon
        </p>
      </footer>
    </article>
  );
}

function SermonNotFound() {
  return (
    <div className="container-editorial py-32 text-center">
      <h1 className="font-serif text-4xl">Sermon not found</h1>
      <Link to="/sermons" className="mt-6 inline-block text-sm underline">Back to all sermons</Link>
    </div>
  );
}
