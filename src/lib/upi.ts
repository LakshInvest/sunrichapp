import { isNative } from "@/lib/native";

export type UpiParams = { pa: string; pn: string; amount: number; orderNo: string; ref?: string; note?: string };

/** Encodes a value but keeps "@" plain — some UPI apps can't read "%40" in pa. */
const enc = (v: string) => encodeURIComponent(v).replace(/%40/g, "@");

/**
 * UPI deep-link query: pa (plain @), pn, am (2 decimals), cu=INR, tn="Order <no>".
 * No "tr": it is for gateway merchants and some apps reject it with a plain merchant ID.
 */
export function upiQuery({ pa, pn, amount, orderNo, note: tn }: UpiParams): string {
  const note = tn ?? `Order ${orderNo}`;
  return [`pa=${enc(pa.trim())}`, `pn=${enc(pn)}`, `am=${amount.toFixed(2)}`, "cu=INR", `tn=${enc(note)}`].join("&");
}

export const upiLink = (p: UpiParams) => `upi://pay?${upiQuery(p)}`;

/** Kept for callers; the ref is no longer sent in the link. */
export const upiRef = (orderNo: string) => `${orderNo}${Date.now().toString(36)}`.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export type UpiApp = "gpay" | "phonepe" | "paytm";
export const UPI_APPS: { id: UpiApp; label: string; pkg: string; scheme: string }[] = [
  { id: "gpay", label: "GPay", pkg: "com.google.android.apps.nbu.paisa.user", scheme: "tez://upi/pay" },
  { id: "phonepe", label: "PhonePe", pkg: "com.phonepe.app", scheme: "phonepe://pay" },
  { id: "paytm", label: "Paytm", pkg: "net.one97.paytm", scheme: "paytmmp://pay" },
];

const PENDING_KEY = "sunrich.upiPending";
/** Remembered so the "Payment ho gaya?" sheet opens when the customer comes back. */
export function markUpiLaunched(orderId: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ orderId, at: Date.now() }));
  } catch {
    /* ignore */
  }
}
export function takeUpiReturn(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    const v = JSON.parse(raw) as { orderId: string; at: number };
    return Date.now() - v.at < 30 * 60_000 ? v.orderId : null;
  } catch {
    return null;
  }
}

/** What the UPI app told us (APK with the SunrichUpi plugin only). Never proof of payment. */
export type UpiResponse = {
  status: string;
  txnId: string | null;
  utr: string | null;
  responseCode: string | null;
  raw: string;
};
export type UpiOutcome =
  | { kind: "noApp" }
  | { kind: "launched" } // web / old APK: no response, use the "Payment done?" sheet
  | { kind: "success"; response: UpiResponse }
  | { kind: "failed"; response: UpiResponse }
  | { kind: "none"; response: UpiResponse | null }; // app closed without a usable answer

/** Parses "Status=SUCCESS&txnId=..&ApprovalRefNo=..&responseCode=00" (keys vary by app). */
export function parseUpiResponse(raw: string): UpiResponse {
  const map: Record<string, string> = {};
  for (const part of raw.split("&")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    let v = part.slice(i + 1);
    try {
      v = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      /* keep raw */
    }
    map[part.slice(0, i).trim().toLowerCase()] = v.trim();
  }
  const pick = (...k: string[]) => k.map((x) => map[x]).find((v) => v && v.toLowerCase() !== "null") ?? null;
  const utrRaw = pick("approvalrefno", "approvalref", "utr", "txnref", "trxnref");
  return {
    status: (pick("status") ?? "").toUpperCase(),
    txnId: pick("txnid"),
    utr: utrRaw && /^\d{12}$/.test(utrRaw) ? utrRaw : null,
    responseCode: pick("responsecode"),
    raw,
  };
}

export function outcomeOf(raw: string | null | undefined): UpiOutcome {
  if (!raw || !raw.trim()) return { kind: "none", response: null };
  const r = parseUpiResponse(raw);
  if (r.status === "SUCCESS" && r.utr) return { kind: "success", response: r };
  if (r.status === "FAILURE" || r.status === "FAILED") return { kind: "failed", response: r };
  return { kind: "none", response: r };
}

