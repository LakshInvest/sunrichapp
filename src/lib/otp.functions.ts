import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { customerThenStaff } from "@/lib/login-rules";

// Error codes are translated in the browser (auth.errors.*).
export type OtpResult =
  | { ok: true; tokenHash?: string; trusted?: boolean; use_pin?: boolean }
  | { ok: false; code: string; seconds?: number; left?: number; message?: string };

// Statuses come from the check_pin RPC; translated in the browser (auth.pin.*).
export type PinLoginResult =
  | { ok: true; tokenHash: string }
  | {
      ok: false;
      status: "not_registered" | "device_not_trusted" | "pin_not_set" | "locked_use_otp" | "wrong_pin" | "generic";
      triesLeft?: number;
      lockMinutes?: number;
    };

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

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function requestIp() {
  return getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mobile: z.string() }).parse(d))
  .handler(async ({ data }): Promise<OtpResult> => {
    const m10 = data.mobile.replace(/\D/g, "").slice(-10);
    if (!mobileSchema.safeParse(m10).success) return { ok: false, code: "invalidMobile" };
    const mobile = `+91${m10}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // New numbers may sign up: only existing profiles are gated here.
    const { data: customer } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, user_type, is_active")
      .in("mobile", variants(m10))
      .eq("user_type", "customer")
      .limit(1)
      .maybeSingle();
    const profile = customer ?? (await supabaseAdmin.from("user_profiles").select("id, full_name, user_type, is_active").in("mobile", variants(m10)).eq("user_type", "staff").limit(1).maybeSingle()).data;
    if (profile) {
      if (!profile.is_active) return { ok: false, code: "blocked" };
    }

    // Store reviewer demo numbers: no WhatsApp, open the PIN screen instead.
    const { data: isDemo, error: demoErr } = await supabaseAdmin.rpc("is_demo_mobile", { p_mobile: mobile });
    if (demoErr) console.error("is_demo_mobile failed", demoErr.message);
    else console.info("[sunrich] is_demo_mobile", mobile.slice(-4), isDemo);
    if (isDemo === true) return { ok: true, use_pin: true };

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

    // Max 10 OTP requests per IP address per hour.
    const ip = requestIp();
    if (ip) {
      const { count } = await supabaseAdmin
        .from("otp_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", ip)
        .eq("purpose", "app_login")
        .gte("created_at", hourAgo);
      if ((count ?? 0) >= 10) return { ok: false, code: "ipLimit" };
    }

    const otp = makeOtp();
    const { error: insErr } = await supabaseAdmin.from("otp_requests").insert({
      user_id: profile?.id ?? null,
      channel: "whatsapp",
      purpose: "app_login",
      destination: mobile,
      code_hash: await sha256Hex(otp),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      ip_address: ip,
      user_agent: getRequestHeader("user-agent")?.slice(0, 500) ?? null,
    });
    if (insErr) {
      console.error("otp insert failed", insErr.message);
      return { ok: false, code: "generic" };
    }

    const apiKey = process.env["AISENSY_API_KEY"];
    const campaign = process.env["AISENSY_OTP_CAMPAIGN"];
    if (!apiKey || !campaign) {
      console.error("[otp] send skipped: AISENSY_API_KEY or AISENSY_OTP_CAMPAIGN missing");
      return { ok: false, code: "notSent" };
    }
    try {
      const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          campaignName: campaign,
          destination: `91${m10}`,
          userName: profile?.full_name ?? m10,
          templateParams: [otp],
          buttons: [{ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: otp }] }],
        }),
      });
      const text = await res.text();
      console.info("[otp] aisensy", res.status, m10.slice(-4), text.split(apiKey).join("***").slice(0, 300));
      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j.message ?? j.errorMessage ?? j.error ?? text;
        } catch {
          /* plain text */
        }
        msg = String(msg).split(apiKey).join("***").slice(0, 300);
        console.error("aisensy error", res.status, msg);
        return { ok: false, code: "notSent", message: msg };
      }
    } catch (e) {
      console.error("aisensy fetch failed", (e as Error).message);
      return { ok: false, code: "notSent" };
    }
    return { ok: true };
  });

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Creates the customer user_profiles row; deletes a freshly created auth user on failure. */
async function createCustomerProfile(admin: Admin, uid: string, m10: string, mobile: string, fresh: boolean) {
  const { data: company } = await admin.from("companies").select("id").eq("code", "SUNRICH").maybeSingle();
  const { error } = company
    ? await admin.from("user_profiles").insert({ id: uid, company_id: company.id, user_type: "customer", full_name: m10, mobile })
    : { error: { message: "SUNRICH company missing" } };
  if (error) {
    console.error("profile create failed", error.message);
    if (fresh) await admin.auth.admin.deleteUser(uid);
    return false;
  }
  return true;
}

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ mobile: z.string(), code: z.string().regex(/^\d{6}$/), deviceId: z.string().min(16).max(200).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<OtpResult> => {
    const m10 = data.mobile.replace(/\D/g, "").slice(-10);
    if (!mobileSchema.safeParse(m10).success) return { ok: false, code: "invalidMobile" };
    const mobile = `+91${m10}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: customer } = await supabaseAdmin
      .from("user_profiles")
      .select("id, user_type, is_active")
      .in("mobile", variants(m10))
      .eq("user_type", "customer")
      .limit(1)
      .maybeSingle();
    const profile = customer ?? (await supabaseAdmin.from("user_profiles").select("id, user_type, is_active").in("mobile", variants(m10)).eq("user_type", "staff").limit(1).maybeSingle()).data;
    if (profile) {
      if (!profile.is_active) return { ok: false, code: "blocked" };
    }

    const { data: row } = await supabaseAdmin
      .from("otp_requests")
      .select("id, user_id, code_hash, attempts, max_attempts, expires_at")
      .eq("destination", mobile)
      .eq("purpose", "app_login")
      // Match the selected customer-first identity, including staff OTPs.
      .or(profile ? `user_id.is.null,user_id.eq.${profile.id}` : "user_id.is.null")
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

    // The OTP is consumed only after the sign-in link exists (see below), so a
    // failure after a correct code lets the customer retry the same code.

    // Resolve the account; new numbers get one created on the fly.
    let uid: string | null = profile?.id ?? null;
    if (!uid) {
      // Try the normal customer email, then an alternate one: a staff user can
      // hold the first as an old identity (seen for a staff+customer number).
      let list: { id: string; email?: string }[] | null = null;
      for (const email of [`${m10}@app.sunrich.local`, `${m10}.c@app.sunrich.local`]) {
        // No `phone` on the auth user: a staff account may already hold it.
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: randomPassword(),
          email_confirm: true,
        });
        if (created?.user && !createErr) {
          if (!(await createCustomerProfile(supabaseAdmin, created.user.id, m10, mobile, true))) return { ok: false, code: "generic" };
          uid = created.user.id;
          break;
        }
        if (!/already|exists|registered/i.test(createErr?.message ?? "")) {
          console.error("auth user create failed", createErr?.message);
          return { ok: false, code: "generic" };
        }
        // Email taken: reuse that auth user only when it is a customer.
        if (!list) list = (await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data?.users ?? [];
        const existing = list.find((x) => x.email?.toLowerCase() === email);
        if (!existing) {
          console.warn("customer email held by another identity", email);
          continue;
        }
        const { data: prof } = await supabaseAdmin
          .from("user_profiles")
          .select("id, user_type, is_active")
          .eq("id", existing.id)
          .maybeSingle();
        if (prof && prof.user_type !== "customer") continue;
        if (prof && !prof.is_active) return { ok: false, code: "blocked" };
        if (!prof && !(await createCustomerProfile(supabaseAdmin, existing.id, m10, mobile, false))) return { ok: false, code: "generic" };
        uid = existing.id;
        break;
      }
    }
    if (!uid) return { ok: false, code: "generic" };

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
    const email = u?.user?.email;
    if (!email) return { ok: false, code: "noAccount" };
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.properties?.hashed_token) {
      console.error("generateLink failed", error?.message);
      return { ok: false, code: "generic" };
    }
    await supabaseAdmin.from("otp_requests").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    // Trusted-device decision happens here, on the server, so the client can skip Set PIN.
    let trusted = false;
    if (data.deviceId) {
      const { data: dev } = await supabaseAdmin
        .from("user_devices")
        .select("id")
        .eq("user_id", uid)
        .eq("device_id", data.deviceId)
        .is("revoked_at", null)
        .maybeSingle();
      trusted = !!dev;
    }
    return { ok: true, tokenHash: link.properties.hashed_token, trusted };
  });


