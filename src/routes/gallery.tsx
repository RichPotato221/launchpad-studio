import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/hero-sanctuary.jpg";
import communityImage from "@/assets/community.jpg";
import bibleImage from "@/assets/bible-candle.jpg";
import choirImage from "@/assets/choir.jpg";
import kidsImage from "@/assets/kids.jpg";
import exteriorImage from "@/assets/exterior.jpg";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Grace Chapel" },
      { name: "description", content: "A visual glimpse of life at Grace Chapel — Sunday mornings, gatherings, and the little moments in between." },
      { property: "og:title", content: "Gallery — Grace Chapel" },
      { property: "og:description", content: "Moments from life at Grace Chapel." },
    ],
  }),
  component: Gallery,
});

const items = [
  { src: heroImage, alt: "Sanctuary morning light", cap: "Morning light, sanctuary", w: 1920, h: 1280, span: "md:col-span-8 md:row-span-2" },
  { src: exteriorImage, alt: "Chapel exterior at dusk", cap: "The red door at dusk", w: 1400, h: 1000, span: "md:col-span-4" },
  { src: kidsImage, alt: "Sunday school", cap: "Kids' Church, storytime", w: 1400, h: 1000, span: "md:col-span-4" },
  { src: choirImage, alt: "Choir in warm light", cap: "Evening choir practice", w: 1400, h: 1000, span: "md:col-span-6" },
  { src: bibleImage, alt: "Open Bible and candle", cap: "The lectern before service", w: 1400, h: 1000, span: "md:col-span-6" },
  { src: communityImage, alt: "Community gathered after service", cap: "Coffee hour, first Sunday of summer", w: 1600, h: 1100, span: "md:col-span-12" },
];

function Gallery() {
  return (
    <>
      <section className="container-editorial pb-16 pt-24 md:pt-32">
        <p className="eyebrow">Gallery</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          Ordinary Sundays, <em className="text-terracotta">quietly beautiful</em>.
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground">
          A small archive of moments from our life together — services,
          suppers, and the everyday holy in between.
        </p>
      </section>

      <section className="container-editorial pb-24">
        <div className="grid gap-4 md:grid-cols-12 md:auto-rows-[260px]">
          {items.map((it, i) => (
            <figure key={i} className={`group relative overflow-hidden ${it.span}`}>
              <img
                src={it.src}
                alt={it.alt}
                width={it.w}
                height={it.h}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-5">
                <p className="text-xs uppercase tracking-widest text-cream">{it.cap}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
