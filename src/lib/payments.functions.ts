import { ownCid } from "@/lib/own-customer.server-safe";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FirmPayInfo = {
  orderNo: string;
  grandTotal: number;
  firmName: string;
  upiId: string | null;
  payeeName: string | null;
  /** Signed URL of the firm's uploaded UPI QR, when one exists. */
  qrUrl: string | null;
  bank: { bankName: string; accountNumber: string; ifsc: string; accountName: string; branch: string | null } | null;
};

/**
 * Per-order firm payment details for the "I've paid" step. The caller's access
 * to the orders is verified through RLS first; firms / firm_bank_accounts rows
 * are then read with the service role because customers cannot select them.
 */
export const getFirmPaymentInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderIds: z.array(z.string().uuid()).min(1).max(10) }).parse(d))
  .handler(async ({ data, context }): Promise<Record<string, FirmPayInfo>> => {
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select("id, order_no, grand_total, firm_id")
      .eq("customer_id", await ownCid(context.supabase))
      .in("id", data.orderIds);
    if (error) throw new Error(error.message);
    const owned = (orders ?? []).filter((o) => o.firm_id);
    const out: Record<string, FirmPayInfo> = {};
    if (!owned.length) return out;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const firmIds = [...new Set(owned.map((o) => o.firm_id))];
    const [{ data: firms }, { data: banks }] = await Promise.all([
      supabaseAdmin
        .from("firms")
        .select("id, legal_name, short_name, upi_id, upi_payee_name, upi_qr_path")
        .in("id", firmIds),
      supabaseAdmin
        .from("firm_bank_accounts")
        .select("firm_id, bank_name, account_number, ifsc, account_name, branch, is_default, is_active")
        .in("firm_id", firmIds)
        .eq("is_active", true),
    ]);
    const firmById = new Map((firms ?? []).map((f) => [f.id, f]));
    const bankRows = banks ?? [];
    const bankByFirm = new Map<string, (typeof bankRows)[number]>();
    for (const b of bankRows) {
      const cur = bankByFirm.get(b.firm_id);
      if (!cur || (!cur.is_default && b.is_default)) bankByFirm.set(b.firm_id, b);
    }

    const signQr = async (path: string | null): Promise<string | null> => {
      if (!path) return null;
      if (/^https?:/.test(path)) return path;
      const [bucket, ...rest] = path.split("/");
      if (!bucket || !rest.length) return null;
      const { data: u } = await supabaseAdmin.storage.from(bucket).createSignedUrl(rest.join("/"), 3600);
      return u?.signedUrl ?? null;
    };

    for (const o of owned) {
      const firm = firmById.get(o.firm_id);
      const bank = bankByFirm.get(o.firm_id) ?? null;
      out[o.id] = {
        orderNo: String(o.order_no ?? ""),
        grandTotal: Number(o.grand_total ?? 0),
        firmName: firm?.short_name || firm?.legal_name || "",
        upiId: firm?.upi_id ?? null,
        payeeName: firm?.upi_payee_name ?? bank?.account_name ?? firm?.legal_name ?? null,
        qrUrl: await signQr(firm?.upi_qr_path ?? null),
        bank: bank
          ? {
              bankName: bank.bank_name,
              accountNumber: bank.account_number,
              ifsc: bank.ifsc,
              accountName: bank.account_name,
              branch: bank.branch,
            }
          : null,
      };
    }
    return out;
  });

export type KhataPayInfo = {
  firmName: string;
  upiId: string | null;
  payeeName: string | null;
  qrUrl: string | null;
  bank: FirmPayInfo["bank"];
};

/**
 * Firm payment details for Khata "Pay now" (no specific order). The firm is
 * the one with the customer's oldest open bill, else their latest order's
 * firm — both read through RLS as the caller. Firm rows are then read with
 * the service role because customers cannot select them.
 */
export const getKhataPayInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KhataPayInfo | null> => {
    const sb = context.supabase;
    const cid = await ownCid(sb);
    const { data: inv } = await sb
      .from("invoices")
      .select("firm_id, invoice_date, grand_total, amount_paid")
      .eq("customer_id", cid)
      .eq("status", "issued")
      .order("invoice_date", { ascending: true })
      .limit(50);
    let firmId = (inv ?? []).find((i) => Number(i.grand_total ?? 0) > Number(i.amount_paid ?? 0))?.firm_id ?? null;
    if (!firmId) {
      const { data: o } = await sb.from("orders").select("firm_id").eq("customer_id", cid).not("firm_id", "is", null).order("created_at", { ascending: false }).limit(1);
      firmId = o?.[0]?.firm_id ?? null;
    }
    if (!firmId) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: firm }, { data: banks }] = await Promise.all([
      supabaseAdmin.from("firms").select("legal_name, short_name, upi_id, upi_payee_name, upi_qr_path").eq("id", firmId).maybeSingle(),
      supabaseAdmin
        .from("firm_bank_accounts")
        .select("bank_name, account_number, ifsc, account_name, branch, is_default")
        .eq("firm_id", firmId)
        .eq("is_active", true),
    ]);
    const bank = (banks ?? []).sort((a, b) => Number(b.is_default) - Number(a.is_default))[0] ?? null;
    let qrUrl: string | null = null;
    const path = firm?.upi_qr_path ?? null;
    if (path && /^https?:/.test(path)) qrUrl = path;
    else if (path) {
      const [bucket, ...rest] = path.split("/");
      if (bucket && rest.length) {
        const { data: u } = await supabaseAdmin.storage.from(bucket).createSignedUrl(rest.join("/"), 3600);
        qrUrl = u?.signedUrl ?? null;
      }
    }
    return {
      firmName: firm?.short_name || firm?.legal_name || "",
      upiId: firm?.upi_id ?? null,
      payeeName: firm?.upi_payee_name ?? bank?.account_name ?? firm?.legal_name ?? null,
      qrUrl,
      bank: bank
        ? { bankName: bank.bank_name, accountNumber: bank.account_number, ifsc: bank.ifsc, accountName: bank.account_name, branch: bank.branch }
        : null,
    };
  });
