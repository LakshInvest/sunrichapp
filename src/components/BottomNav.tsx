import { getHomeExtras, onHomeExtras } from "@/lib/catalogue";
import { ownCustomerFilter } from "@/lib/my-customer";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { BookOpen, Home, Inbox, Package, UserRound, type LucideIcon } from "lucide-react";
import { hasOrderUpdates, useDistributorNav } from "@/lib/orders";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";

type Tab = { to: "/home" | "/khata" | "/track" | "/account" | "/inbox"; key: string; icon: LucideIcon };

const TABS: Tab[] = [
  { to: "/home", key: "nav.home", icon: Home },
  { to: "/track", key: "nav.track", icon: Package },
  { to: "/khata", key: "nav.khata", icon: BookOpen },
  { to: "/inbox", key: "nav.inbox", icon: Inbox },
  { to: "/account", key: "nav.account", icon: UserRound },
];

export function BottomNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isDistributor, newCount } = useDistributorNav();
  const { count: cartCount } = useCart();
  const [ordersChanged, setOrdersChanged] = useState(false);
  useEffect(() => {
    if (pathname.startsWith("/track")) {
      setOrdersChanged(false);
      return;
    }
    let active = true;
    void hasOrderUpdates().then((v) => active && setOrdersChanged(v));
    return () => {
      active = false;
    };
  }, [pathname]);

  const [replied, setReplied] = useState(false);
  // On Home the chat count comes from get_home(); other tabs ask directly.
  useEffect(() => {
    if (pathname !== "/home") return;
    return onHomeExtras((x) => setReplied(x.awaitingReply > 0));
  }, [pathname]);
  useEffect(() => {
    if (pathname === "/home" && getHomeExtras()) return;
    let active = true;
    void ownCustomerFilter()
      .then((cid) =>
        supabase
          .from("customer_queries")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", cid)
          .eq("status", "open"),
      )
      .then(({ count }) => active && setReplied((count ?? 0) > 0));
    return () => {
      active = false;
    };
  }, [pathname]);

  const tabs: Tab[] = isDistributor ? TABS : TABS.filter((tab) => tab.to !== "/inbox");

  return (
    <nav data-hide-on-type className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-md shadow-[0_-8px_24px_-16px_rgba(11,37,69,0.35)]">
        {tabs.map(({ to, key, icon: Icon }) => {
          const active = pathname === to || (to === "/track" && pathname.startsWith("/track/"));
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              aria-label={to === "/account" && replied ? `${t(key)} · ${t("queries.chipOpen")}` : undefined}
              className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                active ? "font-bold text-secondary" : "font-medium text-muted-foreground"
              }`}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-all ${
                  active ? "-translate-y-0.5 bg-secondary/15 shadow-sm" : ""
                }`}
              >
                <Icon
                  className="h-6 w-6"
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.2 : 0}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {to === "/home" && cartCount > 0 && (
                  <span
                    aria-label={`${t("home.cart")}: ${cartCount}`}
                    className="absolute -top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-accent px-1 text-[10px] font-bold text-accent-foreground"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
                {to === "/track" && ordersChanged && (
                  <span aria-hidden className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-destructive" />
                )}
                {to === "/account" && replied && (
                  <span aria-hidden className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-secondary" />
                )}
                {to === "/inbox" && newCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
                  >
                    {newCount > 9 ? "9+" : newCount}
                  </span>
                )}
              </span>
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
