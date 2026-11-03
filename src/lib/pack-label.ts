/** One pack format everywhere: "Pack of 2 × 5 L", single item "1 jar · 10 L". */
const UNIT = (s: string) => {
  const u = s.toLowerCase();
  if (/^(l|ltr|litre|liter|litres|liters)$/.test(u)) return "L";
  if (/^(ml|millilitre|milliliter)$/.test(u)) return "ml";
  return s;
};
function volume(text: string): string | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(ml|millilit(?:re|er)s?|l|ltr|lit(?:re|er)s?)\b/i);
  return m ? `${m[1]} ${UNIT(m[2])}` : null;
}
export function formatPack(label: string | null | undefined, units?: number | null, volumeMl?: number | null): string {
  const raw = (label ?? "").trim();
  const vol = volume(raw) ?? (volumeMl ? (volumeMl >= 1000 ? `${volumeMl / 1000} L` : `${volumeMl} ml`) : null);
  const n = units ?? Number(raw.match(/(?:pack of|of)\s*(\d+)/i)?.[1] ?? raw.match(/^(\d+)\s*[×x]/)?.[1] ?? NaN);
  if (!vol) return raw.replace(/\bLiters?\b/gi, "Litre");
  if (Number.isFinite(n) && n > 1) return `Pack of ${n} × ${vol}`;
  return `1 ${/jar|can/i.test(raw) || /L$/.test(vol) && parseFloat(vol) >= 5 ? "jar" : "pc"} · ${vol}`;
}
/** Product name with "Liter" spelled "Litre". */
export const fixName = (s: string) => s.replace(/\bLiters?\b/g, (w) => (w.endsWith("s") ? "Litres" : "Litre"));
/** Short order-line text: "500 ml × 1". */
export function lineShort(packLabel: string | null, productName: string, qty: number): string {
  const v = volume(packLabel ?? "") ?? volume(productName);
  return `${v ?? fixName(productName)} × ${qty}`;
}
