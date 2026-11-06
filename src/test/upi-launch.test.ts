import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  native: true, available: true,
  pay: vi.fn(), installed: vi.fn(), openUrl: vi.fn(), canOpenUrl: vi.fn(),
  toast: vi.fn(), then: vi.fn(), state: null as null | ((s: { isActive: boolean }) => void),
}));
vi.mock("@/lib/native", () => ({ isNative: () => mocks.native }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.native ? "android" : "web", isPluginAvailable: () => mocks.available },
  registerPlugin: () => new Proxy({ pay: mocks.pay, installed: mocks.installed }, {
    get(target, key) {
      if (key === "then") return mocks.then;
      return Reflect.get(target, key);
    },
  }),
}));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn(async (_event, cb) => { mocks.state = cb; return { remove: vi.fn() }; }) } }));
vi.mock("@capacitor/app-launcher", () => ({ AppLauncher: { openUrl: mocks.openUrl, canOpenUrl: mocks.canOpenUrl } }));
vi.mock("@/components/MessageCard", () => ({ showMessage: (o: { textKey?: string }) => mocks.toast(o.textKey) }));
vi.mock("i18next", () => ({ default: { t: (key: string) => key } }));
const params = { pa: "Q507766276@ybl", pn: "Sunrich", amount: 10, orderNo: "QA" };
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers();
  mocks.native = true; mocks.available = true; mocks.state = null;
  mocks.installed.mockResolvedValue({ packages: [] });
});
afterEach(() => { vi.useRealTimers(); });

describe("UPI launch repair", () => {
  it("discovers installed apps without assimilating the native proxy", async () => {
    mocks.installed.mockResolvedValue({ packages: ["com.phonepe.app"] });
    const upi = await import("@/lib/upi");
    const discovery = upi.installedUpiApps();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await discovery).toEqual(["phonepe"]);
    expect(mocks.installed).toHaveBeenCalledTimes(1);
    expect(mocks.then).not.toHaveBeenCalled();
  });
  it("calls pay directly without invoking a native then method", async () => {
    mocks.pay.mockResolvedValue({ response: "Status=SUCCESS&ApprovalRefNo=412345678901" });
    const upi = await import("@/lib/upi");
    const payment = upi.openUpi(params);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.pay).toHaveBeenCalledTimes(1);
    expect(mocks.then).not.toHaveBeenCalled();
    expect((await payment).kind).toBe("success");
  });
  it("records plugin pay errors and reports failure", async () => {
    mocks.pay.mockRejectedValue(new Error("bridge unavailable"));
    const upi = await import("@/lib/upi");
    expect(await upi.openUpi(params)).toEqual({ kind: "noApp" });
    expect(upi.getLastUpiError()).toBe("bridge unavailable");
    expect(mocks.toast).toHaveBeenCalledWith("upi.launchError");
  });
  it("warns at exactly two seconds while pay is pending, without discarding the later reply", async () => {
    let resolvePay: ((v: { response: string }) => void) | undefined;
    mocks.pay.mockImplementation(() => new Promise((resolve) => { resolvePay = resolve; }));
    const upi = await import("@/lib/upi");
    const result = upi.openUpi(params);
    await vi.advanceTimersByTimeAsync(1999);
    expect(mocks.toast).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    resolvePay?.({ response: "Status=SUCCESS&ApprovalRefNo=412345678901" });
    expect((await result).kind).toBe("success");
  });
  it("does not warn if the phone opens an app and waits for payment", async () => {
    let resolvePay: ((v: { response: null }) => void) | undefined;
    mocks.pay.mockImplementation(() => new Promise((resolve) => { resolvePay = resolve; }));
    const upi = await import("@/lib/upi");
    const result = upi.openUpi(params);
    await vi.advanceTimersByTimeAsync(100);
    mocks.state?.({ isActive: false });
    await vi.advanceTimersByTimeAsync(2000);
    expect(mocks.toast).not.toHaveBeenCalled();
    resolvePay?.({ response: null }); await result;
  });
  it("offers all three Android apps when discovery is empty", async () => {
    const upi = await import("@/lib/upi");
    expect(upi.visibleUpiApps(await upi.installedUpiApps(), true)).toEqual(["gpay", "phonepe", "paytm"]);
    expect(upi.visibleUpiApps([], false)).toEqual([]);
  });
  it("records discovery failures and still offers Android apps", async () => {
    mocks.installed.mockRejectedValue(new Error("package visibility blocked"));
    const upi = await import("@/lib/upi");
    expect(upi.visibleUpiApps(await upi.installedUpiApps(), true)).toEqual(["gpay", "phonepe", "paytm"]);
    expect(upi.getLastUpiError()).toBe("package visibility blocked");
  });
  it("launches the selected native package and reports a missing app", async () => {
    mocks.pay.mockResolvedValue({ noApp: true });
    const upi = await import("@/lib/upi");
    await upi.openUpi(params, "gpay");
    expect(mocks.pay).toHaveBeenCalledWith({ url: upi.upiLink(params), package: "com.google.android.apps.nbu.paisa.user" });
    expect(mocks.toast).toHaveBeenCalledWith("upi.appMissing");
  });
  it("keeps AppLauncher when the custom plugin is missing and warns on failure", async () => {
    mocks.available = false; mocks.openUrl.mockResolvedValue({ completed: false });
    const upi = await import("@/lib/upi");
    await upi.openUpi(params);
    expect(mocks.openUrl).toHaveBeenCalledWith({ url: upi.upiLink(params) });
    expect(mocks.toast).toHaveBeenCalledWith("upi.launchError");
  });
});