export const PIN_MAX_TRIES = 5;
export const PIN_LOCK_MINUTES = 15;

async function customerProfile(admin: Admin, m10: string) {
  const { data } = await admin
    .from("user_profiles")
    .select("id, is_active")
    .in("mobile", variants(m10))
    .eq("user_type", "customer")
    .limit(1)
    .maybeSingle();
  return data;
}

/** Minutes left on a PIN lock (5 wrong PINs → 15 min), from user_pins. Lock expiry resets the counter. */
async function pinLock(admin: Admin, uid: string): Promise<{ none?: boolean; lockedMinutes?: number }> {
  const { data } = await admin.from("user_pins").select("failed_attempts, updated_at").eq("user_id", uid).maybeSingle();
  if (!data) return { none: true };
  const left = pinLockMinutesLeft(data.failed_attempts, data.updated_at, Date.now());
  if (left > 0) return { lockedMinutes: left };
  if (data.failed_attempts >= PIN_MAX_TRIES) {
    await admin.from("user_pins").update({ failed_attempts: 0 }).eq("user_id", uid);
  }
  return {};
}

/** Pure: minutes still locked given the fail count and the time of the last failure. */
export function pinLockMinutesLeft(fails: number, lastFailIso: string, now: number) {
  if (fails < PIN_MAX_TRIES) return 0;
  const ms = new Date(lastFailIso).getTime() + PIN_LOCK_MINUTES * 60_000 - now;
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

/** Reads the fail count after a wrong PIN and stamps the failure time (lock clock). */
async function countFail(admin: Admin, uid: string) {
  const { data } = await admin.from("user_pins").select("failed_attempts").eq("user_id", uid).maybeSingle();
  const fails = data?.failed_attempts ?? PIN_MAX_TRIES;
  await admin.from("user_pins").update({ updated_at: new Date().toISOString() }).eq("user_id", uid);
  return fails;
}


/** Mobile screen: registered number with a PIN goes straight to the PIN step (any device). */
export const pinInfo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mobile: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ hasPin: boolean; lockMinutes?: number }> => {
    const m10 = data.mobile.replace(/\D/g, "").slice(-10);
    if (!mobileSchema.safeParse(m10).success) return { hasPin: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profile = await customerProfile(supabaseAdmin, m10) ?? (await supabaseAdmin.from("user_profiles").select("id, is_active").in("mobile", variants(m10)).eq("user_type", "staff").limit(1).maybeSingle()).data;
    if (!profile || !profile.is_active) return { hasPin: false };
    const lock = await pinLock(supabaseAdmin, profile.id);
    if (lock.none) return { hasPin: false };
    return lock.lockedMinutes ? { hasPin: true, lockMinutes: lock.lockedMinutes } : { hasPin: true };
  });

