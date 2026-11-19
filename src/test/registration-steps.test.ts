import { expect, it } from "vitest";
import { isClosedRegistrationTypeError, preselectedRegistrationType, previousRegistrationStep } from "@/lib/registration-validation";

it("preselects the single open type without choosing a closed type", () => {
  expect(preselectedRegistrationType([{ code: "HOME", selectable: false }, { code: "DISTRIBUTOR", selectable: true }], null)).toBe("DISTRIBUTOR");
});
it("rejects a previously selected closed type", () => {
  expect(preselectedRegistrationType([{ code: "HOME", selectable: false }], "HOME")).toBe(null);
});
it("preserves a selected open type when multiple types are open", () => {
  expect(preselectedRegistrationType([{ code: "HOME", selectable: true }, { code: "DISTRIBUTOR", selectable: true }], "HOME")).toBe("HOME");
});
it("back from documents reaches details", () => { expect(previousRegistrationStep("docs")).toBe("details"); });
it("back from details reaches type", () => { expect(previousRegistrationStep("details")).toBe("type"); });
it("back from type reaches login", () => { expect(previousRegistrationStep("type")).toBe("auth"); });
it("recognizes the backend closed-type rejection", () => {
  expect(isClosedRegistrationTypeError({ message: "This customer type is not open for registration. Contact office." })).toBe(true);
  expect(isClosedRegistrationTypeError({ message: "Network unavailable" })).toBe(false);
});