import i18n from "@/lib/i18n";
/** One pack format everywhere: "Pack of 2 × 5 L", single item "1 jar · 10 L". */
const UNIT = (s: string) => {
  const u = s.toLowerCase();
  if (/^(l|ltr|litre|liter|litres|liters)$/.test(u)) return "L";
  if (/^(ml|millilitre|milliliter)$/.test(u)) return "ml";
  return s;
};
function volume(text: string): string | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(ml|millilit(?:re|er)s?|l|ltr|lit(?:re|er)s?)\b/i);
  return m ? `${m[1]} ${UNIT(m[2] ?? "")}` : null;
}
const UNIT_WORDS: Record<string, string> = { pack: "Pack", box: "Box", case: "Case", crate: "Crate", jar: "Jar", can: "Can", bottle: "Bottle", piece: "Piece", pc: "Piece", carton: "Carton" };
/** Selling unit + count, no size: "Pack of 48", "Box of 24", single item "1 Jar". */
export function formatPack(label: string | null | undefined, units?: number | null, volumeMl?: number | null, sellUnit?: string | null): string {
  const raw = (label ?? "").trim();
  const n = units ?? Number(raw.match(/(?:pack|box|case|crate|carton) of\s*(\d+)/i)?.[1] ?? raw.match(/^(\d+)\s*[×x]/)?.[1] ?? NaN);
  const vol = volume(raw) ?? (volumeMl ? `${volumeMl} ml` : null);
  const key = (sellUnit ?? raw.match(/\b(pack|box|case|crate|carton|jar|can|bottle)\b/i)?.[1] ?? "").toLowerCase();
  if (Number.isFinite(n) && n > 1) {
    const u = key && !/^(jar|can|bottle|piece|pc)$/.test(key) ? key : "pack";
    return i18n.t(`packUnit.${u}Of`, { n, defaultValue: `${UNIT_WORDS[u] ?? "Pack"} of ${n}` });
  }
  const single = /^(jar|can|bottle)$/.test(key) ? key : /jar|can/i.test(raw) || (vol && /L$/.test(vol) && parseFloat(vol) >= 5) ? "jar" : "piece";
  return i18n.t(`packUnit.one_${single}`, { defaultValue: `1 ${UNIT_WORDS[single]}` });
}
/** Product name with "Liter" spelled "Litre". */
export const fixName = (s: string) => s.replace(/\bLiters?\b/g, (w) => (w.endsWith("s") ? "Litres" : "Litre"));
/** Short order-line text: "500 ml × 1". */
export function lineShort(packLabel: string | null, productName: string, qty: number): string {
  const v = volume(packLabel ?? "") ?? volume(productName);
  return `${v ?? fixName(productName)} × ${qty}`;
}
