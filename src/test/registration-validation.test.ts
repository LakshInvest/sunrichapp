import { describe, expect, it } from "vitest";
import { locationArgs, isValidGstin, isValidPincode } from "@/lib/registration-validation";
import { serverMessage } from "@/lib/form-errors";

// Prompt-30 task 2: the picked map location must be saved with the
// registration data for every customer type, not just GPS-required ones.
describe("registration location args", () => {
  const picked = { lat: 18.402252, lng: 76.584212, accuracy: 12 };

  it("sends lat/lng (and accuracy) whenever a location was picked", () => {
    const args = locationArgs(picked, true);
    expect(args["p_latitude"]).toBe(18.402252);
    expect(args["p_longitude"]).toBe(76.584212);
    expect(args["p_location_accuracy_m"]).toBe(12);
  });

  it("omits the location keys when nothing was picked", () => {
    expect(Object.keys(locationArgs(picked, false))).toEqual([]);
  });

  it("omits accuracy when the pick came from the map, not GPS", () => {
    const args = locationArgs({ lat: 18.4, lng: 76.58, accuracy: null }, true);
    expect(args["p_latitude"]).toBe(18.4);
    expect("p_location_accuracy_m" in args).toBe(false);
  });

  it("still validates pincodes and GST numbers", () => {
    expect(isValidPincode("413512")).toBe(true);
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
  });
});

// Prompt-30 task 12: users never see raw Supabase/JS/HTTP errors.
describe("friendly error mapping", () => {
  it("maps network failures to the internet-connection message", () => {
    expect(serverMessage(new Error("Failed to fetch"), "fallback")).toMatch(/internet connection/i);
    expect(serverMessage(new Error("NetworkError when attempting to fetch resource."), "fallback")).toMatch(/internet connection/i);
  });

  it("hides technical database and permission errors", () => {
    expect(serverMessage(new Error('new row violates row-level security policy "customers_insert"'), "Something went wrong")).toBe("Something went wrong");
    expect(serverMessage(new Error("Invalid API key in request header"), "Something went wrong")).toBe("Something went wrong");
    expect(serverMessage(new Error("duplicate key value violates unique constraint"), "Something went wrong")).toBe("Something went wrong");
  });

  it("keeps short, human server messages", () => {
    expect(serverMessage(new Error("Location is required"), "fallback")).toBe("Location is required");
    expect(serverMessage(new Error("Registration already submitted"), "fallback")).toBe("Registration already submitted");
  });

  it("falls back when there is no message", () => {
    expect(serverMessage(undefined, "Could not save")).toBe("Could not save");
  });
});
