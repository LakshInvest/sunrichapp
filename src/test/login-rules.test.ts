import { describe, expect, it, vi } from "vitest";
import { customerThenStaff, permittedAppAccount } from "@/lib/login-rules";

describe("customer-first PIN identities", () => {
  it("falls back to staff only for not_registered", async () => {
    const check = vi.fn().mockResolvedValueOnce({ data: [{ out_result: "not_registered" }], error: null }).mockResolvedValueOnce({ data: [{ out_result: "ok", out_user_id: "sales" }], error: null });
    expect((await customerThenStaff(check)).data?.[0]?.out_user_id).toBe("sales");
    expect(check.mock.calls).toEqual([["customer"], ["staff"]]);
  });
  it.each(["ok", "wrong_pin", "locked_use_otp", "device_not_trusted"])("never retries %s as staff", async (result) => {
    const check = vi.fn().mockResolvedValue({ data: [{ out_result: result }], error: null });
    await customerThenStaff(check);
    expect(check.mock.calls).toEqual([["customer"]]);
  });
  it("does not bypass a customer RPC error", async () => {
    const check = vi.fn().mockResolvedValue({ data: null, error: { message: "offline" } });
    await customerThenStaff(check);
    expect(check).toHaveBeenCalledTimes(1);
  });
  it("accepts staff only with confirmed sales rights, even without a customer", () => {
    expect(permittedAppAccount("staff", true)).toBe(true);
    expect(permittedAppAccount("staff", false)).toBe(false);
    expect(permittedAppAccount("customer", false)).toBe(true);
    expect(permittedAppAccount(null, true)).toBe(false);
  });
});