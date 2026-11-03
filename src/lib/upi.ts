import { isNative } from "@/lib/native";

export type UpiParams = { pa: string; pn: string; amount: number; orderNo: string; ref: string };

/** Standard UPI deep-link query: pa, pn, am (2 decimals), cu=INR, tn="Order <no>", tr=unique ref. */
export function upiQuery({ pa, pn, amount, orderNo, ref }: UpiParams): string {
  const q = new URLSearchParams({
    pa,
    pn,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Order ${orderNo}`,
    tr: ref.replace(/[^A-Za-z0-9]/g, "").slice(0, 35),
  });
  return q.toString().replace(/\+/g, "%20");
}

export const upiLink = (p: UpiParams) => `upi://pay?${upiQuery(p)}`;

/** Unique transaction ref: order no + time, alphanumeric only. */
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

/**
 * Opens the UPI chooser (or one app). Native: an Android intent via AppLauncher, so the
 * WebView never navigates to upi:// (that showed "Something went wrong"). Web: plain link.
 */
export async function openUpi(p: UpiParams, app?: UpiApp): Promise<boolean> {
  const query = upiQuery(p);
  const target = app ? UPI_APPS.find((a) => a.id === app) : undefined;
  const url = target ? `${target.scheme}?${query}` : `upi://pay?${query}`;
  if (isNative()) {
    try {
      const { AppLauncher } = await import("@capacitor/app-launcher");
      const { completed } = await AppLauncher.openUrl({ url });
      return completed;
    } catch {
      return false;
    }
  }
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.click();
  return true;
}

/** UPI apps installed on this phone (Android needs the <queries> entries in the manifest). */
export async function installedUpiApps(): Promise<UpiApp[]> {
  if (!isNative()) return [];
  try {
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