type NativeUpi = {
  pay(o: { url: string; package?: string }): Promise<{ response?: string | null; noApp?: boolean }>;
  installed(o: { packages: string[] }): Promise<{ packages: string[] }>;
};
let pluginPromise: Promise<NativeUpi | null> | null = null;
/** The SunrichUpi native plugin, or null on web / an APK built before it was added. */
function nativeUpi(): Promise<NativeUpi | null> {
  if (!isNative()) return Promise.resolve(null);
  pluginPromise ??= import("@capacitor/core").then(({ Capacitor, registerPlugin }) =>
    Capacitor.isPluginAvailable("SunrichUpi") ? registerPlugin<NativeUpi>("SunrichUpi") : null,
  );
  return pluginPromise;
}

/** Last launch, so the "Payment failed" sheet can retry the same payment. */
let lastLaunch: { params: UpiParams; app?: UpiApp | undefined; orderId?: string | null | undefined } | null = null;
export const getLastUpiLaunch = () => lastLaunch;

type Listener = (orderId: string | null, outcome: UpiOutcome) => void;
const listeners = new Set<Listener>();
/** Screens subscribe to native UPI results (UpiReturnSheet). */
export function onUpiOutcome(cb: Listener): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

/**
 * Opens the UPI chooser (or one app). APK with the plugin: startActivityForResult, so we
 * get Status/txnId/UTR back. Older APK: AppLauncher intent. Web: plain link.
 */
export async function openUpi(p: UpiParams, app?: UpiApp, orderId?: string | null): Promise<UpiOutcome> {
  lastLaunch = { params: p, app, orderId };
  const query = upiQuery(p);
  const target = app ? UPI_APPS.find((a) => a.id === app) : undefined;
  const plugin = await nativeUpi();
  if (plugin) {
    try {
      const res = await plugin.pay({ url: `upi://pay?${query}`, ...(target ? { package: target.pkg } : {}) });
      if (res.noApp) return { kind: "noApp" };
      const outcome = outcomeOf(res.response);
      takeUpiReturn(); // the result replaces the generic resume prompt
      listeners.forEach((l) => l(orderId ?? null, outcome));
      return outcome;
    } catch {
      return { kind: "noApp" };
    }
  }
  if (orderId) markUpiLaunched(orderId);
  const url = target ? `${target.scheme}?${query}` : `upi://pay?${query}`;
  if (isNative()) {
    try {
      const { AppLauncher } = await import("@capacitor/app-launcher");
      const { completed } = await AppLauncher.openUrl({ url });
      return completed ? { kind: "launched" } : { kind: "noApp" };
    } catch {
      return { kind: "noApp" };
    }
  }
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.click();
  return { kind: "launched" };
}

/** UPI apps installed on this phone (Android needs the <queries> entries in the manifest). */
export async function installedUpiApps(): Promise<UpiApp[]> {
  if (!isNative()) return [];
  try {
    const plugin = await nativeUpi();
    if (plugin) {
      const { packages } = await plugin.installed({ packages: UPI_APPS.map((a) => a.pkg) });
      return UPI_APPS.filter((a) => packages.includes(a.pkg)).map((a) => a.id);
    }
    const { AppLauncher } = await import("@capacitor/app-launcher");
    const res = await Promise.all(
      UPI_APPS.map(async (a) => ((await AppLauncher.canOpenUrl({ url: a.pkg })).value ? a.id : null)),
    );
    return res.filter((x): x is UpiApp => x !== null);
  } catch {
    return [];
  }
}

/** Calls back when the customer returns to the app (native resume or tab visible again). */
export function onAppReturn(cb: () => void): () => void {
  let off = () => undefined as void;
  if (isNative()) {
    void import("@capacitor/app").then(({ App }) => {
      const h = App.addListener("appStateChange", (s) => s.isActive && cb());
      off = () => void h.then((x) => x.remove());
    });
  }
  const vis = () => document.visibilityState === "visible" && cb();
  document.addEventListener("visibilitychange", vis);
  return () => {
    off();
    document.removeEventListener("visibilitychange", vis);
  };
}
