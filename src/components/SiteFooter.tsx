import { Link } from "@tanstack/react-router";
import logo from "@/assets/trog-logo.png";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="container-editorial grid gap-12 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Throne Room of God Kingdom Center logo"
              width={868}
              height={540}
              className="h-12 w-auto"
            />
            <div className="font-serif text-lg leading-tight">
              Throne Room of God
              <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                Kingdom Center
              </span>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Doctrinally equipping the saints — forming a Christ-centred nature
            and culture, establishing strong apostolic foundations for Kingdom
            impact across the globe.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-teal">
            2026 · Intimacy · Identity · Purpose
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About &amp; Vision</Link></li>
            <li><Link to="/departments" className="hover:text-foreground">Departments</Link></li>
            <li><Link to="/seven-mountains" className="hover:text-foreground">Seven Mountains</Link></li>
            
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Governance manuals</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground" href="/manuals/1_Apostolic_Constitution.docx">Constitution</a></li>
            <li><a className="hover:text-foreground" href="/manuals/2_Governance_Manual.docx">Governance Manual</a></li>
            <li><a className="hover:text-foreground" href="/manuals/3_Ministry_Operations_Manual.docx">Ministry Operations</a></li>
            <li><a className="hover:text-foreground" href="/manuals/4_Finance_Manual.docx">Finance Manual</a></li>
            <li><a className="hover:text-foreground" href="/manuals/5_KPI_Manual.docx">KPI Manual</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container-editorial flex flex-col items-start justify-between gap-3 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Throne Room of God Kingdom Center. All rights reserved.</p>
          <p className="uppercase tracking-[0.2em]">Under the headship of Jesus Christ</p>
        </div>
      </div>
    </footer>
  );
}
