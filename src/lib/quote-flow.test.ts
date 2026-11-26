
import { allowedPayMethods } from "./quote-flow";
describe("allowedPayMethods (Prompt-80)", () => {
  it("shows only modes switched on in Command Center", () => {
    expect(allowedPayMethods(["upi", "bank", "cash", "credit"], ["upi", "bank"], null)).toEqual(["upi", "bank"]);
  });
  it("leaves one mode when only UPI is on", () => {
    expect(allowedPayMethods(["upi", "bank", "cash"], ["upi"], null)).toEqual(["upi"]);
  });
  it("office-set mode wins even if switched off", () => {
    expect(allowedPayMethods(["upi", "bank"], ["upi", "bank"], "cash")).toEqual(["cash"]);
  });
});
