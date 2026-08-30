import { describe, expect, it } from "vitest";
import { distanceMeters, isInsideGeofence } from "./geofence";

describe("geofence", () => {
  it("mengizinkan koordinat dalam radius", () => expect(isInsideGeofence(75, 100)).toBe(true));
  it("menolak koordinat di luar radius", () => expect(isInsideGeofence(101, 100)).toBe(false));
  it("menghitung titik yang sama sebagai nol meter", () => expect(distanceMeters(-0.5022, 117.1536, -0.5022, 117.1536)).toBe(0));
});
