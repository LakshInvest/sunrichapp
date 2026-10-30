import { fetchMyOrders, type OrderDto } from "@/lib/orders";
import { awaitingPayment, fetchMyPaymentProofs, latestProofFor } from "@/lib/payments";

/** My UPI / bank orders still waiting for payment (no proof sent, or proof rejected). */
export async function fetchOrdersAwaitingPayment(orders?: OrderDto[]): Promise<OrderDto[]> {
  const [list, proofs] = await Promise.all([orders ? Promise.resolve(orders) : fetchMyOrders(), fetchMyPaymentProofs().catch(() => [])]);
  return list.filter((o) => awaitingPayment(o, latestProofFor(proofs, o.id)?.status ?? null));
}
