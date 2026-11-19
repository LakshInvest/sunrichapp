/** Shared registration validators — isomorphic, unit-tested. */

export const isValidPincode = (value: string) => /^\d{6}$/.test(value.trim());

export type RegistrationStep = "type" | "details" | "docs";
export const previousRegistrationStep = (step: RegistrationStep): RegistrationStep | "auth" =>
  step === "docs" ? "details" : step === "details" ? "type" : "auth";

export const preselectedRegistrationType = <T extends { code: string; selectable: boolean }>(types: T[], selected: string | null): string | null => {
  if (types.some((type) => type.code === selected && type.selectable)) return selected;
  const open = types.filter((type) => type.selectable);
  return open.length === 1 ? open[0]?.code ?? null : null;
};

export const isClosedRegistrationTypeError = (error: unknown): boolean => {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
  return /this customer type is not open for registration/i.test(message);
};

export const isValidGstin = (value: string) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.trim().toUpperCase());

/** start_registration arguments for the picked map location (any customer type). */
export const locationArgs = (
  location: { lat: number; lng: number; accuracy: number | null },
  known: boolean,
): Record<string, number> => {
  if (!known) return {};
  return {
    p_latitude: location.lat,
    p_longitude: location.lng,
    ...(location.accuracy != null ? { p_location_accuracy_m: location.accuracy } : {}),
  } as Record<string, number>;
};
