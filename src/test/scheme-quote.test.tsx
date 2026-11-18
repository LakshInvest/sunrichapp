import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import "@/lib/i18n";
import { QuoteFreeLines, SchemeHints, SchemeLinePrice } from "@/components/SchemeQuote";
import type { QuoteResult } from "@/lib/orders";

it("server free lines disappear when the next quote removes them", () => {
  const quote = { lines: [{ product_id: "gift", product_name: "Gift water", qty: 1, line_total: 0, is_free: true }] } as QuoteResult;
  const view = render(<QuoteFreeLines quote={quote} />);
  expect(screen.getByText(/Gift water/)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  view.rerender(<QuoteFreeLines quote={{ ...quote, lines: [] }} />);
  expect(screen.queryByText(/Gift water/)).not.toBeInTheDocument();
});
it("a +4 hint requests exactly the server-provided four packs", () => {
  const add = vi.fn();
  const quote: QuoteResult = { items_total: 0, deposit_total: 0, tax_total: 0, parts: 1, credit_limit: 0, credit_available: 0, credit_blocked: false, overdue: 0, lines: [], scheme_hints: [{ type: "free_qty", product_id: "water", need_qty: 4, get_free_qty: 1, free_product_name: "Jar 20L", name: "10+1" }] };
  render(<SchemeHints quote={quote} onAdd={add} />);
  fireEvent.click(screen.getByRole("button", { name: "+4" }));
  expect(add).toHaveBeenCalledWith("water", 4);
});
it("line price displays the quoted net amount without deriving a discount", () => {
  render(<SchemeLinePrice gross={100} net={73} discount={27} info={[{ name: "Offer", amount: 27, free_qty: 0 }]} />);
  expect(screen.getByText("₹73")).toBeInTheDocument();
});