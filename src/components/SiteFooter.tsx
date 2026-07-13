import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="container-editorial grid gap-12 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-baseline gap-2 font-serif text-2xl">
            <span className="text-brass">✦</span>
            <span>Grace Chapel</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A place of quiet welcome. Rooted in scripture, gathered in song,
            sent in love — for our neighborhood and beyond.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4">Visit</p>
          <address className="not-italic text-sm leading-relaxed text-muted-foreground">
            142 Willow Street<br />
            Cedar Hollow, OR 97401<br />
            (541) 555-0142
          </address>
        </div>

        <div>
          <p className="eyebrow mb-4">Sundays</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>8:30 — Contemplative</li>
            <li>10:00 — Family Service</li>
            <li>Wed 6:30 — Prayer</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container-editorial flex flex-col items-start justify-between gap-3 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Grace Chapel. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/sermons" className="hover:text-foreground">Sermons</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
