import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { STATEMENT_LINK_SECONDS, statementPath } from "@/lib/statement-rules";

/** Active customers cannot upload ordinary registration documents; scope this privileged PDF upload to their verified customer. */
export const uploadStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ pdf: z.string().max(7_000_000), filename: z.string().regex(/^Sunrich-statement-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.pdf$/) }))
  .handler(async ({ data, context }) => {
    const { data: valid, error: sessionError } = await context.supabase.rpc("my_session_is_valid");
    if (sessionError || !valid) throw new Error("Please log in again");
    const { data: cid, error: cidError } = await context.supabase.rpc("my_customer_id");
    if (cidError || !cid) throw new Error("Customer not found");
    const { data: customer, error: accessError } = await context.supabase.from("customers").select("id").eq("id", cid).maybeSingle();
    if (accessError || !customer) throw new Error("Customer not found");
    const bytes = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0));
    if (bytes.length > 5_242_880 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Invalid statement file");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from("customer-docs");
    const path = statementPath(cid, data.filename, crypto.randomUUID());
    const { error: uploadError } = await bucket.upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) { console.error("uploadStatement: customer-docs upload", uploadError); throw new Error(uploadError.message); }
    const { data: signed, error } = await bucket.createSignedUrl(path, STATEMENT_LINK_SECONDS, { download: data.filename });
    if (error || !signed?.signedUrl) { console.error("uploadStatement: createSignedUrl", error); throw new Error(error?.message ?? "Statement link could not be created"); }
    return { url: signed.signedUrl };
  });