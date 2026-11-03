/** Home smart card: one at a time — overdue > out for delivery > last delivered (reorder). */
export type SmartKind = "overdue" | "dispatched" | "reorder";
export type SmartPick = { kind: SmartKind; sig: string } | null;

export function pickSmartCard(
  i: { overdue: number; dispatchedId: string | null; lastDeliveredId: string | null },
  dismissed: string | null,
): SmartPick {
  const options: SmartPick[] = [
    i.overdue > 0 ? { kind: "overdue", sig: `overdue:${Math.round(i.overdue)}` } : null,
    i.dispatchedId ? { kind: "dispatched", sig: `dispatched:${i.dispatchedId}` } : null,
    i.lastDeliveredId ? { kind: "reorder", sig: `reorder:${i.lastDeliveredId}` } : null,
  ];
  // ✕ hides only the top card; it comes back when the situation changes (new signature).
  const top = options.find((o) => o !== null) ?? null;
  return top && top.sig !== dismissed ? top : null;
}

const KEY = "sunrich.smartDismissed";
export const readDismissed = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export const writeDismissed = (sig: string) => {
  try {
    localStorage.setItem(KEY, sig);
  } catch {
    /* ignore */
  }
};
