import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Briefcase, Building2, Check, Crosshair, Home as HomeIcon, MapPin, MoreVertical, Plus, Store, Warehouse } from "lucide-react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { AddressEditor } from "@/components/AddressEditor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useOffline } from "@/hooks/use-offline";
import { serverMessage } from "@/lib/form-errors";
import { addressText, deleteMyAddress, labelKey, saveMyAddress, type SavedAddress } from "@/lib/addresses";
import { setSelectedAddressId } from "@/lib/selected-address";

export const LABEL_ICONS: Record<string, typeof MapPin> = {
  shop: Store,
  home: HomeIcon,
  godown: Warehouse,
  office: Briefcase,
  other: Building2,
};

/** Blinkit-style "Deliver to" sheet: current location, saved addresses, add new. */
export function AddressSwitcher({
  open,
  onOpenChange,
  list,
  selectedId,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  list: SavedAddress[];
  selectedId: string | null;
  onChanged: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const offline = useOffline();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [locate, setLocate] = useState(false);
  const [toDelete, setToDelete] = useState<SavedAddress | null>(null);

  const openEditor = (a: SavedAddress | null, withGps = false) => {
    setEditing(a);
    setLocate(withGps);
    onOpenChange(false);
    // Let the closing sheet finish its back-history step before opening the next.
    setTimeout(() => setEditorOpen(true), 350);
  };

  const makeDefault = async (a: SavedAddress) => {
    try {
      await saveMyAddress({ ...a, isDefault: true });
      await onChanged();
    } catch (e) {
      toast.error(serverMessage(e, t("addresses.errSave")));
    }
  };

  const remove = async () => {
    const a = toDelete;
    setToDelete(null);
    if (!a) return;
    try {
      await deleteMyAddress(a.id);
      if (a.id === selectedId) setSelectedAddressId(null);
      toast.success(t("addresses.deleted"));
      await onChanged();
    } catch (e) {
      toast.error(serverMessage(e, t("addresses.errDelete")));
    }
  };

  return (
    <>
      <SheetDrawer open={open} onOpenChange={onOpenChange} className="max-h-[88vh]">
        <div className="overflow-y-auto px-4 pb-8 pt-2">
          <h2 className="px-1 text-lg font-bold text-foreground">{t("switcher.title")}</h2>
          <button
            type="button"
            onClick={() => openEditor(null, true)}
            disabled={offline}
            className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 text-left transition active:scale-[0.99] disabled:opacity-50"
          >
            <Crosshair className="h-5 w-5 text-secondary" aria-hidden />
            <span className="text-sm font-semibold text-primary">{t("switcher.useCurrent")}</span>
          </button>

          {list.length > 0 && (
            <p className="mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("switcher.saved")}</p>
          )}
          <ul className="mt-2 space-y-2">
            {list.map((a) => {
              const Icon = LABEL_ICONS[a.label] ?? MapPin;
              const sel = a.id === selectedId;
              return (
                <li key={a.id} className={`flex items-start gap-1 rounded-2xl border bg-card ${sel ? "border-primary" : "border-border"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddressId(a.id);
                      onOpenChange(false);
                    }}
                    aria-pressed={sel}
                    className="flex min-h-14 min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                        {t(labelKey(a.label))}
                        {a.isDefault && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold">{t("addresses.default")}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{addressText(a)}</span>
                    </span>
                    {sel && <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-label={t("switcher.selected")} />}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={t("switcher.more")}
                      disabled={offline}
                      className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground disabled:opacity-50"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[80]">
                      <DropdownMenuItem className="min-h-11" onSelect={() => openEditor(a)}>
                        {t("account.edit")}
                      </DropdownMenuItem>
                      {!a.isDefault && (
                        <DropdownMenuItem className="min-h-11" onSelect={() => void makeDefault(a)}>
                          {t("addresses.setDefault")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="min-h-11 text-destructive" onSelect={() => setToDelete(a)}>
                        {t("addresses.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => openEditor(null)}
            disabled={offline}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-secondary/50 text-sm font-semibold text-primary disabled:opacity-50"
          >
            <Plus className="h-5 w-5" aria-hidden />
            {t("addresses.addNew")}
          </button>
          {offline && <p className="mt-2 text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
        </div>
      </SheetDrawer>

      <AddressEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        address={editing}
        isFirst={list.length === 0}
        autoLocate={locate}
        onSaved={(id) => {
          toast.success(t("addresses.saved"));
          if (!editing) setSelectedAddressId(id);
          void onChanged();
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
            <AlertDialogAction onClick={() => void remove()} className="min-h-11 rounded-xl bg-destructive text-primary-foreground hover:bg-destructive/90">
              {t("addresses.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
