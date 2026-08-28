import { describe, it, expect } from "vitest";
import { toWaNumber } from "./phone";

describe("toWaNumber", () => {
  it("trusts a number already written with its own country code", () => {
    // The live bug: +65 is ten digits once stripped, and used to be read as a
    // bare Indian mobile and turned into 91 6581509493.
    expect(toWaNumber("+65 8150 9493")).toBe("6581509493");
    expect(toWaNumber("+971 50 123 4567")).toBe("971501234567");
    expect(toWaNumber("+44 7700 900123")).toBe("447700900123");
    expect(toWaNumber("+33676931280")).toBe("33676931280");
  });

  it("handles the 00 international prefix", () => {
    expect(toWaNumber("00971501234567")).toBe("971501234567");
  });

  it("adds the default code only to a bare local number", () => {
    expect(toWaNumber("9820011223")).toBe("919820011223");
    expect(toWaNumber("98765 43210")).toBe("919876543210");
    expect(toWaNumber("098765 43210")).toBe("919876543210"); // trunk zero dropped
  });

  it("uses the agency's own country, not always India", () => {
    expect(toWaNumber("7700900123", "44")).toBe("447700900123");
    expect(toWaNumber("501234567", "971")).toBe("971501234567");
  });

  it("doesn't double up a code that's already there", () => {
    expect(toWaNumber("919820011223")).toBe("919820011223");
    expect(toWaNumber("447700900123", "44")).toBe("447700900123");
  });

  it("returns null when there's nothing to dial", () => {
    expect(toWaNumber(null)).toBe(null);
    expect(toWaNumber("")).toBe(null);
    expect(toWaNumber("n/a")).toBe(null);
    expect(toWaNumber("+")).toBe(null);
  });
});
