import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Localized text straight from the database (name / name_hi / name_mr). */
export type DbLocalized = { en: string; hi: string | null; mr: string | null };

export type CustomerTypeDto = {
  code: string;
  name: DbLocalized;
  description: DbLocalized;
  iconKey: string;
  requiresApproval: boolean;
  requiresGps: boolean;
};

export type RegistrationDto = {
  customerId: string | null;
  status: string | null;
  rejectionReason: string | null;
  customerCode: string | null;
  typeCode: string | null;
  typeName: DbLocalized | null;
  requiresGps: boolean;
  businessName: string | null;
  contactName: string | null;
  mobile: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyM: number | null;
  gstin: string | null;
};

export const EMPTY_REGISTRATION: RegistrationDto = {
  customerId: null,
  status: null,
  rejectionReason: null,
  customerCode: null,
  typeCode: null,
  typeName: null,
  requiresGps: false,
  businessName: null,
  contactName: null,
  mobile: null,
  email: null,
  addressLine1: null,
  addressLine2: null,
  landmark: null,
  city: null,
  state: null,
  pincode: null,
  latitude: null,
  longitude: null,
  locationAccuracyM: null,
  gstin: null,
};

export const listCustomerTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("customer_types")
      .select(
        "code, name, name_hi, name_mr, description, description_hi, description_mr, icon_key, requires_approval, requires_gps",
      )
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    const types: CustomerTypeDto[] = (data ?? []).map((t) => ({
      code: t.code,
      name: { en: t.name, hi: t.name_hi ?? null, mr: t.name_mr ?? null },
      description: {
        en: t.description ?? "",
        hi: t.description_hi ?? null,
        mr: t.description_mr ?? null,
      },
      iconKey: t.icon_key ?? "home",
      requiresApproval: t.requires_approval,
      requiresGps: t.requires_gps,
    }));
    return { types };
  });

export const getMyRegistration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegistrationDto> => {
    const { data: prof } = await context.supabase
      .from("user_profiles")
      .select("mobile, customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!prof?.customer_id) return { ...EMPTY_REGISTRATION, mobile: prof?.mobile ?? null };

    const { data: c } = await context.supabase
      .from("customers")
      .select(
        `id, customer_code, status, rejection_reason, business_name, contact_name, mobile, email,
         address_line1, address_line2, landmark, city, state, pincode,
         latitude, longitude, location_accuracy_m, gstin,
         customer_types(code, name, name_hi, name_mr, requires_gps)`,
      )
      .eq("id", prof.customer_id)
      .maybeSingle();
    if (!c) return { ...EMPTY_REGISTRATION, mobile: prof.mobile };

    const type = Array.isArray(c.customer_types) ? c.customer_types[0] : c.customer_types;
    return {
      customerId: c.id,
      status: c.status,
      rejectionReason: c.rejection_reason ?? null,
      customerCode: c.customer_code ?? null,
      typeCode: type?.code ?? null,
      typeName: type ? { en: type.name, hi: type.name_hi ?? null, mr: type.name_mr ?? null } : null,
      requiresGps: type?.requires_gps ?? false,
      businessName: c.business_name ?? null,
      contactName: c.contact_name ?? null,
      mobile: c.mobile ?? prof.mobile,
      email: c.email ?? null,
      addressLine1: c.address_line1 ?? null,
      addressLine2: c.address_line2 ?? null,
      landmark: c.landmark ?? null,
      city: c.city ?? null,
      state: c.state ?? null,
      pincode: c.pincode ?? null,
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
      locationAccuracyM: c.location_accuracy_m ?? null,
      gstin: c.gstin ?? null,
    };
  });

export type RequirementDto = {
  code: string;
  name: DbLocalized;
  acceptsImage: boolean;
  acceptsPdf: boolean;
  hasNumber: boolean;
  requirement: "required" | "optional" | "one_of";
  oneOfGroup: string | null;
};

export type UploadedDocDto = {
  docTypeCode: string;
  filePath: string;
  fileName: string | null;
  mimeType: string | null;
  docNumber: string | null;
  status: string;
};

export const getDocumentRequirements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("user_profiles")
      .select("customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    const cid = prof?.customer_id ?? null;
    if (!cid) return { customerId: null, requirements: [] as RequirementDto[], uploaded: [] as UploadedDocDto[] };

    const { data: customer } = await context.supabase
      .from("customers")
      .select("customer_type_id")
      .eq("id", cid)
      .maybeSingle();
    if (!customer?.customer_type_id) {
      return { customerId: cid, requirements: [] as RequirementDto[], uploaded: [] as UploadedDocDto[] };
    }

    const { data: ctd } = await context.supabase
      .from("customer_type_documents")
      .select(
        `requirement, one_of_group,
         document_types(code, name, name_hi, name_mr, accepts_image, accepts_pdf, has_number)`,
      )
      .eq("customer_type_id", customer.customer_type_id);

    const requirements: RequirementDto[] = (ctd ?? [])
      .map((row) => {
        const d = Array.isArray(row.document_types) ? row.document_types[0] : row.document_types;
        if (!d) return null;
        return {
          code: d.code,
          name: { en: d.name, hi: d.name_hi ?? null, mr: d.name_mr ?? null },
          acceptsImage: d.accepts_image,
          acceptsPdf: d.accepts_pdf,
          hasNumber: d.has_number,
          requirement: row.requirement,
          oneOfGroup: row.one_of_group ?? null,
        } satisfies RequirementDto;
      })
      .filter((d): d is RequirementDto => d !== null);

    const { data: docs } = await context.supabase
      .from("customer_documents")
      .select("file_path, file_name, mime_type, doc_number, status, document_types(code)")
      .eq("customer_id", cid);

    const uploaded: UploadedDocDto[] = (docs ?? [])
      .map((d) => {
        const dt = Array.isArray(d.document_types) ? d.document_types[0] : d.document_types;
        if (!dt) return null;
        return {
          docTypeCode: dt.code,
          filePath: d.file_path,
          fileName: d.file_name ?? null,
          mimeType: d.mime_type ?? null,
          docNumber: d.doc_number ?? null,
          status: d.status,
        } satisfies UploadedDocDto;
      })
      .filter((d): d is UploadedDocDto => d !== null);

    return { customerId: cid, requirements, uploaded };
  });
