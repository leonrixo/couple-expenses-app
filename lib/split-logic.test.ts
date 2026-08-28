import { describe, it, expect } from "vitest";
import { percentageFor, amountOwedBy, calculateBalance, type HouseholdMember, type SplitTransaction } from "./split-logic";

const gustavo: HouseholdMember = { userId: "gustavo", role: "owner", defaultSplitPercentage: 60 };
const esperanza: HouseholdMember = { userId: "esperanza", role: "member", defaultSplitPercentage: 40 };
const members = [gustavo, esperanza];

describe("percentageFor", () => {
  it("reparto regular usa el default_split_percentage de cada miembro", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "gustavo", splitType: "regular" };
    expect(percentageFor("gustavo", tx, members)).toBe(60);
    expect(percentageFor("esperanza", tx, members)).toBe(40);
  });

  it("reparto grande siempre es 50/50 sin importar default_split_percentage", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "gustavo", splitType: "big" };
    expect(percentageFor("gustavo", tx, members)).toBe(50);
    expect(percentageFor("esperanza", tx, members)).toBe(50);
  });

  it("reparto personalizado usa custom_split_percentage para el owner y el complemento para el resto", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "esperanza", splitType: "custom", customSplitPercentage: 70 };
    expect(percentageFor("gustavo", tx, members)).toBe(70);
    expect(percentageFor("esperanza", tx, members)).toBe(30);
  });

  it("lanza error si el usuario no es miembro del hogar", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "gustavo", splitType: "regular" };
    expect(() => percentageFor("desconocido", tx, members)).toThrow();
  });

  it("lanza error si el usuario no es miembro del hogar incluso en reparto big", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "gustavo", splitType: "big" };
    expect(() => percentageFor("desconocido", tx, members)).toThrow();
  });
});

describe("amountOwedBy", () => {
  it("calcula el monto exacto con decimales y redondeo a 2 posiciones", () => {
    const tx: SplitTransaction = { amount: 99.99, paidBy: "gustavo", splitType: "regular" };
    expect(amountOwedBy("gustavo", tx, members)).toBeCloseTo(59.99, 2);
    expect(amountOwedBy("esperanza", tx, members)).toBeCloseTo(40.0, 2);
  });

  it("con montos odd-cent en reparto big, los dos miembros siempre suman exactamente el monto total", () => {
    const tx: SplitTransaction = { amount: 19.99, paidBy: "gustavo", splitType: "big" };
    const gustavoOwed = amountOwedBy("gustavo", tx, members);
    const esperanzaOwed = amountOwedBy("esperanza", tx, members);
    expect(gustavoOwed + esperanzaOwed).toBeCloseTo(19.99, 2);
  });
});

describe("calculateBalance", () => {
  it("una sola transacción regular deja al que no pagó debiendo su parte", () => {
    const txs: SplitTransaction[] = [{ amount: 100, paidBy: "gustavo", splitType: "regular" }];
    const balance = calculateBalance(txs, members);
    expect(balance["gustavo"]).toBeCloseTo(40, 2);
    expect(balance["esperanza"]).toBeCloseTo(-40, 2);
  });

  it("una transacción grande 50/50 reparte la deuda a la mitad", () => {
    const txs: SplitTransaction[] = [{ amount: 100, paidBy: "esperanza", splitType: "big" }];
    const balance = calculateBalance(txs, members);
    expect(balance["esperanza"]).toBeCloseTo(50, 2);
    expect(balance["gustavo"]).toBeCloseTo(-50, 2);
  });

  it("varias transacciones se netean correctamente", () => {
    const txs: SplitTransaction[] = [
      { amount: 100, paidBy: "gustavo", splitType: "regular" }, // gustavo +40
      { amount: 50, paidBy: "esperanza", splitType: "big" }, // esperanza +25, gustavo -25
    ];
    const balance = calculateBalance(txs, members);
    expect(balance["gustavo"]).toBeCloseTo(15, 2);
    expect(balance["esperanza"]).toBeCloseTo(-15, 2);
  });

  it("el balance de ambos miembros siempre suma cero", () => {
    const txs: SplitTransaction[] = [
      { amount: 733.5, paidBy: "gustavo", splitType: "regular" },
      { amount: 120, paidBy: "esperanza", splitType: "custom", customSplitPercentage: 25 },
      { amount: 40, paidBy: "gustavo", splitType: "big" },
    ];
    const balance = calculateBalance(txs, members);
    expect(balance["gustavo"] + balance["esperanza"]).toBeCloseTo(0, 2);
  });
});
