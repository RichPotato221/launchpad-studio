import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/identity";
import { getAuthUserResult } from "@/lib/authUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import logo from "@/assets/trog-logo.png";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ProfileMenu } from "@/components/ProfileMenu";

const nav = [
  { to: "/home", label: "Home" },
  { to: "/feed", label: "Feed" },
  { to: "/messages", label: "Messages" },
  { to: "/departments", label: "Departments" },
  { to: "/events", label: "Events" },
  { to: "/attendance", label: "Attendance" },
  { to: "/senior-pastor-cockpit", label: "Cockpit" },
  { to: "/documents", label: "Documents" },
  { to: "/vault", label: "Central Vault" },
  { to: "/reports", label: "Reports" },
  { to: "/admin", label: "Admin" },
  { to: "/connect", label: "Connect AI" },
] as const;
 
// Only these roles ever see the Cockpit in the nav at all.
const COCKPIT_ROLES = new Set([
  "senior_apostle",
  "chairperson",
  "lead_pastor",
  "associate_pastor",
  "secretary",
  "strategic_adviser",
]);


export function PortalShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  /**
   * Identity and roles come from one cached query shared with the rest of the
   * portal, so moving between pages no longer re-hits auth + user_roles on
   * every navigation.
   */
  const session = useIdentity();
  const email = session.data?.email ?? "";
  const roles: string[] = session.data?.roles ?? [];

  const filteredNav = nav.filter((item) => {
    if (item.to === "/senior-pastor-cockpit") return roles.some((r) => COCKPIT_ROLES.has(r));
    if (item.to === "/vault") return roles.some((r) => COCKPIT_ROLES.has(r));
    if (item.to === "/admin") return roles.includes("chairperson") || roles.includes("senior_apostle");
    if (item.to === "/connect") return email.toLowerCase() === "richardmashaba.sog@gmail.com";
    return true;
  });

  
  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur print:hidden">
        {/* Top row: logo, nav (desktop only), email/sign-out/hamburger */}
        <div className="mx-auto flex min-h-16 w-full max-w-[1800px] items-center gap-3 px-4 py-2 md:px-6">
          <Link to="/home" className="flex shrink-0 items-center gap-3">
            <img src={logo} alt="TRoGKC" className="h-9 w-auto" />
            <div className="hidden font-serif text-base leading-tight sm:block">
              TRoGKC
              <span className="block text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">Leadership Portal</span>
            </div>
          </Link>

          <nav className="hidden flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1 lg:flex">
            {filteredNav.map((item) => (
      
              <Link
                key={item.to}
                to={item.to}
                className="shrink-0 whitespace-nowrap text-[0.95rem] text-muted-foreground transition hover:text-foreground xl:text-base"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <ProfileMenu />
            <button
              className="rounded p-2 lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search row: full width, own line, all screen sizes */}
        <div className="mx-auto w-full max-w-[1800px] px-4 pb-3 md:px-6">
          <GlobalSearch />
        </div>

        {/* Mobile / tablet dropdown nav (below lg) */}
        {open && (
          <div className="border-t border-border/60 lg:hidden">
            <nav className="flex max-h-[70vh] flex-col overflow-y-auto overscroll-contain p-4">
              {filteredNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded px-3 py-3 text-base text-muted-foreground hover:bg-muted"
                  activeProps={{ className: "text-foreground font-medium bg-muted" }}
                >
                  {item.label}
                </Link>
              ))}
              {email && (
                <p className="px-3 pt-2 text-xs text-muted-foreground">{email}</p>
              )}
              <button
                onClick={signOut}
                className="mt-2 flex items-center gap-2 rounded px-3 py-3 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 py-6 print:hidden">
        <div className="mx-auto max-w-7xl px-4 text-xs text-muted-foreground md:px-8">
          © {new Date().getFullYear()} Throne Room of God Kingdom Center · Under the headship of Jesus Christ
        </div>
      </footer>
    </div>
  );
}
