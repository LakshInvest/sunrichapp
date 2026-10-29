import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Camera,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Info,
  Languages,
  Loader2,
  LogOut,
  MapPin,
  MessagesSquare,
  Package,
  ShieldCheck,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { PhotoCrop } from "@/components/PhotoCrop";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { clearMyPhoto } from "@/lib/profile.functions";
import { AddressSheet } from "@/components/AddressSheet";
import { LanguageSheet } from "@/components/LanguageSheet";
import { Logo } from "@/components/Logo";
import { useOffline } from "@/hooks/use-offline";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SheetDrawer } from "@/components/SheetDrawer";
import { DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useLang } from "@/hooks/use-lang";
import { getMyRegistration, type DbLocalized, type RegistrationDto } from "@/lib/registration.functions";

function pl(v: DbLocalized | null | undefined, lang: string): string {
  if (!v) return "";
  if (lang === "hi") return v.hi || v.en;
  if (lang === "mr") return v.mr || v.en;
  return v.en;
}

/** Storage path of a previously uploaded avatar, only when it is the user's own file. */
function avatarStoragePath(url: string | null | undefined, userId: string): string | null {
  if (!url || !userId) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/([^?]+)/);
  const p = m?.[1] ? decodeURIComponent(m[1]) : null;
  return p && p.startsWith(`${userId}/`) ? p : null;
}

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: en.account.metaTitle },
      { name: "description", content: en.account.metaDescription },
      { property: "og:title", content: en.account.metaTitle },
      { property: "og:description", content: en.account.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Account,
});

const APP_VERSION = "1.0.0";

