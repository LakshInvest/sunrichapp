import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearUserCaches, readSwr, swr, SCREEN_CACHE_MS, SCREEN_FRESH_MS } from "@/lib/swr-cache";
import { sizedUrl } from "@/components/SmartImage";

beforeEach(() => { vi.useFakeTimers(); clearUserCaches(); });
afterEach(() => { vi.useRealTimers(); clearUserCaches(); });
describe("screen cache", () => {
  it("reuses data for 60 seconds and retains it for ten minutes", async () => {
    const fetch = vi.fn().mockResolvedValue({ balance: 120 });
    expect(SCREEN_FRESH_MS).toBe(60_000);
    expect(SCREEN_CACHE_MS).toBe(600_000);
    await swr("khata.sum", fetch);
    await vi.advanceTimersByTimeAsync(59_999);
    await swr("khata.sum", fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await swr("khata.sum", fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(600_001);
    expect(readSwr("khata.sum")).toBeNull();
  });
  it("deduplicates concurrent requests and forces refresh after an action", async () => {
    const fetch = vi.fn().mockResolvedValue(["order"]);
    await Promise.all([swr("orders", fetch), swr("orders", fetch)]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await swr("orders", fetch, true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("never repopulates the previous store cache after it is cleared", async () => {
    let resolve: ((value: string[]) => void) | undefined;
    const pending = swr("orders", () => new Promise<string[]>((done) => { resolve = done; }));
    await Promise.resolve();
    clearUserCaches(); resolve?.(["old-store-order"]); await pending;
    expect(readSwr("orders")).toBeNull();
  });
});
describe("image sizes", () => {
  it("requests 400px product and 1080px banner renditions without doubling", () => {
    const src = "https://example.supabase.co/storage/v1/object/public/products/photo.jpg";
    expect(new URL(sizedUrl(src, 400)).searchParams.get("width")).toBe("400");
    expect(new URL(sizedUrl(src, 1080)).searchParams.get("width")).toBe("1080");
    expect(sizedUrl("/fallback.webp", 400)).toBe("/fallback.webp");
  });
});