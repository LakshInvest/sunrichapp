import { describe, expect, it } from "vitest";
import { clampStaticParams, googleMapsLink, parseSuggestions } from "@/lib/maps.functions";

describe("clampStaticParams (static map bounds)", () => {
  it("rounds coordinates to 6 decimals and clamps zoom", () => {
    expect(clampStaticParams({ lat: 18.40225249, lng: 76.58421249, zoom: 99 })).toEqual({
      lat: 18.402252,
      lng: 76.584212,
      zoom: 18,
    });
    expect(clampStaticParams({ lat: 200, lng: -999, zoom: 1 })).toEqual({
      lat: 85,
      lng: -180,
      zoom: 10,
    });
  });

  it("defaults zoom to 16", () => {
    expect(clampStaticParams({ lat: 18.4, lng: 76.58 }).zoom).toBe(16);
  });
});

describe("parseSuggestions (Places API New)", () => {
  it("maps structured format and skips entries without a place id", () => {
    const out = parseSuggestions({
      suggestions: [
        {
          placePrediction: {
            placeId: "abc123",
            structuredFormat: { mainText: { text: "Main Road" }, secondaryText: { text: "Latur, Maharashtra" } },
          },
        },
        { placePrediction: { structuredFormat: { mainText: { text: "no id" } } } },
      ],
    });
    expect(out).toEqual([{ placeId: "abc123", main: "Main Road", secondary: "Latur, Maharashtra" }]);
  });

  it("falls back to text.text when structured format is missing", () => {
    const out = parseSuggestions({
      suggestions: [{ placePrediction: { placeId: "x", text: { text: "Plain label" } } }],
    });
    expect(out[0]?.main).toBe("Plain label");
  });
});

describe("googleMapsLink", () => {
  it("builds a key-free deep link", () => {
    expect(googleMapsLink(18.402252, 76.584212)).toBe(
      "https://www.google.com/maps/search/?api=1&query=18.402252,76.584212",
    );
  });
});
