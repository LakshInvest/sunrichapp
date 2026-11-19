type PinRow = { out_result: string; out_user_id: string | null; out_email: string | null };
type PinResponse = { data: PinRow[] | null; error: { message: string } | null };
/** Never retry a wrong/locked customer PIN against a staff identity. */
export async function customerThenStaff(check: (kind: "customer" | "staff") => PromiseLike<PinResponse>) {
  const customer = await check("customer");
  return !customer.error && customer.data?.[0]?.out_result === "not_registered" ? await check("staff") : customer;
}
export function permittedAppAccount(userType: string | null | undefined, isSales: boolean) {
  return userType === "customer" || (userType === "staff" && isSales);
}