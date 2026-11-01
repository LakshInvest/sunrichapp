import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Pencil, Plus, Trash2, User } from "lucide-react";
import en from "@/locales/en.json";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AddressEditor } from "@/components/AddressEditor";
import { EmptyState, ErrorState } from "@/components/catalog/states";
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
import { useLang } from "@/hooks/use-lang";
import { useOffline } from "@/hooks/use-offline";
import { serverMessage } from "@/lib/form-errors";
import { addressText, labelKey, deleteMyAddress, listMyAddresses, saveMyAddress, type SavedAddress } from "@/lib/addresses";

export const Route = createFileRoute("/_authenticated/addresses")({
  head: () => ({
    meta: [
      { title: en.addresses.metaTitle },
      { name: "description", content: en.addresses.metaDescription },
      { property: "og:title", content: en.addresses.metaTitle },
      { property: "og:description", content: en.addresses.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Addresses,
});


function Addresses() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";
  const [list, setList] = useState<SavedAddress[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SavedAddress | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await listMyAddresses());
      setErr(null);
    } catch (e) {
      setErr(serverMessage(e, t("common.loadError")));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const makeDefault = async (a: SavedAddress) => {
    setBusy(a.id);
    try {
      await saveMyAddress({ ...a, isDefault: true });
      await load();
    } catch (e) {
      toast.error(serverMessage(e, t("addresses.errSave")));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const a = toDelete;
    setToDelete(null);
    setBusy(a.id);
    try {
      await deleteMyAddress(a.id);
      toast.success(t("addresses.deleted"));
      await load();
    } catch (e) {
      toast.error(serverMessage(e, t("addresses.errDelete")));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background pb-28 ${deva}`}>
      <OfflineBanner />
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/account" })}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{t("addresses.title")}</h1>
      </header>

      <div className="px-5 pt-5">
        {err && !list ? (
          <ErrorState message={err} onRetry={() => void load()} />
        ) : !list ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title={t("addresses.emptyTitle")}
            body={t("addresses.emptyBody")}
            action={t("addresses.add")}
            onAction={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          />
        ) : (
          <ul className="space-y-3">
            {list.map((a) => (
              <li key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-secondary" aria-hidden />
                  <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{t(labelKey(a.label))}</span>
                  {a.isDefault && (
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-foreground">{t("addresses.default")}</span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{addressText(a)}</p>
                {(a.contactName || a.contactMobile) && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" aria-hidden />
                    {[a.contactName, a.contactMobile].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(a);
                      setEditorOpen(true);
                    }}
                    disabled={offline}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold text-foreground disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    {t("account.edit")}
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      onClick={() => void makeDefault(a)}
                      disabled={offline || busy === a.id}
                      className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold text-secondary disabled:opacity-50"
                    >
                      {t("addresses.setDefault")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setToDelete(a)}
                    disabled={offline || busy === a.id}
                    aria-label={t("addresses.delete")}
                    className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-xl text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {list && list.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            disabled={offline}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-secondary/50 text-base font-semibold text-primary disabled:opacity-50"
          >
            <Plus className="h-5 w-5" aria-hidden />
            {t("addresses.add")}
          </button>
        )}
      </div>

      <AddressEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        address={editing}
        isFirst={(list?.length ?? 0) === 0}
        onSaved={() => {
          toast.success(t("addresses.saved"));
          void load();
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="mx-auto max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("addresses.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{toDelete ? addressText(toDelete) : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">{t("account.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void remove()}
              className="min-h-11 rounded-xl bg-destructive text-primary-foreground hover:bg-destructive/90"
            >
              {t("addresses.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
