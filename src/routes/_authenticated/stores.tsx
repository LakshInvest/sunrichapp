import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { PageShell } from "@/components/PageShell";
import { useTranslation } from "react-i18next";
import { Loader2, Search, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/hooks/use-lang";
import { pickStore, useSales, clearSales } from "@/lib/sales";
import { clearGate } from "@/lib/gate-cache";
import { serverMessage } from "@/lib/form-errors";
import { formatINR } from "@/lib/catalogue";
import en from "@/locales/en.json";

export const Route = createFileRoute("/_authenticated/stores")({
  head: () => ({
    meta: [
      { title: en.sales.metaTitle },
      { name: "description", content: en.sales.metaDescription },
      { property: "og:title", content: en.sales.metaTitle },
      { property: "og:description", content: en.sales.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stores,
});

type Row = { id: string; business_name: string; contact_name: string; mobile: string; customer_code: string; city: string; outstanding: number; last_order_at: string | null };

function Stores() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const sales = useSales();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("sales_my_customers", q.trim() ? { p_q: q.trim() } : {});
    if (error) { toast.error(serverMessage(error, t("sales.loadError"))); return; }
    setRows((data as Row[] | null) ?? []);
  }, [q, t]);
  useDataRefresh(load);
  useEffect(() => {
    let live = true;
    const h = setTimeout(() => {
      void Promise.resolve(supabase.rpc("sales_my_customers", q.trim() ? { p_q: q.trim() } : {})).then(({ data, error }) => {
        if (!live) return;
        if (error) toast.error(serverMessage(error, t("sales.loadError")));
        setRows((data as Row[] | null) ?? []);
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(h);
    };
  }, [q, t]);

  const pick = async (r: Row) => {
    if (busy) return;
    setBusy(r.id);
    try {
      const { data } = await supabase.auth.getSession();
      await pickStore(data.session?.user.id ?? "", r.id);
      clearGate();
      localStorage.removeItem("sunrich.cart");
      await navigate({ to: "/home", replace: true });
      window.location.reload();
    } catch (e) {
      toast.error(serverMessage(e, t("sales.pickError")));
      setBusy(null);
    }
  };

  const logout = async () => {
    await clearSales();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  const font = lang === "en" ? "" : "font-deva";
  const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "—");

  return (
    <PageShell onRefresh={load} className={`px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] ${font}`}>
      <h1 className="text-2xl font-bold text-primary">{t("sales.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("sales.subtitle")}</p>
      <label className="mt-4 flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("sales.search")} className="min-w-0 flex-1 bg-transparent text-base outline-none" />
      </label>
      {rows === null && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("registration.loading")}
        </p>
      )}
      {rows?.length === 0 && (
        <div className="mt-10 rounded-xl bg-card p-6 text-center shadow-sm">
          <Store className="mx-auto h-8 w-8 text-secondary" aria-hidden />
          <p className="mt-2 font-semibold text-foreground">{q ? t("sales.noMatch") : t("sales.none")}</p>
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {rows?.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => void pick(r)} disabled={!!busy} className={`w-full rounded-xl border bg-card p-4 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-60 ${sales?.picked?.id === r.id ? "border-secondary" : "border-border"}`}>
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-base font-bold text-primary">{r.business_name}</p>
                {busy === r.id && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{[r.contact_name, r.mobile, r.city].filter(Boolean).join(" · ")}</p>
              <div className="mt-2 flex justify-between text-xs">
                <span className={r.outstanding > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>{t("sales.due")}: {formatINR(r.outstanding ?? 0)}</span>
                <span className="text-muted-foreground">{t("sales.lastOrder")}: {date(r.last_order_at)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => void logout()} className="mt-8 min-h-11 w-full text-sm font-semibold text-muted-foreground underline">
        {t("account.logout")}
      </button>
    </PageShell>
  );
}
