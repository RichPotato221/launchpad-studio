import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import logo from "@/assets/trog-logo.png";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ProfileMenu } from "@/components/ProfileMenu";

const nav = [
  { to: "/home", label: "Home" },
  { to: "/feed", label: "Feed" },
  { to: "/departments", label: "Departments" },
  { to: "/tasks", label: "Tasks" },
  { to: "/events", label: "Events" },
  { to: "/attendance", label: "Attendance" },
  { to: "/governance", label: "Governance" },
  { to: "/senior-pastor-cockpit", label: "Cockpit" },
  { to: "/reports", label: "Reports" },
  { to: "/admin", label: "Admin" },
  { to: "/assets", label: "Assets" },
] as const;
 
// Only these roles ever see Governance or Cockpit in the nav at all.
const GOVERNANCE_ROLES = new Set(["senior_apostle", "chairperson"]);
const COCKPIT_ROLES = new Set([
  "senior_apostle",
  "chairperson",
  "lead_pastor",
  "associate_pastor",
  "secretary",
  "strategic_adviser",
]);
has context menu

export function PortalShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
 
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? "");
      if (data.user?.id) {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        setRoles((roleRows ?? []).map((r: any) => r.role));
      }
    });
  }, []);
 
  const filteredNav = nav.filter((item) => {
    if (item.to === "/governance") return roles.some((r) => GOVERNANCE_ROLES.has(r));
    if (item.to === "/senior-pastor-cockpit") return roles.some((r) => COCKPIT_ROLES.has(r));
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
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        {/* Top row: logo, nav (desktop only), email/sign-out/hamburger */}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
          <Link to="/home" className="flex shrink-0 items-center gap-3">
            <img src={logo} alt="TRoGKC" className="h-9 w-auto" />
            <div className="hidden font-serif text-base leading-tight sm:block">
              TRoGKC
              <span className="block text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">Leadership Portal</span>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-5 overflow-x-auto whitespace-nowrap xl:flex">
            {filteredNav.map((item) => (
      
              <Link
                key={item.to}
                to={item.to}
                className="shrink-0 text-sm text-muted-foreground transition hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <ProfileMenu />
            <button
              className="rounded p-2 xl:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search row: full width, own line, all screen sizes */}
        <div className="mx-auto max-w-7xl px-4 pb-3 md:px-8">
          <GlobalSearch />
        </div>

        {/* Mobile / tablet dropdown nav (below xl) */}
        {open && (
          <div className="border-t border-border/60 xl:hidden">
            <nav className="flex flex-col p-4">
              {filteredNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded px-3 py-3 text-sm text-muted-foreground hover:bg-muted"
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

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-7xl px-4 text-xs text-muted-foreground md:px-8">
          © {new Date().getFullYear()} Throne Room of God Kingdom Center · Under the headship of Jesus Christ
        </div>
      </footer>
    </div>
  );
}
