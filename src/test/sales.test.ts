import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearSales, getSalesInfo, parseWhoami } from "@/lib/sales";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
beforeEach(async () => { rpc.mockResolvedValue({ data: null, error: null }); await clearSales(); rpc.mockReset(); });

describe("sales mode", () => {
  it("is on for sales staff without an own customer login", () => {
    expect(parseWhoami("u", { is_sales: true, own_customer_login: false }).isSales).toBe(true);
  });
  it("uses is_sales even when the RPC also reports an own customer login", () => {
    expect(parseWhoami("u", { is_sales: true, own_customer_login: true }).isSales).toBe(true);
  });
  it("hides sales controls for a normal customer", () => {
    expect(parseWhoami("u", { is_sales: false, picked: { id: "x", business_name: "Store" } })).toEqual({ uid: "u", isSales: false, picked: null });
  });
  it("calls whoami only once per session until resume refresh", async () => {
    rpc.mockResolvedValue({ data: { is_sales: true }, error: null });
    await getSalesInfo("u"); await getSalesInfo("u");
    expect(rpc).toHaveBeenCalledTimes(1);
    await getSalesInfo("u", true);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("hides previously confirmed sales controls when refresh fails", async () => {
    rpc.mockResolvedValueOnce({ data: { is_sales: true }, error: null });
    expect((await getSalesInfo("u")).isSales).toBe(true);
    rpc.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    expect((await getSalesInfo("u", true)).isSales).toBe(false);
  });
  it("hides sales controls when the request throws", async () => {
    rpc.mockRejectedValueOnce(new Error("offline"));
    expect((await getSalesInfo("u")).isSales).toBe(false);
  });
});
