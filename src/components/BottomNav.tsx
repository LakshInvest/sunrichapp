import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Home, MapPin, ShoppingCart, UserRound, type LucideIcon } from "lucide-react";

type Tab = { to: "/home" | "/order" | "/track" | "/account"; key: string; icon: LucideIcon };

const TABS: Tab[] = [
  { to: "/home", key: "nav.home", icon: Home },
  { to: "/order", key: "nav.order", icon: ShoppingCart },
  { to: "/track", key: "nav.track", icon: MapPin },
  { to: "/account", key: "nav.account", icon: UserRound },
];

export function BottomNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ to, key, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
