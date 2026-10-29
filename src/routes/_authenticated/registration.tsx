import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Home,
  Loader2,
  Package,
  Store,
  Truck,
  UtensilsCrossed,
  Upload,
  type LucideIcon,
} from "lucide-react";
import en from "@/locales/en.json";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { LocationPicker } from "@/components/LocationPicker";
import { DEFAULT_LOCATION, type LocationValue } from "@/components/locationShared";
import { useLang } from "@/hooks/use-lang";
import {
  getMyRegistration,
  listCustomerTypes,
  getDocumentRequirements,
  type CustomerTypeDto,
  type DbLocalized,
  type RegistrationDto,
  type RequirementDto,
  type UploadedDocDto,
} from "@/lib/registration.functions";
import { isValidGstin, isValidPincode } from "@/lib/registration-validation";
import { prepareUpload } from "@/lib/image-compress";

export const Route = createFileRoute("/_authenticated/registration")({
  ssr: false,
  head: () => ({
    meta: [
      { title: en.registration.metaTitle },
      { name: "description", content: en.registration.metaDescription },
      { property: "og:title", content: en.registration.metaTitle },
      { property: "og:description", content: en.registration.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getMyRegistration(),
  component: Wizard,
});

type Step = "type" | "details" | "docs" | "done" | "rejected";

const TYPE_ICONS: Record<string, LucideIcon> = {
  home: Home,
  store: Store,
  truck: Truck,
  utensils: UtensilsCrossed,
  building: Building2,
};

function pl(v: DbLocalized | null | undefined, lang: string): string {
  if (!v) return "";
  if (lang === "hi") return v.hi || v.en;
  if (lang === "mr") return v.mr || v.en;
  return v.en;
}

function initialStep(reg: RegistrationDto): Step {
  if (!reg.customerId) return "type";
  if (reg.status === "draft") return "docs";
  if (reg.status === "rejected") return "rejected";
  return "type";
}

function StepIndicator({ current }: { current: number }) {
  const { t } = useTranslation();
  const labels = [t("registration.stepType"), t("registration.stepDetails"), t("registration.stepDocuments")];
  return (
    <div className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          {i > 0 && <span className="h-px w-4 bg-border" aria-hidden />}
          <span
            className={`rounded-full px-3 py-1 ${
              current === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1} · {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Wizard() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();
  const reg0 = Route.useLoaderData() as RegistrationDto;
  const reload = useServerFn(getMyRegistration);

  const [reg, setReg] = useState<RegistrationDto>(reg0);
  const [step, setStep] = useState<Step>(() => initialStep(reg0));
  const [typeCode, setTypeCode] = useState<string | null>(reg0.typeCode);

  // Anyone already registered belongs on Home, not in the wizard.
  useEffect(() => {
    if (reg.customerId && (reg.status === "active" || reg.status === "pending_approval")) {
      void navigate({ to: "/home", replace: true });
    }
  }, [reg.customerId, reg.status, navigate]);

  const refresh = async (): Promise<RegistrationDto> => {
    const fresh = await reload();
    setReg(fresh);
    return fresh;
  };

  const font = lang === "en" ? "" : "font-deva";

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-16 pt-8 ${font}`}>
      {(step === "type" || step === "details" || step === "docs") && (
        <StepIndicator current={step === "type" ? 1 : step === "details" ? 2 : 3} />
      )}

      {step === "type" && (
        <TypeStep
          onPick={(code) => {
            setTypeCode(code);
            setStep("details");
          }}
        />
      )}
      {step === "details" && typeCode && (
        <DetailsStep
          reg={reg}
          typeCode={typeCode}
          onBack={() => setStep(reg.customerId && (reg.status === "draft" || reg.status === "rejected") ? "docs" : "type")}
          onSaved={async (fresh) => {
            setReg(fresh);
            if (fresh.status === "active") setStep("done");
            else if (fresh.customerId) setStep("docs");
          }}
        />
      )}
      {step === "docs" && reg.customerId && (
        <DocsStep
          reg={reg}
          onEditDetails={() => setStep("details")}
          onSubmitted={async () => {
            await refresh();
            await navigate({ to: "/home", replace: true });
          }}
        />
      )}
      {step === "rejected" && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h1 className="text-xl font-bold text-primary">{t("registration.rejectedTitle")}</h1>
            {reg.rejectionReason && (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("registration.rejectedBody", { reason: reg.rejectionReason })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStep("details")}
            className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98]"
          >
            {t("registration.editAndResubmit")}
          </button>
        </div>
      )}
      {step === "done" && (
        <div className="flex flex-col items-center gap-6 pt-16 text-center animate-in fade-in">
          <CheckCircle2 className="h-16 w-16 text-secondary" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold text-primary">{t("registration.successTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("registration.successBody")}</p>
          </div>
          <button
            type="button"
            onClick={() => void navigate({ to: "/home" })}
            className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98]"
          >
            {t("registration.goHome")}
          </button>
        </div>
      )}
    </main>
  );
}

function TypeStep({ onPick }: { onPick: (code: string) => void }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const fetchTypes = useServerFn(listCustomerTypes);
  const [types, setTypes] = useState<CustomerTypeDto[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetchTypes().then((r) => {
      if (active) setTypes(r.types);
    });
    return () => {
      active = false;
    };
  }, [fetchTypes]);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">{t("registration.whoTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("registration.whoSubtitle")}</p>
      </div>
      {types === null && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("registration.loading")}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {(types ?? []).map((ty) => {
          const Icon = TYPE_ICONS[ty.iconKey] ?? Package;
          return (
            <button
              key={ty.code}
              type="button"
              onClick={() => onPick(ty.code)}
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-primary">{pl(ty.name, lang)}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{pl(ty.description, lang)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type DetailsState = {
  businessName: string;
  contactName: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  pincode: string;
  gstin: string;
  email: string;
};

const inputClass =
  "min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}

function DetailsStep({
  reg,
  typeCode,
  onBack,
  onSaved,
}: {
  reg: RegistrationDto;
  typeCode: string;
  onBack: () => void;
  onSaved: (fresh: RegistrationDto) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const types = useServerFn(listCustomerTypes);
  const reload = useServerFn(getMyRegistration);
  const [meta, setMeta] = useState<CustomerTypeDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [location, setLocation] = useState<LocationValue>(
    reg.latitude != null && reg.longitude != null
      ? { lat: reg.latitude, lng: reg.longitude, accuracy: reg.locationAccuracyM }
      : { ...DEFAULT_LOCATION },
  );
  const [fields, setFields] = useState<DetailsState>({
    businessName: reg.businessName ?? "",
    contactName: reg.contactName ?? "",
    addressLine1: reg.addressLine1 ?? "",
    addressLine2: reg.addressLine2 ?? "",
    landmark: reg.landmark ?? "",
    city: reg.city ?? "",
    pincode: reg.pincode ?? "",
    gstin: reg.gstin ?? "",
    email: reg.email ?? "",
  });

  useEffect(() => {
    let active = true;
    void types().then((r) => {
      if (active) setMeta(r.types.find((ty) => ty.code === typeCode) ?? null);
    });
    return () => {
      active = false;
    };
  }, [types, typeCode]);

  const isBusiness = meta ? meta.code !== "HOME" : (reg.typeCode ?? "HOME") !== "HOME";
  const requiresGps = meta?.requiresGps ?? reg.requiresGps ?? false;
  const mobile = (reg.mobile ?? "").replace(/\D/g, "").slice(-10);
  const mobilePretty = mobile ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : "";

  const set = (key: keyof DetailsState) => (e: ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: "" }));
    setError(null);
  };

  const locationTouched =
    location.accuracy != null || location.lat !== DEFAULT_LOCATION.lat || location.lng !== DEFAULT_LOCATION.lng;

  const save = async () => {
    if (busy) return;
    const errs: Record<string, string> = {};
    if (isBusiness && !fields.businessName.trim()) errs["businessName"] = t("registration.errRequired");
    if (!fields.contactName.trim()) errs["contactName"] = t("registration.errRequired");
    if (!fields.addressLine1.trim()) errs["addressLine1"] = t("registration.errRequired");
    if (!fields.city.trim()) errs["city"] = t("registration.errRequired");
    if (!isValidPincode(fields.pincode)) errs["pincode"] = t("registration.errInvalidPincode");
    if (fields.gstin.trim() && !isValidGstin(fields.gstin)) errs["gstin"] = t("registration.errInvalidGstin");
    if (fields.email.trim() && !/^\S+@\S+\.\S+$/.test(fields.email.trim()))
      errs["email"] = t("registration.errInvalidEmail");
    if (requiresGps && !locationTouched) errs["location"] = t("registration.errLocation");
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      const args = {
        p_customer_type_code: typeCode,
        p_contact_name: fields.contactName.trim(),
        p_address_line1: fields.addressLine1.trim(),
        p_city: fields.city.trim(),
        p_pincode: fields.pincode.trim(),
        ...(isBusiness ? { p_business_name: fields.businessName.trim() } : {}),
        ...(fields.addressLine2.trim() ? { p_address_line2: fields.addressLine2.trim() } : {}),
        ...(fields.landmark.trim() ? { p_landmark: fields.landmark.trim() } : {}),
        ...(fields.gstin.trim() ? { p_gstin: fields.gstin.trim() } : {}),
        ...(fields.email.trim() ? { p_email: fields.email.trim() } : {}),
        ...(requiresGps
          ? {
              p_latitude: location.lat,
              p_longitude: location.lng,
              ...(location.accuracy != null ? { p_location_accuracy_m: location.accuracy } : {}),
            }
          : {}),
      };
      const { error: rpcErr } = await supabase.rpc("start_registration", args);
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const fresh = await reload();
      await onSaved(fresh);
    } catch (e) {
      setError((e as Error).message || t("registration.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("registration.back")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="text-2xl font-bold text-primary">{t("registration.detailsTitle")}</h1>
      </div>

      {isBusiness && (
        <Field label={t("registration.businessName")} error={fieldErrors["businessName"]}>
          <input className={inputClass} value={fields.businessName} onChange={set("businessName")} />
        </Field>
      )}
      <Field label={t("registration.contactName")} error={fieldErrors["contactName"]}>
        <input className={inputClass} value={fields.contactName} onChange={set("contactName")} />
      </Field>
      {isBusiness && (
        <Field label={t("registration.mobile")}>
          <div className="flex min-h-12 items-center rounded-xl border border-input bg-muted px-4 text-base text-muted-foreground">
            {mobilePretty || "—"}
          </div>
        </Field>
      )}
      <Field label={t("registration.address1")} error={fieldErrors["addressLine1"]}>
        <input className={inputClass} value={fields.addressLine1} onChange={set("addressLine1")} />
      </Field>
      <Field label={t("registration.address2")}>
        <input className={inputClass} value={fields.addressLine2} onChange={set("addressLine2")} />
      </Field>
      <Field label={t("registration.landmark")}>
        <input className={inputClass} value={fields.landmark} onChange={set("landmark")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("registration.city")} error={fieldErrors["city"]}>
          <input className={inputClass} value={fields.city} onChange={set("city")} />
        </Field>
        <Field label={t("registration.pincode")} error={fieldErrors["pincode"]}>
          <input
            className={inputClass}
            inputMode="numeric"
            maxLength={6}
            value={fields.pincode}
            onChange={(e) => {
              setFields((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }));
              setFieldErrors((fe) => ({ ...fe, pincode: "" }));
            }}
          />
        </Field>
      </div>
      {isBusiness && (
        <Field label={t("registration.gstin")} error={fieldErrors["gstin"]}>
          <input
            className={`${inputClass} uppercase`}
            value={fields.gstin}
            onChange={set("gstin")}
            maxLength={15}
          />
        </Field>
      )}
      {isBusiness && (
        <Field label={t("registration.email")} error={fieldErrors["email"]}>
          <input className={inputClass} type="email" value={fields.email} onChange={set("email")} />
        </Field>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          {t("registration.location")}
          {requiresGps && <span className="text-destructive"> *</span>}
        </span>
        <LocationPicker value={location} onChange={setLocation} />
        {fieldErrors["location"] && (
          <span className="text-xs font-medium text-destructive">{fieldErrors["location"]}</span>
        )}
      </div>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {busy ? t("registration.saving") : t("registration.saveDetails")}
      </button>
    </div>
  );
}

type DocBlock =
  | { kind: "single"; req: RequirementDto }
  | { kind: "group"; group: string; reqs: RequirementDto[] };

function groupRequirements(requirements: RequirementDto[]): DocBlock[] {
  const blocks: DocBlock[] = [];
  for (const r of requirements) {
    if (r.oneOfGroup) {
      const existing = blocks.find((b) => b.kind === "group" && b.group === r.oneOfGroup);
      if (existing) existing.reqs.push(r);
      else blocks.push({ kind: "group", group: r.oneOfGroup, reqs: [r] });
    } else {
      blocks.push({ kind: "single", req: r });
    }
  }
  return blocks;
}

function DocsStep({
  reg,
  onEditDetails,
  onSubmitted,
}: {
  reg: RegistrationDto;
  onEditDetails: () => void;
  onSubmitted: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const fetchDocs = useServerFn(getDocumentRequirements);
  const [requirements, setRequirements] = useState<RequirementDto[]>([]);
  const [uploaded, setUploaded] = useState<UploadedDocDto[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [docNumbers, setDocNumbers] = useState<Record<string, string>>({});
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const r = await fetchDocs();
    setRequirements(r.requirements);
    setUploaded(r.uploaded);
    return r;
  };

  useEffect(() => {
    let active = true;
    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signed URLs (private bucket) for thumbnails of whatever is uploaded.
  useEffect(() => {
    let active = true;
    void (async () => {
      for (const doc of uploaded) {
        if (!doc.filePath || thumbs[doc.filePath]) continue;
        const { data } = await supabase.storage.from("customer-docs").createSignedUrl(doc.filePath, 600);
        if (active && data?.signedUrl) {
          setThumbs((prev) => ({ ...prev, [doc.filePath]: data.signedUrl }));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [uploaded, thumbs]);

  const blocks = groupRequirements(requirements);
  const uploadedFor = (code: string) => uploaded.find((u) => u.docTypeCode === code);
  const isImage = (code: string) => requirements.find((r) => r.code === code)?.acceptsImage ?? true;

  const upload = async (code: string, file: File) => {
    if (!reg.customerId || uploadingCode) return;
    setError(null);
    const prepared = await prepareUpload(file);
    if (!prepared.ok) {
      setError(prepared.reason === "tooLarge" ? t("registration.errFileTooLarge") : t("registration.errFileType"));
      return;
    }
    setUploadingCode(code);
    try {
      const path = `${reg.customerId}/${code}-${Date.now()}.${prepared.ext}`;
      const { error: upErr } = await supabase.storage
        .from("customer-docs")
        .upload(path, prepared.blob, { contentType: prepared.mime });
      if (upErr) {
        setError(t("registration.errUpload"));
        return;
      }
      const { error: rpcErr } = await supabase.rpc("add_customer_document", {
        p_document_type_code: code,
        p_file_path: path,
        p_file_name: file.name,
        p_mime_type: prepared.mime,
        p_file_size: prepared.blob.size,
        p_doc_number: docNumbers[code] || null,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      await load();
    } catch (e) {
      setError((e as Error).message || t("registration.errUpload"));
    } finally {
      setUploadingCode(null);
    }
  };

  const onFilePicked = (code: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void upload(code, file);
  };

  const readyToSubmit = blocks.every((block) => {
    if (block.kind === "single") {
      return block.req.requirement !== "required" || uploadedFor(block.req.code);
    }
    return block.reqs.some((r) => uploadedFor(r.code));
  });

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc("submit_registration");
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      await onSubmitted();
    } catch (e) {
      setError((e as Error).message || t("registration.errGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  const badge = (req: RequirementDto["requirement"]) =>
    req === "required"
      ? t("registration.badgeRequired")
      : req === "optional"
        ? t("registration.badgeOptional")
        : t("registration.badgeAnyOne");
  const badgeClass =
    "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide bg-secondary/15 text-secondary";

  const uploadRow = (code: string) => {
    const doc = uploadedFor(code);
    const uploading = uploadingCode === code;
    const req = requirements.find((r) => r.code === code);
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{pl(req?.name, lang)}</p>
          {doc && <span className="text-xs font-semibold text-secondary">{t("registration.uploaded")}</span>}
        </div>
        <div className="flex items-center gap-3">
          {doc && isImage(code) && thumbs[doc.filePath] && (
            <img
              src={thumbs[doc.filePath]}
              alt=""
              className="h-16 w-16 rounded-lg border border-border object-cover"
            />
          )}
          {doc && !isImage(code) && (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
              <FileText className="h-7 w-7" aria-hidden />
            </span>
          )}
          <div className="flex min-h-11 flex-1 flex-wrap items-center gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition active:scale-95">
              <Upload className="h-4 w-4" aria-hidden />
              {doc ? t("registration.replace") : t("registration.takePhoto")}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={!!uploadingCode}
                onChange={onFilePicked(code)}
              />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition active:scale-95">
              {t("registration.chooseFile")}
              <input
                type="file"
                accept={`${req?.acceptsImage ? "image/*," : ""}${req?.acceptsPdf ? "application/pdf" : ""}` || undefined}
                className="hidden"
                disabled={!!uploadingCode}
                onChange={onFilePicked(code)}
              />
            </label>
          </div>
        </div>
        {uploading && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-secondary" />
            </div>
            <span className="text-xs text-muted-foreground">{t("registration.uploading")}</span>
          </div>
        )}
        {req?.hasNumber && (
          <input
            className={inputClass}
            placeholder={t("registration.docNumber")}
            value={docNumbers[code] ?? doc?.docNumber ?? ""}
            onChange={(e) => setDocNumbers((d) => ({ ...d, [code]: e.target.value }))}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">{t("registration.docsTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("registration.docsSubtitle")}</p>
      </div>

      {blocks.map((block) =>
        block.kind === "single" ? (
          <div key={block.req.code} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-primary">{pl(block.req.name, lang)}</p>
              <span className={badgeClass}>{badge(block.req.requirement)}</span>
            </div>
            {uploadRow(block.req.code)}
          </div>
        ) : (
          <div key={block.group} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-primary">
                {block.reqs.map((r) => pl(r.name, lang)).join(" / ")}
              </p>
              <span className={badgeClass}>{badge("one_of")}</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("registration.groupHint", { docs: block.reqs.map((r) => pl(r.name, lang)).join(" / ") })}
            </p>
            <div className="flex flex-col gap-3">
              {block.reqs.map((r) => (
                <div key={r.code}>{uploadRow(r.code)}</div>
              ))}
            </div>
          </div>
        ),
      )}

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!readyToSubmit || submitting}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
        {submitting ? t("registration.submitting") : t("registration.submitForApproval")}
      </button>
      <button
        type="button"
        onClick={onEditDetails}
        className="min-h-11 text-sm font-medium text-muted-foreground underline underline-offset-4"
      >
        {t("registration.editDetails")}
      </button>
    </div>
  );
}
