import { supabase } from "@/integrations/supabase/client";

export type ProductExtras = {
  images: { url: string; alt: string | null }[];
  highlights: string[];
  faqs: { q: string; a: string }[];
  delivery: string | null;
};

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Picks the language version of a value: plain string, {en,hi,mr}, or row keys like text/text_hi. */
function pickLang(v: unknown, lang: string, base = "text"): string | null {
  if (typeof v === "string") return str(v);
  if (!v || typeof v !== "object") return null;
  const o = v as Row;
  return str(o[lang]) ?? str(o[`${base}_${lang}`]) ?? str(o["en"]) ?? str(o[base]) ?? null;
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (s.startsWith("[")) {
      try {
        const p = JSON.parse(s);
        return Array.isArray(p) ? p : [];
      } catch {
        /* fall through */
      }
    }
    return s ? s.split(/\r?\n/).map((x) => x.replace(/^[-•*]\s*/, "")).filter(Boolean) : [];
  }
  if (v && typeof v === "object") {
    // { en: [...], hi: [...] }
    return [];
  }
  return [];
}

export function parseProductExtras(raw: unknown, lang: string): ProductExtras {
  const r = (Array.isArray(raw) ? raw[0] : raw) as Row | null;
  const row = (r && typeof r === "object" && "product" in r ? (r["product"] as Row) : r) ?? {};
  const langList = (v: unknown) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Row;
      return asArray(o[lang] ?? o["en"]);
    }
    return asArray(v);
  };
  const images = asArray(row["image_list"])
    .map((i) => {
      if (typeof i === "string") return { url: i, alt: null };
      const o = (i ?? {}) as Row;
      return { url: str(o["url"]) ?? "", alt: str(o["alt"]) };
    })
    .filter((i) => /^https?:\/\//.test(i.url));
  const highlights = langList(row["highlights"])
    .map((h) => pickLang(h, lang))
    .filter((h): h is string => !!h);
  const faqs = langList(row["faqs"])
    .map((f) => {
      const o = (f ?? {}) as Row;
      const q = pickLang(o["q"] ?? o["question"], lang) ?? str(o[`question_${lang}`]) ?? str(o[`q_${lang}`]);
      const a = pickLang(o["a"] ?? o["answer"], lang) ?? str(o[`answer_${lang}`]) ?? str(o[`a_${lang}`]);
      const ql = str(o[`question_${lang}`]) ?? str(o[`q_${lang}`]) ?? q;
      const al = str(o[`answer_${lang}`]) ?? str(o[`a_${lang}`]) ?? a;
      return ql && al ? { q: ql, a: al } : null;
    })
    .filter((f): f is { q: string; a: string } => !!f);
  const delivery = (lang !== "en" ? str(row[`delivery_info_${lang}`]) : null) ?? str(row["delivery_info"]);
  return { images, highlights, faqs, delivery };
}

export async function fetchProductExtras(id: string): Promise<unknown> {
  const { data, error } = await supabase.rpc("my_product", { p_id: id });
  if (error) throw error;
  return data;
}

export const productShareUrl = (id: string) => `https://user.sunrich.in/p/${id}`;
