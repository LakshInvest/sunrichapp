/** Per-bottle rate and MRP from pack values (no extra CC fields): price ÷ units, MRP ÷ units. */
export function perUnit(p: { price: number | null; mrp: number | null; unitsPerSellUnit: number | null }) {
  const u = p.unitsPerSellUnit && p.unitsPerSellUnit > 1 ? p.unitsPerSellUnit : null;
  return {
    units: u,
    rate: u && p.price != null ? p.price / u : null,
    mrp: u && p.mrp != null ? p.mrp / u : null,
    saving: p.price != null && p.mrp != null && p.mrp > p.price ? p.mrp - p.price : null,
  };
}

/** ₹2.29 style: two decimals unless whole. */
export const rupees2 = (v: number) =>
  `₹${Number.isInteger(Math.round(v * 100) / 100) ? Math.round(v) : (Math.round(v * 100) / 100).toFixed(2)}`;
