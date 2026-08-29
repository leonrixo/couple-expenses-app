import { describe, it, expect } from "vitest";
import { DEFAULT_CATEGORIES } from "./default-categories";

describe("DEFAULT_CATEGORIES", () => {
  it("tiene exactamente las 12 categorías del análisis histórico", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(12);
    expect(DEFAULT_CATEGORIES).toContain("Tienda/Súper");
    expect(DEFAULT_CATEGORIES).toContain("Renta");
  });

  it("no tiene nombres duplicados", () => {
    expect(new Set(DEFAULT_CATEGORIES).size).toBe(DEFAULT_CATEGORIES.length);
  });
});
