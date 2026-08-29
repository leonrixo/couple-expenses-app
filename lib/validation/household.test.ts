import { describe, it, expect } from "vitest";
import { createHouseholdSchema } from "./household";

describe("createHouseholdSchema", () => {
  it("acepta un nombre de hogar y un porcentaje entre 0 y 100", () => {
    const result = createHouseholdSchema.safeParse({ name: "Casa Gustavo y Esperanza", ownerSplitPercentage: 60 });
    expect(result.success).toBe(true);
  });

  it("rechaza un porcentaje mayor a 100", () => {
    const result = createHouseholdSchema.safeParse({ name: "Casa", ownerSplitPercentage: 150 });
    expect(result.success).toBe(false);
  });

  it("rechaza un porcentaje negativo", () => {
    const result = createHouseholdSchema.safeParse({ name: "Casa", ownerSplitPercentage: -10 });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre vacío", () => {
    const result = createHouseholdSchema.safeParse({ name: "", ownerSplitPercentage: 60 });
    expect(result.success).toBe(false);
  });
});
