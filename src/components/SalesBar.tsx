import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Store } from "lucide-react";
import { useSales } from "@/lib/sales";

/** Fixed top strip in sales mode: which store the salesman is ordering for. */
export function SalesBar() {
  const s = useSales();
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (!s?.isSales || !s.picked) return null;
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 bg-primary pt-[env(safe-area-inset-top)] text-primary-foreground shadow-md">
        <div className="mx-auto flex h-10 max-w-md items-center gap-2 px-4 text-sm">
          <Store className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-semibold">{t("sales.barStore", { name: s.picked.business_name })}</span>
          <button type="button" onClick={() => navigate({ to: "/stores" })} className="min-h-10 shrink-0 px-2 font-bold underline underline-offset-4">
            {t("sales.change")}
          </button>
        </div>
      </div>
      <div aria-hidden className="h-[calc(2.5rem+env(safe-area-inset-top))]" />
    </>
  );
}
