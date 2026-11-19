import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { canRefresh, REFRESH_INTERVAL_MS, requestDataRefresh, setRefreshForeground } from "@/lib/data-refresh";
import { mapSettings } from "@/lib/app-settings";

afterEach(() => { vi.useRealTimers(); setRefreshForeground(true); });
describe("foreground refresh", () => {
  it("polls every 30 seconds only while foreground and connected", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    const refresh = vi.fn();
    const hook = renderHook(() => useDataRefresh(refresh, true));
    expect(REFRESH_INTERVAL_MS).toBe(30_000);
    await act(() => vi.advanceTimersByTimeAsync(29_999));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(refresh).toHaveBeenCalledTimes(1);
    setRefreshForeground(false);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    setRefreshForeground(true);
    await act(async () => requestDataRefresh());
    expect(refresh).toHaveBeenCalledTimes(2);
    hook.unmount();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(canRefresh(false, true, true)).toBe(false);
    expect(canRefresh(true, false, true)).toBe(false);
  });
  it("refreshes non-polling lists on resume/action signals", async () => {
    const refresh = vi.fn();
    const hook = renderHook(() => useDataRefresh(refresh));
    await act(async () => requestDataRefresh());
    expect(refresh).toHaveBeenCalledTimes(1);
    hook.unmount();
  });
});
describe("distributor delivery switch", () => {
  it("is off by default and only true enables it", () => {
    expect(mapSettings({}).distributorDeliveryEnabled).toBe(false);
    expect(mapSettings({ distributor_delivery_enabled: false }).distributorDeliveryEnabled).toBe(false);
    expect(mapSettings({ distributor_delivery_enabled: "true" }).distributorDeliveryEnabled).toBe(false);
    expect(mapSettings({ distributor_delivery_enabled: true }).distributorDeliveryEnabled).toBe(true);
  });
});