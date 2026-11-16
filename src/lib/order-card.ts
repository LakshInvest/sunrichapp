import type { OrderDto } from "@/lib/orders";

export type OrderBill = { id: string; no: string; total: number; paid: number };
export function orderPayment(order: Pick<OrderDto, "grandTotal" | "paidAmount" | "paymentMode" | "paymentMethod" | "status">, bill?: OrderBill) {
  const total = bill?.total ?? order.grandTotal;
  const paid = bill?.paid ?? order.paidAmount;
  const due = Math.max(0, Math.round((total - paid) * 100) / 100);
  const kind = due === 0 ? "paid" : paid > 0 ? "partial" : order.paymentMode === "credit" || order.paymentMethod === "credit" ? "credit" : order.paymentMode === "cod" && !["upi", "bank"].includes(order.paymentMethod ?? "") ? "cod" : "pending";
  return { kind, due, canPay: due > 0 && !["cancelled", "rejected"].includes(order.status) };
}