import { Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/trog-logo.png";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/departments", label: "Departments" },
  { to: "/seven-mountains", label: "Seven Mountains" },
  { to: "/sermons", label: "Sermons" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="container-editorial flex h-20 items-center justify-between gap-6">
        <Link
          to="/"
          className="flex items-center gap-3 leading-none text-foreground"
          onClick={() => setOpen(false)}
          aria-label="Throne Room of God Kingdom Center — Home"
        >
          <img
            src={logo}
            alt="Throne Room of God Kingdom Center logo"
            width={868}
            height={540}
            className="h-11 w-auto"
          />
          <span className="hidden font-serif text-lg leading-tight sm:block">
            Throne Room of God
            <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              Kingdom Center
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/contact"
          className="hidden rounded-none border border-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-background lg:inline-block"
        >
          Plan a visit
        </Link>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center lg:hidden"
        >
          <span className="relative block h-3 w-5">
            <span className="absolute inset-x-0 top-0 h-px bg-foreground" />
            <span className="absolute inset-x-0 bottom-0 h-px bg-foreground" />
          </span>
        </button>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-background lg:hidden">
          <div className="container-editorial flex flex-col py-4">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm tracking-wide text-muted-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
