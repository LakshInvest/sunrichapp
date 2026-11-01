import { useCallback, useEffect, useState } from "react";
import { serverMessage } from "@/lib/form-errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Smartphone } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { EmptyState, ErrorState } from "@/components/catalog/states";
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";
import { dateLabel } from "@/lib/order-format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({
    meta: [
      { title: `Logged-in phones — Sunrich` },
      { name: "description", content: "Phones where your account is signed in." },
      { property: "og:title", content: `Logged-in phones — Sunrich` },
      { property: "og:description", content: "Phones where your account is signed in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Devices,
});

type Device = { device_id: string; device_label: string | null; last_used_at: string | null; trusted_at: string | null };

function Devices() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const [list, setList] = useState<Device[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState("");
  useEffect(() => setMine(getDeviceId()), []);

  const load = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase.rpc("my_devices");
    if (error) setErr(serverMessage(error, t("errors.generic")));
    else
      setList(
        ((data ?? []) as Device[]).slice().sort((a, b) => (b.last_used_at ?? "").localeCompare(a.last_used_at ?? "")),
      );
  }, []);
  useEffect(() => void load(), [load]);

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    const { error } = await supabase.rpc("revoke_my_device", { p_device_id: confirm.device_id });
    setBusy(false);
    setConfirm(null);
    if (error) toast.error(serverMessage(error, t("errors.generic")));
    else {
      toast.success(t("devices.removed"));
      void load();
    }
  };

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-10 ${lang === "en" ? "" : "font-deva"}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 py-2.5 backdrop-blur-md">
        <button type="button" onClick={() => navigate({ to: "/account" })} aria-label={t("registration.back")} className="flex h-11 w-11 items-center justify-center rounded-xl">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="text-base font-bold">{t("devices.title")}</h1>
      </header>
      <div className="px-5 pt-4">
        <p className="text-sm text-muted-foreground">{t("devices.body")}</p>
        {err ? (
          <ErrorState message={err} onRetry={() => void load()} />
        ) : !list ? (
          <div className="mt-4 space-y-2" aria-busy>
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState title={t("devices.empty")} icon={Smartphone} />
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {list.map((d) => {
              const self = d.device_id === mine;
              return (
                <li key={d.device_id} className="flex items-center gap-3 px-4 py-3">
                  <Smartphone className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {d.device_label || t("devices.phone")}
                      {self && (
                        <span className="ml-2 rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-bold text-secondary">{t("devices.thisPhone")}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("devices.lastUsed", { date: d.last_used_at ? dateLabel(d.last_used_at, lang) : "—" })}
                    </p>
                  </div>
                  {!self && (
                    <Button variant="outline" size="sm" disabled={offline} className="min-h-11" onClick={() => setConfirm(d)}>
                      {t("devices.remove")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("devices.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("devices.confirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("devices.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
              {t("devices.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
