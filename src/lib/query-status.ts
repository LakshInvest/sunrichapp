/** Which translation key describes a customer_queries status chip. */
export function queryChipKey(status: string | null | undefined): "open" | "answered" | "closed" {
  if (status === "open") return "open";
  if (status === "answered") return "answered";
  return "closed";
}
