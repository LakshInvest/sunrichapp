import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { parseProductExtras, productShareUrl } from "./product-extras";

describe("product extras", () => {
  it("share link uses the customer site", () => {
    expect(productShareUrl("abc")).toBe("https://user.sunrich.in/p/abc");
  });
  it("picks Hindi delivery text and drops empty sections", () => {
    const x = parseProductExtras({ delivery_info: "Next day", delivery_info_hi: "अगले दिन", faqs: [], highlights: null }, "hi");
    expect(x.delivery).toBe("अगले दिन");
    expect(x.faqs).toEqual([]);
    expect(x.highlights).toEqual([]);
  });
  it("reads FAQs in the chosen language", () => {
    const x = parseProductExtras({ faqs: [{ q: "Q", a: "A", q_mr: "प्र", a_mr: "उ" }] }, "mr");
    expect(x.faqs).toEqual([{ q: "प्र", a: "उ" }]);
  });
});
