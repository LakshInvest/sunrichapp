/** Shared registration validators — isomorphic, unit-tested. */

export const isValidPincode = (value: string) => /^\d{6}$/.test(value.trim());

export const isValidGstin = (value: string) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.trim().toUpperCase());
