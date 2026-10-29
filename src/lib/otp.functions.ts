import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

// Error codes are translated in the browser (auth.errors.*).
export type OtpResult =
  | { ok: true; tokenHash?: string }
  | { ok: false; code: string; seconds?: number; left?: number; message?: string };

const mobileSchema = z.string().regex(/^[6-9]\d{9}$/);

function variants(m10: string) {
  return [`+91${m10}`, m10, `91${m10}`];
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function makeOtp() {
  const arr = new Uint32Array(1);
  // Rejection sampling keeps the distribution uniform.
  let n = 0;
  do {
    crypto.getRandomValues(arr);
    n = arr[0] ?? 0;
  } while (n >= 4294000000);
  return String(n % 1_000_000).padStart(6, "0");
}

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mobile: z.string() }).parse(d))
  .handler(async ({ data }): Promise<OtpResult> => {
    const m10 = data.mobile.replace(/\D/g, "").slice(-10);
    if (!mobileSchema.safeParse(m10).success) return { ok: false, code: "invalidMobile" };
    const mobile = `+91${m10}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, is_active")
      .in("mobile", variants(m10))
      .eq("user_type", "customer")
      .limit(1)
      .maybeSingle();
    if (!profile || !profile.is_active) return { ok: false, code: "notRegistered" };

    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("otp_requests")
      .select("created_at")
      .eq("destination", mobile)
      .eq("purpose", "app_login")
      .gte("created_at", hourAgo)
      .order("created_at", { ascending: false });
    const list = recent ?? [];
    const newest = list[0];
    const oldestRow = list[list.length - 1];
    if (newest) {
      const since = (Date.now() - new Date(newest.created_at).getTime()) / 1000;
      if (since < 30) return { ok: false, code: "wait", seconds: Math.ceil(30 - since) };
    }
    if (list.length >= 5 && oldestRow) {
      const oldest = new Date(oldestRow.created_at).getTime();
      return { ok: false, code: "hourly", seconds: Math.max(1, Math.ceil((oldest + 3600_000 - Date.now()) / 1000)) };
    }

    const otp = makeOtp();
    const { error: insErr } = await supabaseAdmin.from("otp_requests").insert({
      user_id: profile.id,
      channel: "whatsapp",
      purpose: "app_login",
      destination: mobile,
      code_hash: await sha256Hex(otp),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      ip_address: getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: getRequestHeader("user-agent")?.slice(0, 500) ?? null,
    });
    if (insErr) {
      console.error("otp insert failed", insErr.message);
      return { ok: false, code: "generic" };
    }

    const apiKey = process.env["AISENSY_API_KEY"];
    const campaign = process.env["AISENSY_OTP_CAMPAIGN"];
    if (!apiKey || !campaign) return { ok: false, code: "generic" };
    try {
      const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          campaignName: campaign,
          destination: `91${m10}`,
          userName: profile.full_name,
          templateParams: [otp],
          buttons: [{ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: otp }] }],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j.message ?? j.errorMessage ?? j.error ?? text;
        } catch { /* plain text */ }
        msg = String(msg).split(apiKey).join("***").slice(0, 300);
        console.error("aisensy error", res.status, msg);
        return { ok: false, code: "provider", message: msg };
      }
    } catch (e) {
      console.error("aisensy fetch failed", (e as Error).message);
      return { ok: false, code: "generic" };
    }
    return { ok: true };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ mobile: z.string(), code: z.string().regex(/^\d{6}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<OtpResult> => {
    const m10 = data.mobile.replace(/\D/g, "").slice(-10);
    if (!mobileSchema.safeParse(m10).success) return { ok: false, code: "invalidMobile" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("otp_requests")
      .select("id, user_id, code_hash, attempts, max_attempts, expires_at")
      .eq("destination", `+91${m10}`)
      .eq("purpose", "app_login")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) return { ok: false, code: "noOtp" };
    if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, code: "expired" };
    if (row.attempts >= row.max_attempts) return { ok: false, code: "tooMany" };

    if (!safeEqual(await sha256Hex(data.code), row.code_hash)) {
      const attempts = row.attempts + 1;
      await supabaseAdmin.from("otp_requests").update({ attempts }).eq("id", row.id);
      const left = row.max_attempts - attempts;
      return left <= 0 ? { ok: false, code: "tooMany" } : { ok: false, code: "wrong", left };
    }

    await supabaseAdmin.from("otp_requests").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    if (!row.user_id) return { ok: false, code: "generic" };
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email;
    if (!email) return { ok: false, code: "noAccount" };
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.properties?.hashed_token) {
      console.error("generateLink failed", error?.message);
      return { ok: false, code: "generic" };
    }
    return { ok: true, tokenHash: link.properties.hashed_token };
  });
