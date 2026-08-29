import { describe, it, expect } from "vitest";
import { createTransactionSchema } from "./transaction";

const base = {
  amount: "150.50",
  concept: "Súper de la semana",
  categoryId: "11111111-1111-1111-8111-111111111111",
  paidBy: "22222222-2222-2222-8222-222222222222",
  date: "2026-08-27",
  splitType: "regular" as const,
};

describe("createTransactionSchema", () => {
  it("acepta una transacción regular válida", () => {
    expect(createTransactionSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza monto negativo", () => {
    expect(createTransactionSchema.safeParse({ ...base, amount: "-10" }).success).toBe(false);
  });

  it("rechaza monto cero", () => {
    expect(createTransactionSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
  });

  it("rechaza monto no numérico", () => {
    expect(createTransactionSchema.safeParse({ ...base, amount: "abc" }).success).toBe(false);
  });

  it("rechaza concepto vacío", () => {
    expect(createTransactionSchema.safeParse({ ...base, concept: "  " }).success).toBe(false);
  });

  it("split_type custom requiere customSplitPercentage entre 0 y 100", () => {
    expect(
      createTransactionSchema.safeParse({ ...base, splitType: "custom", customSplitPercentage: "70" }).success
    ).toBe(true);
    expect(
      createTransactionSchema.safeParse({ ...base, splitType: "custom", customSplitPercentage: "150" }).success
    ).toBe(false);
  });
});
