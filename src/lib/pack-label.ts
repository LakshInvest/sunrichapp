import i18n from "@/lib/i18n";
/** Full selling-pack count and volume shared by catalogue, orders and bills. */
const UNIT = (s: string) => {
  const u = s.toLowerCase();
  if (/^(l|ltr|litre|liter|litres|liters)$/.test(u)) return "L";
  if (/^(ml|millilitre|milliliter)$/.test(u)) return "ml";
  return s;
};
function volume(text: string): string | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(ml|millilit(?:re|er)s?|l|ltr|lit(?:re|er)s?)\b/i);
  if (!m) return null;
  const size = Number(m[1]);
  const unit = UNIT(m[2] ?? "");
  return unit === "ml" && size >= 1000 ? `${size / 1000} L` : `${size} ${unit}`;
}
/** "Pack of 48 × 200 ml", "Jar · 10 L", or nothing when details are missing. */
export function formatPack(label: string | null | undefined, units?: number | null, volumeMl?: number | null, sellUnit?: string | null, productName?: string): string {
  const raw = (label ?? "").trim();
  const n = units ?? Number(raw.match(/(?:pack|box|case|crate|carton) of\s*(\d+)/i)?.[1] ?? raw.match(/(\d+)\s*(?:का पैक|चा पॅक|[×x])/i)?.[1] ?? NaN);
  const vol = volumeMl && volumeMl > 0 ? (volumeMl >= 1000 ? `${volumeMl / 1000} L` : `${volumeMl} ml`) : volume(raw) ?? volume(productName ?? "");
  if (!vol) return "";
  const key = (sellUnit ?? raw.match(/\b(pack|box|case|crate|carton|jar|can|bottle)\b/i)?.[1] ?? "").toLowerCase();
  if (Number.isFinite(n) && n > 1) {
    return `${i18n.t("packUnit.packOf", { n })} × ${vol}`;
  }
  const isJar = /jar|जार/.test(`${key} ${raw} ${productName ?? ""}`) || (key === "" && /L$/.test(vol) && parseFloat(vol) >= 5) || (n === 1 && /L$/.test(vol) && parseFloat(vol) >= 5);
  return isJar ? `${i18n.t("packUnit.jar")} · ${vol}` : "";
}
/** Product name with "Liter" spelled "Litre". */
export const fixName = (s: string) => s.replace(/\bLiters?\b/g, (w) => (w.endsWith("s") ? "Litres" : "Litre"));
/** Reorder summary keeps the same full pack details as product/order screens. */
export function lineShort(packLabel: string | null, productName: string, qty: number): string {
  const n = fixName(productName).trim();
  return `${formatPack(packLabel, null, null, null, productName) || n} × ${qty}`;
}
