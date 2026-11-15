import { describe, expect, it } from "vitest";
import { formatDistance, sortNearest } from "./gmaps";

describe("address search nearest first", () => {
  it("sorts by distance ascending", () => {
    const r = sortNearest([{ distanceMeters: 5000 }, { distanceMeters: 1200 }, { distanceMeters: 30000 }]);
    expect(r.map((x) => x.distanceMeters)).toEqual([1200, 5000, 30000]);
  });
  it("hides results over 300 km when closer ones exist", () => {
    expect(sortNearest([{ distanceMeters: 400_000 }, { distanceMeters: 2000 }]).map((x) => x.distanceMeters)).toEqual([2000]);
  });
  it("keeps far results when nothing is closer", () => {
    expect(sortNearest([{ distanceMeters: 400_000 }])).toHaveLength(1);
  });
  it("shows 2.3 km", () => {
    expect(formatDistance(2300)).toBe("2.3 km");
  });
});