/** PIN login: verifies against the check_pin RPC (service-role only) and returns a magic-link token. */
export const pinLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        mobile: z.string(),
        deviceId: z.string().min(16),
        pin: z.string().regex(/^\d{4}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PinLoginResult> => {
    const m10 = data.mobile.replace(/\D/g, "").slice(-10);
    if (!mobileSchema.safeParse(m10).success) return { ok: false, status: "not_registered" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // check_pin (database) accepts the PIN on any phone and trusts new phones;
    // always send this phone's real device id.
    const profile = await customerProfile(supabaseAdmin, m10);
    if (profile) {
      const lock = await pinLock(supabaseAdmin, profile.id);
      if (lock.none) return { ok: false, status: "pin_not_set" };
      if (lock.lockedMinutes) return { ok: false, status: "locked_use_otp", lockMinutes: lock.lockedMinutes };
    }

    const { data: rows, error } = await customerThenStaff((kind) => supabaseAdmin.rpc("check_pin_login", {
      p_mobile: `+91${m10}`,
      p_device_id: data.deviceId,
      p_pin: data.pin,
      p_user_type: kind,
    }));
    if (error) {
      console.error("check_pin_login failed", error.message);
      return { ok: false, status: "generic" };
    }
    const row = rows?.[0];
    if (!row) return { ok: false, status: "generic" };

    const result = row.out_result ?? "";
    if (result !== "ok" || !row.out_user_id) {
      if (result === "locked_use_otp") return { ok: false, status: "locked_use_otp", lockMinutes: PIN_LOCK_MINUTES };
      if (result.startsWith("wrong_pin")) {
        const failedProfile = profile ?? (await supabaseAdmin.from("user_profiles").select("id").in("mobile", variants(m10)).eq("user_type", "staff").limit(1).maybeSingle()).data;
        const fails = row.out_user_id ? await countFail(supabaseAdmin, row.out_user_id) : failedProfile ? await countFail(supabaseAdmin, failedProfile.id) : PIN_MAX_TRIES;
        if (fails >= PIN_MAX_TRIES) return { ok: false, status: "locked_use_otp", lockMinutes: PIN_LOCK_MINUTES };
        return { ok: false, status: "wrong_pin", triesLeft: PIN_MAX_TRIES - fails };
      }
      const known = ["not_registered", "device_not_trusted", "pin_not_set", "locked_use_otp"] as const;
      return { ok: false, status: (known as readonly string[]).includes(result) ? (result as (typeof known)[number]) : "generic" };
    }
    await supabaseAdmin.from("user_pins").update({ failed_attempts: 0 }).eq("user_id", row.out_user_id);

    // check_pin_login returns the sign-in email, saving a user lookup.
    const email = row.out_email;
    if (!email) return { ok: false, status: "generic" };
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error("generateLink failed", linkErr?.message);
      return { ok: false, status: "generic" };
    }
    return { ok: true, tokenHash: link.properties.hashed_token };
  });

/** Whether this device is trusted for the signed-in user (drives the Set PIN screen). */
export const getMyDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ deviceId: z.string().min(16) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dev } = await context.supabase
      .from("user_devices")
      .select("id")
      .eq("user_id", context.userId)
      .eq("device_id", data.deviceId)
      .is("revoked_at", null)
      .maybeSingle();
    return { trusted: !!dev };
  });

/**
 * First name for the "Welcome back" PIN step. Only returned when the device
 * is already trusted for that account, so a stranger cannot probe names.
 */
export const welcomeName = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mobile: z.string(), deviceId: z.string().min(16) }).parse(d))
  .handler(async ({ data }) => {
    const m10 = data.mobile.replace(/\D/g, "").slice(-10);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name")
      .in("mobile", variants(m10))
      .eq("user_type", "customer")
      .limit(1)
      .maybeSingle();
    if (!profile) return { name: null };
    const { data: dev } = await supabaseAdmin
      .from("user_devices")
      .select("id")
      .eq("user_id", profile.id)
      .eq("device_id", data.deviceId)
      .is("revoked_at", null)
      .limit(1);
    const trusted = (dev ?? []).length > 0;
    const name = trusted ? (profile.full_name ?? "").trim() : "";
    return { name: name || null };
  });
