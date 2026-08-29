import { describe, it, expect } from "vitest";
import { calculateBalance, type HouseholdMember, type SplitTransaction } from "@/lib/split-logic";

describe("balance mostrado en la página principal", () => {
  it("con transacciones mixtas, el signo indica correctamente quién debe a quién", () => {
    const members: HouseholdMember[] = [
      { userId: "u1", role: "owner", defaultSplitPercentage: 60 },
      { userId: "u2", role: "member", defaultSplitPercentage: 40 },
    ];
    const txs: SplitTransaction[] = [
      { amount: 1000, paidBy: "u1", splitType: "regular" },
      { amount: 200, paidBy: "u2", splitType: "big" },
    ];
    const balance = calculateBalance(txs, members);

    // u1 pagó 1000 pero solo le tocaban 600 -> le deben 400, menos los 100 que le debe a u2 del gasto grande
    expect(balance["u1"]).toBeCloseTo(400 - 100, 2);
    expect(balance["u2"]).toBeCloseTo(-(400 - 100), 2);
  });
});
