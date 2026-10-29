import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Brand = {
  id: string;
  name: string;
  nameHi: string | null;
  nameMr: string | null;
  colorHex: string;
};

export const getBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Brand[]> => {
    const { data, error } = await context.supabase
      .from("brands")
      .select("id, name, name_hi, name_mr, color_hex, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw new Error(error.message);

    return (data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      nameHi: b.name_hi ?? null,
      nameMr: b.name_mr ?? null,
      colorHex: b.color_hex ?? "#2EA3C7",
    }));
  });
