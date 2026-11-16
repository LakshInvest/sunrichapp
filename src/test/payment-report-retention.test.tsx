import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import "@/lib/i18n";

vi.mock("@/components/SheetDrawer", () => ({ SheetDrawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/payments", () => ({
  validUtr: (value: string) => /^\d{12}$/.test(value),
  submitPaymentProof: vi.fn().mockRejectedValue(new Error("Too many payment reports today. Please contact support.")),
  attachUpiResponse: vi.fn(),
}));

import { PaymentProofSheet } from "@/components/PaymentProofSheet";

it("keeps the entered 12-digit UTR after the daily report limit rejects submission", async () => {
  const close = vi.fn();
  render(<PaymentProofSheet open onOpenChange={close} target={{ amount: 330, method: "upi" }} />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "123456789012" } });
  fireEvent.click(screen.getByRole("button", { name: "Send for checking" }));
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  expect(input).toHaveValue("123456789012");
  expect(close).not.toHaveBeenCalled();
});