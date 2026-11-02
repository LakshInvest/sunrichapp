import { clearMyCustomer } from "@/lib/my-customer";
import { applyStatusBar } from "@/lib/status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import i18n from "../lib/i18n";
import { exitApp, initNative, markFirstScreen } from "@/lib/native";
import { installViewportVars } from "@/lib/keyboard";
import { registerServiceWorker } from "@/lib/sw-register";
import { clearGate } from "@/lib/gate-cache";
import { clearUserCaches } from "@/lib/swr-cache";
import { AppGate } from "@/components/AppGate";
import { refreshPushToken } from "@/lib/push";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              clearGate();
      router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" },
      { name: "theme-color", content: "#0D3278" },
      { title: "Sunrich" },
      { name: "description", content: "Order Sunrich packaged drinking water." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
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
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [askExit, setAskExit] = useState(false);

  // Keep the router and query cache in sync with auth identity changes.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_IN") void refreshPushToken();
      if (event === "SIGNED_OUT") { clearUserCaches(); clearMyCustomer(); }
      void router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  // Android shell: status bar, splash, hardware back, deep links (no-op on web).
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void initNative({
      isHome: () => router.state.location.pathname === "/home",
      onExitHint: () => setAskExit(true),
      openPath: (path) => void router.navigate({ to: path, replace: false }),
    }).then((c) => (cleanup = c));
    return () => cleanup?.();
  }, [router]);

  // Status-bar icon colour per page (dark icons on light pages).
  useEffect(() => {
    void applyStatusBar(router.state.location.pathname);
    return router.subscribe("onResolved", ({ toLocation }) => {
      void applyStatusBar(toLocation.pathname);
      // First settled real screen (not the "/" redirect) hides the native splash.
      if (toLocation.pathname !== "/") markFirstScreen();
    });
  }, [router]);

  // Push token carries the language: refresh it when the language changes.
  useEffect(() => {
    const on = () => void refreshPushToken();
    i18n.on("languageChanged", on);
    return () => i18n.off("languageChanged", on);
  }, []);

  // Keyboard-safe sizing (--app-h / --kb) + focused field kept in view.
  useEffect(() => installViewportVars(), []);

  // Offline/speed cache (published site only).
  useEffect(() => registerServiceWorker(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <AppGate />
      {askExit && (
        <div role="alertdialog" aria-modal className="fixed inset-0 z-[80] flex items-center justify-center bg-primary/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-card p-5 text-center shadow-xl">
            <h2 className="text-lg font-bold text-foreground">{i18n.t("native.exitTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{i18n.t("native.exitBody")}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAskExit(false)}
                className="min-h-12 flex-1 rounded-xl border border-border bg-card text-base font-semibold text-foreground"
              >
                {i18n.t("native.exitNo")}
              </button>
              <button
                type="button"
                onClick={() => void exitApp()}
                className="min-h-12 flex-1 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
              >
                {i18n.t("native.exitYes")}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
