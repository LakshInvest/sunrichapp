import { ownCid } from "@/lib/own-customer.server-safe";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InvoiceFirm = {
  legalName: string;
  shortName: string | null;
  gstin: string | null;
  address: string;
  phone: string | null;
  upiId: string | null;
  payeeName: string | null;
};

/**
 * Firm header + default UPI for one invoice. The caller's access to the
 * invoice is verified through RLS first; firm and bank rows are then read
 * with the service role because customers cannot select them.
 */
export const getInvoiceFirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<InvoiceFirm | null> => {
    const { data: inv } = await context.supabase
      .from("invoices")
      .select("id, firm_id")
      .eq("id", data.invoiceId)
      .eq("customer_id", await ownCid(context.supabase))
      .maybeSingle();
    if (!inv) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: firm }, { data: banks }] = await Promise.all([
      supabaseAdmin
        .from("firms")
        .select("legal_name, short_name, gstin, address_line1, address_line2, city, state, pincode, phone")
        .eq("id", inv.firm_id)
        .maybeSingle(),
      supabaseAdmin
        .from("firm_bank_accounts")
        .select("upi_id, account_name, is_default")
        .eq("firm_id", inv.firm_id)
        .eq("is_active", true)
        .order("is_default", { ascending: false }),
    ]);
    if (!firm) return null;
    const bank = (banks ?? []).find((b) => b.is_default && b.upi_id) ?? (banks ?? []).find((b) => b.upi_id);
    return {
      legalName: firm.legal_name,
      shortName: firm.short_name,
      gstin: firm.gstin,
      address: [firm.address_line1, firm.address_line2, firm.city, firm.state, firm.pincode].filter(Boolean).join(", "),
      phone: firm.phone,
      upiId: bank?.upi_id ?? null,
      payeeName: bank?.account_name ?? firm.legal_name,
    };
  });
