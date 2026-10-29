import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
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

  const stepIndex = step === "type" ? 1 : step === "details" ? 2 : step === "docs" ? 3 : null;
  const font = lang === "en" ? "" : "font-deva";

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background px-5 pb-16 pt-8 ${font}`}>
      {stepIndex != null && (
        <div className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold">
          {[t("registration.stepType"), t("registration.stepDetails"), t("registration.stepDocuments")].map(
            (label, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-5 bg-border" aria-hidden />}
                <span
                  className={`rounded-full px-3 py-1 ${
                    stepIndex === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1} · {label}
                </span>
              </div>
            ),
          )}
        </div>
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
          onBack={() => setStep(reg.customerId ? "docs" : "type")}
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
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition active:scale-[0.99] active:bg-secondary/5"
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
  const { lang } = useLang();
  const types = useServerFn(listCustomerTypes);
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

  const isBusiness = meta ? meta.code !== "HOME" : reg.typeCode !== "HOME";
  const requiresGps = meta?.requiresGps ?? reg.requiresGps ?? false;
  const mobile = (reg.mobile ?? "").replace(/\D/g, "").slice(-10);
  const mobilePretty = mobile ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : "";

  const set = (key: keyof DetailsState) => (e: ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: "" }));
    setError(null);
  };

  const save = async () => {
    if (busy) return;
    const errs: Record<string, string> = {};
    if (isBusiness && !fields.businessName.trim()) errs.businessName = t("registration.errRequired");
    if (!fields.contactName.trim()) errs.contactName = t("registration.errRequired");
    if (!fields.addressLine1.trim()) errs.addressLine1 = t("registration.errRequired");
    if (!fields.city.trim()) errs.city = t("registration.errRequired");
    if (!isValidPincode(fields.pincode)) errs.pincode = t("registration.errInvalidPincode");
    if (fields.gstin.trim() && !isValidGstin(fields.gstin)) errs.gstin = t("registration.errInvalidGstin");
    if (fields.email.trim() && !/^\S+@\S+\.\S+$/.test(fields.email.trim())) errs.email = t("registration.errInvalidEmail");
    if (requiresGps) {
      // GPS must have produced coordinates (or the user dragged the pin).
      if (!location || (location.lat === DEFAULT_LOCATION.lat && location.lng === DEFAULT_LOCATION.lng && location.accuracy == null)) {
        errs.location = t("registration.errLocation");
      }
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc("start_registration", {
        p_customer_type_code: typeCode,
        p_contact_name: fields.contactName.trim(),
        p_business_name: isBusiness ? fields.businessName.trim() : null,
        p_address_line1: fields.addressLine1.trim(),
        p_address_line2: fields.addressLine2.trim() || null,
        p_landmark: fields.landmark.trim() || null,
        p_city: fields.city.trim(),
        p_state: null,
        p_pincode: fields.pincode.trim(),
        p_latitude: requiresGps ? location.lat : null,
        p_longitude: requiresGps ? location.lng : null,
        p_location_accuracy_m: requiresGps && location.accuracy != null ? location.accuracy : null,
        p_gstin: fields.gstin.trim() || null,
        p_email: fields.email.trim() || null,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const { data: fresh } = { data: null };
      void fresh;
      const updated = await (onSavedArgRef.current as () => Promise<RegistrationDto>);
      void updated;
    } finally {
      setBusy(false);
    }
  };

  // Wrapper so onSaved can refresh after the RPC resolves.
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const saveWithRefresh = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc("start_registration", {
        p_customer_type_code: typeCode,
        p_contact_name: fields.contactName.trim(),
        p_business_name: isBusiness ? fields.businessName.trim() : null,
        p_address_line1: fields.addressLine1.trim(),
        p_address_line2: fields.addressLine2.trim() || null,
        p_landmark: fields.landmark.trim() || null,
        p_city: fields.city.trim(),
        p_state: null,
        p_pincode: fields.pincode.trim(),
        p_latitude: requiresGps ? location.lat : null,
        p_longitude: requiresGps ? location.lng : null,
        p_location_accuracy_m: requiresGps && location.accuracy != null ? location.accuracy : null,
        p_gstin: fields.gstin.trim() || null,
        p_email: fields.email.trim() || null,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const reloadReg = useServerFnCache.current;
      if (reloadReg) await reloadReg();
    } finally {
      setBusy(false);
    }
  };

  return null;
}

const useServerFnCache = { current: null as null | (() => Promise<RegistrationDto>) };

function DocsStep({
  reg,
  onEditDetails,
  onSubmitted,
}: {
  reg: RegistrationDto;
  onEditDetails: () => void;
  onSubmitted: () => void | Promise<void>;
}) {
  return null;
}

const ChevronLeftIcon = ChevronLeft;
