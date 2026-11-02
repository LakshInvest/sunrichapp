import { supabase } from "@/integrations/supabase/client";

/** Saved delivery addresses: own rows via RLS, writes via save_my_address / delete_my_address. */

export const ADDRESS_LABELS = ["shop", "home", "godown", "office", "other"] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

export type SavedAddress = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  contactName: string | null;
  contactMobile: string | null;
  isDefault: boolean;
};

export function addressText(a: Pick<SavedAddress, "line1" | "line2" | "landmark" | "city" | "pincode">): string {
  return [a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(", ");
}

export async function listMyAddresses(): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapAddressRow(r));
}

/** Maps a customer_addresses row (also get_home's default_address) to a SavedAddress. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAddressRow(r: any): SavedAddress {
  return {
    id: r.id,
    label: r.label,
    line1: r.address_line1,
    line2: r.address_line2,
    landmark: r.landmark,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    lat: r.latitude,
    lng: r.longitude,
    contactName: r.contact_name,
    contactMobile: r.contact_mobile,
    isDefault: r.is_default,
  };
}

export type AddressInput = Omit<SavedAddress, "id"> & { id: string | null };

export async function saveMyAddress(a: AddressInput): Promise<string> {
  const args: Record<string, unknown> = {
    p_id: a.id,
    p_label: a.label,
    p_address_line1: a.line1.trim(),
    p_is_default: a.isDefault,
  };
  const opt = (k: string, v: string | number | null) => {
    if (v !== null && v !== "") args[k] = typeof v === "string" ? v.trim() : v;
  };
  opt("p_address_line2", a.line2);
  opt("p_landmark", a.landmark);
  opt("p_city", a.city);
  opt("p_state", a.state);
  opt("p_pincode", a.pincode);
  opt("p_latitude", a.lat);
  opt("p_longitude", a.lng);
  opt("p_contact_name", a.contactName);
  opt("p_contact_mobile", a.contactMobile);
  // p_id is nullable in the RPC for new rows; generated types mark it required.
  const { data, error } = await supabase.rpc("save_my_address", args as never);
  if (error) throw new Error(error.message);
  return String(data);
}

export async function deleteMyAddress(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_my_address", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function setMyOrderAddress(orderIds: string[], addressId: string): Promise<void> {
  const { error } = await supabase.rpc("set_my_order_address", { p_order_ids: orderIds, p_address_id: addressId });
  if (error) throw new Error(error.message);
}

/** Address form validation; returns field → i18n error key. */
export function validateAddress(a: Pick<AddressInput, "line1" | "pincode" | "contactMobile">): Record<string, string> {
  const e: Record<string, string> = {};
  if (!a.line1.trim()) e["line1"] = "addresses.errLine1";
  if (a.pincode && !/^\d{6}$/.test(a.pincode.trim())) e["pincode"] = "addresses.errPincode";
  if (a.contactMobile && !/^\d{10}$/.test(a.contactMobile.replace(/\D/g, ""))) e["contactMobile"] = "addresses.errMobile";
  return e;
}

export function labelKey(label: string): string {
  return (ADDRESS_LABELS as readonly string[]).includes(label) ? `addresses.labels.${label}` : "addresses.labels.other";
}
