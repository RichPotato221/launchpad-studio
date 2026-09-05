import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Page not found</p>
        <h1 className="mt-4 font-serif text-6xl text-foreground">404</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This page doesn't exist in the portal.
        </p>
        <Link to="/" className="mt-8 inline-block border border-foreground px-6 py-3 text-xs font-medium uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  // Anything can be thrown — including `undefined`. Normalise it so the
  // boundary itself can never crash and leave a blank screen behind.
  const normalised =
    error instanceof Error
      ? error
      : new Error(
          typeof error === "string"
            ? error
            : (error as { message?: string } | null)?.message ?? "An unexpected error occurred.",
        );
  useEffect(() => {
    reportLovableError(normalised, { boundary: "tanstack_root_error_component" });
  }, [normalised]);
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Something went wrong</p>
        <h1 className="mt-4 font-serif text-3xl text-foreground">This page didn't load</h1>
        <p className="mt-3 text-sm text-muted-foreground">{normalised.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 border border-foreground bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-widest text-background"
        >
          Try again
        </button>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light only" },
      { name: "supported-color-schemes", content: "light" },
      { name: "robots", content: "noindex, nofollow" },
      { title: "TROG Dashboard" },
      {
        name: "description",
        content:
          "Private leadership and serving-members portal for Throne Room of God Kingdom Center — governance, departments, KPIs and reports.",
      },
      { property: "og:title", content: "TROG Dashboard" },
      { name: "twitter:title", content: "TROG Dashboard" },
      { property: "og:description", content: "Private leadership and serving-members portal for Throne Room of God Kingdom Center — governance, departments, KPIs and reports." },
      { name: "twitter:description", content: "Private leadership and serving-members portal for Throne Room of God Kingdom Center — governance, departments, KPIs and reports." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5bc998b1-aa98-455c-a17a-8e3082fd32e5/id-preview-893086c5--213bacb4-31aa-41b9-bfb4-454076ea22af.lovable.app-1784200958861.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5bc998b1-aa98-455c-a17a-8e3082fd32e5/id-preview-893086c5--213bacb4-31aa-41b9-bfb4-454076ea22af.lovable.app-1784200958861.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    installChunkRecovery();
  }, []);

  useEffect(() => {

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
