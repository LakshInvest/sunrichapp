import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Home, Inbox, Package, ShoppingBag, UserRound, type LucideIcon } from "lucide-react";
import { hasOrderUpdates, useDistributorNav } from "@/lib/orders";

type Tab = { to: "/home" | "/order" | "/track" | "/account" | "/inbox"; key: string; icon: LucideIcon };

const TABS: Tab[] = [
  { to: "/home", key: "nav.home", icon: Home },
  { to: "/order", key: "nav.order", icon: ShoppingBag },
  { to: "/track", key: "nav.track", icon: Package },
  { to: "/inbox", key: "nav.inbox", icon: Inbox },
  { to: "/account", key: "nav.account", icon: UserRound },
];

export function BottomNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isDistributor, newCount } = useDistributorNav();
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

  const tabs: Tab[] = isDistributor ? TABS : TABS.filter((tab) => tab.to !== "/inbox");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md shadow-[0_-8px_24px_-16px_rgba(11,37,69,0.35)]">
        {tabs.map(({ to, key, icon: Icon }) => {
          const active = pathname === to || (to === "/track" && pathname.startsWith("/track/"));
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 h-1 w-8 rounded-full bg-secondary"
                />
              )}
              <span className="relative">
                <Icon
                  className={`transition-transform ${active ? "h-7 w-7" : "h-6 w-6"}`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {to === "/track" && ordersChanged && (
                  <span aria-hidden className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-destructive" />
                )}
                {to === "/inbox" && newCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
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