function MenuItem({
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 px-4 text-left transition active:bg-secondary/5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
        <Icon className="h-5 w-5 text-secondary" aria-hidden />
      </span>
      <span className="flex-1 truncate text-[15px] font-medium text-foreground">{label}</span>
      {!!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

function Account() {
  const { t } = useTranslation();
  const { lang, choose } = useLang();
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const myReg = useServerFn(getMyRegistration);
  const clearPhoto = useServerFn(clearMyPhoto);
  const offline = useOffline();
  const deva = lang === "en" ? "" : "font-deva";

  const [profile, setProfile] = useState<{ name: string; mobile: string; photoUrl: string | null } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<RegistrationDto | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [addressOpen, setAddressOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDone, setDeleteDone] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void myReg().then((reg) => {
      if (active && reg.customerId) setCustomer(reg);
    });
    return () => {
      active = false;
    };
  }, [myReg]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      setUserId(data.user.id);
      const { data: p } = await supabase
        .from("user_profiles")
        .select("full_name, mobile, photo_url")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!active) return;
      const m = (p?.mobile ?? "").replace(/\D/g, "").slice(-10);
      setProfile({
        name: p?.full_name ?? "",
        mobile: m ? `+91 ${m.slice(0, 5)} ${m.slice(5)}` : "",
        photoUrl: p?.photo_url ?? null,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const loadOpenCount = useCallback(async () => {
    const { count } = await supabase
      .from("customer_queries")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    setOpenCount(count ?? 0);
  }, []);

  useEffect(() => {
    void loadOpenCount();
    const id = setInterval(() => void loadOpenCount(), 60_000);
    return () => clearInterval(id);
  }, [loadOpenCount]);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPhotoSheetOpen(false);
    setCropSrc(URL.createObjectURL(f));
  };

  const onCropSave = async (blob: Blob) => {
    if (!userId || uploading) return;
    setUploading(true);
    const path = `${userId}/avatar-${Date.now()}.jpg`;
    try {
      const { error } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: rpcErr } = await supabase.rpc("update_my_profile", {
        p_full_name: profile?.name ?? "",
        p_photo_url: data.publicUrl,
        p_language: lang,
      });
      if (rpcErr) {
        await supabase.storage.from("avatars").remove([path]);
        throw rpcErr;
      }
      const prev = avatarStoragePath(profile?.photoUrl, userId);
      if (prev) await supabase.storage.from("avatars").remove([prev]);
      setProfile((p) => (p ? { ...p, photoUrl: data.publicUrl } : p));
      setCropSrc(null);
      toast.success(t("account.photoUpdated"));
    } catch {
      toast.error(t("account.errPhotoPath", { path }));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!userId || removing) return;
    setRemoving(true);
    try {
      const result = await clearPhoto();
      if (result.ok === false) throw new Error("clear failed");
      const prev = avatarStoragePath(profile?.photoUrl, userId);
      if (prev) await supabase.storage.from("avatars").remove([prev]);
      setProfile((p) => (p ? { ...p, photoUrl: null } : p));
      setPhotoSheetOpen(false);
      toast.success(t("account.photoRemoved"));
    } catch {
      toast.error(t("account.errPhoto"));
    } finally {
      setRemoving(false);
    }
  };

  const saveName = async () => {
    const name = editName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await supabase.rpc("update_my_profile", { p_full_name: name });
      setProfile((p) => (p ? { ...p, name } : p));
      setEditOpen(false);
      toast.success(t("account.nameUpdated"));
    } catch {
      toast.error(t("registration.errGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await supabase.rpc("record_logout");
    } catch {
      /* still sign out locally */
    }
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  const requestDelete = async () => {
    if (!deleteConfirm || deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("customer_raise_query", {
        p_subject: t("account.deleteSubject"),
        p_message: t("account.deleteMessage", { reason: deleteReason || "—" }),
        p_context: "account_deletion",
      });
      if (error) throw error;
      setDeleteDone(true);
    } catch {
      toast.error(t("queries.errSend"));
    } finally {
      setDeleting(false);
    }
  };

  const typeLabel = pl(customer?.typeName, lang);
  const notActive = customer?.status && customer.status !== "active";

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-8 ${deva}`}>
      <h1 className="text-3xl font-bold text-primary">{t("account.title")}</h1>

      {/* Profile header card */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary via-primary to-secondary px-5 py-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPhotoSheetOpen(true)}
              aria-label={t("account.changePhoto")}
              className="relative shrink-0 rounded-full transition active:scale-95"
            >
              <ProfileAvatar
                src={profile?.photoUrl}
                name={profile?.name}
                className="h-20 w-20 border-2 border-white/40 text-xl"
              />
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/60">
                  <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold text-primary-foreground">{profile?.name || "…"}</p>
              <p className="mt-0.5 text-sm text-primary-foreground/80">{profile?.mobile || "…"}</p>
              {typeLabel && (
                <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  {typeLabel}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setEditName(profile?.name ?? "");
                setEditOpen(true);
              }}
              className="min-h-11 shrink-0 rounded-xl bg-primary-foreground/15 px-4 text-sm font-bold text-primary-foreground transition active:scale-95"
            >
              {t("account.edit")}
            </button>
          </div>
        </div>
        {notActive && (
          <div
            className={`px-5 py-2.5 text-sm font-medium ${
              customer?.status === "pending_approval"
                ? "bg-accent text-accent-foreground"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {t(`status.${customer?.status ?? "draft"}`)}
            {customer?.status === "rejected" && customer.rejectionReason ? ` — ${customer.rejectionReason}` : ""}
          </div>
        )}
      </section>

      {/* Menu groups */}
      <section className="mt-4 rounded-2xl border border-border bg-card shadow-sm">
        <MenuItem icon={Package} label={t("account.myOrders")} onClick={() => toast(t("account.comingSoon"))} />
        <Separator />
        <MenuItem icon={Wallet} label={t("account.payments")} onClick={() => toast(t("account.comingSoon"))} />
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card shadow-sm">
        <MenuItem icon={MapPin} label={t("account.deliveryAddress")} onClick={() => setAddressOpen(true)} />
        <Separator />
        <MenuItem
          icon={MessagesSquare}
          label={t("account.helpQueries")}
          badge={openCount}
          onClick={() => navigate({ to: "/queries" })}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card shadow-sm">
        <MenuItem icon={Languages} label={t("account.language")} onClick={() => setLangOpen(true)} />
        <Separator />
        <MenuItem icon={Info} label={t("account.about")} onClick={() => setAboutOpen(true)} />
      </section>

      {/* Quiet logout */}
      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="mx-auto mt-6 flex min-h-11 items-center gap-2 text-base font-medium text-destructive transition active:scale-[0.98]"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        {t("account.logout")}
      </button>

      {/* Delete account — required for Play Store policy */}
      <button
        type="button"
        onClick={() => {
          setDeleteConfirm(false);
          setDeleteDone(false);
          setDeleteOpen(true);
        }}
        className="mx-auto mt-2 flex min-h-11 items-center gap-1.5 text-sm font-medium text-destructive underline underline-offset-4 transition active:scale-[0.98]"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {t("account.deleteAccount")}
      </button>

      <BottomNav />

      <AddressSheet
        open={addressOpen}
        onOpenChange={setAddressOpen}
        address={
          customer
            ? {
                line1: customer.addressLine1 ?? "",
                line2: customer.addressLine2,
                landmark: customer.landmark,
                city: customer.city,
                pincode: customer.pincode,
                lat: customer.latitude,
                lng: customer.longitude,
              }
            : null
        }
        typeLabel={typeLabel}
      />

      <LanguageSheet open={langOpen} onOpenChange={setLangOpen} lang={lang} onChoose={choose} />

      <SheetDrawer open={photoSheetOpen} onOpenChange={setPhotoSheetOpen}>
          <DrawerHeader>
            <DrawerTitle className="text-center">{t("account.photoSheetTitle")}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col px-2 pb-10">
            <button
              type="button"
              onClick={() => {
                setPhotoSheetOpen(false);
                cameraInput.current?.click();
              }}
              className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-[15px] font-medium text-foreground transition active:bg-secondary/5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
                <Camera className="h-5 w-5 text-secondary" aria-hidden />
              </span>
              {t("account.takePhoto")}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhotoSheetOpen(false);
                galleryInput.current?.click();
              }}
              className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-[15px] font-medium text-foreground transition active:bg-secondary/5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
                <ImageIcon className="h-5 w-5 text-secondary" aria-hidden />
              </span>
              {t("account.chooseGallery")}
            </button>
            {profile?.photoUrl && (
              <button
                type="button"
                onClick={() => void removePhoto()}
                disabled={removing}
                className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-[15px] font-medium text-destructive transition active:bg-destructive/5 disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" aria-hidden />
                </span>
                {removing ? t("account.saving") : t("account.removePhoto")}
              </button>
            )}
          </div>
      </SheetDrawer>

      {cropSrc && (
        <PhotoCrop
          src={cropSrc}
          busy={uploading}
          onCancel={() => setCropSrc(null)}
          onSave={(b) => void onCropSave(b)}
        />
      )}

      <SheetDrawer open={aboutOpen} onOpenChange={setAboutOpen}>
          <DrawerHeader>
            <DrawerTitle className="text-center">{t("account.about")}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col items-center gap-3 px-4 pb-10 text-center">
            <Logo size="md" />
            <p className="max-w-64 text-sm text-muted-foreground">{t("account.aboutBody")}</p>
            <div className="flex flex-col items-center gap-1.5">
              <a
                href="https://sunrichaqua.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-secondary underline underline-offset-4"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                {t("account.privacyPolicy")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <a
                href="https://sunrichaqua.com/terms"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-secondary underline underline-offset-4"
              >
                <FileText className="h-4 w-4" aria-hidden />
                {t("account.termsOfUse")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {t("account.aboutVersion", { version: APP_VERSION })}
            </p>
            <p className="text-xs text-muted-foreground">{t("account.madeBy")}</p>
          </div>
      </SheetDrawer>


      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="mx-auto max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("account.editNameTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            aria-label={t("account.nameLabel")}
            maxLength={60}
            className="min-h-12 rounded-xl"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="min-h-11 flex-1 rounded-xl">
              {t("account.cancel")}
            </Button>
            <Button onClick={() => void saveName()} disabled={saving || !editName.trim()} className="min-h-11 flex-1 rounded-xl">
              {saving ? t("account.saving") : t("account.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="mx-auto max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.logoutTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("account.logoutBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">{t("account.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void signOut()}
              className="min-h-11 rounded-xl bg-destructive text-primary-foreground hover:bg-destructive/90"
            >
              {t("account.logoutConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="mx-auto max-w-sm rounded-2xl">
          {deleteDone ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("account.deleteSentTitle")}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t("account.deleteSentBody")}</p>
              <Button onClick={() => void signOut()} className="min-h-12 rounded-xl">
                {t("account.logout")}
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("account.deleteAccount")}</DialogTitle>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("account.deleteBody")}</p>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">{t("account.deleteReason")}</span>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="min-h-12 rounded-xl border border-input bg-card px-3 text-base text-foreground outline-none focus:border-secondary"
                >
                  <option value="">{t("account.deleteReasonNone")}</option>
                  <option value={t("account.deleteReason1")}>{t("account.deleteReason1")}</option>
                  <option value={t("account.deleteReason2")}>{t("account.deleteReason2")}</option>
                  <option value={t("account.deleteReason3")}>{t("account.deleteReason3")}</option>
                </select>
              </label>
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-input accent-[#0B2545]"
                />
                <span className="text-sm text-foreground">{t("account.deleteConfirm")}</span>
              </label>
              <Button
                variant="destructive"
                onClick={() => void requestDelete()}
                disabled={!deleteConfirm || deleting || offline}
                className="min-h-12 rounded-xl"
              >
                {deleting ? t("account.saving") : t("account.deleteRequest")}
              </Button>
              {offline && <p className="text-center text-xs text-muted-foreground">{t("offline.hint")}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </main>
  );
}
