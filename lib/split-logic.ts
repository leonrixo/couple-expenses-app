export type SplitType = "regular" | "big" | "custom";

export interface HouseholdMember {
  userId: string;
  role: "owner" | "member";
  defaultSplitPercentage: number;
}

export interface SplitTransaction {
  amount: number;
  paidBy: string;
  splitType: SplitType;
  customSplitPercentage?: number | null;
}

export interface Balance {
  [userId: string]: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function percentageFor(
  userId: string,
  tx: SplitTransaction,
  members: HouseholdMember[]
): number {
  if (tx.splitType === "big") return 50;

  if (tx.splitType === "custom") {
    const owner = members.find((m) => m.role === "owner");
    if (!owner) throw new Error("El hogar no tiene un owner definido");
    const ownerPct = tx.customSplitPercentage ?? 50;
    return userId === owner.userId ? ownerPct : 100 - ownerPct;
  }

  const member = members.find((m) => m.userId === userId);
  if (!member) throw new Error(`El usuario ${userId} no es miembro de este hogar`);
  return member.defaultSplitPercentage;
}

export function amountOwedBy(
  userId: string,
  tx: SplitTransaction,
  members: HouseholdMember[]
): number {
  const pct = percentageFor(userId, tx, members);
  return round2((tx.amount * pct) / 100);
}

export function calculateBalance(
  transactions: SplitTransaction[],
  members: HouseholdMember[]
): Balance {
  const balance: Balance = {};
  for (const m of members) balance[m.userId] = 0;

  for (const tx of transactions) {
    for (const m of members) {
      const owed = amountOwedBy(m.userId, tx, members);
      if (m.userId === tx.paidBy) {
        balance[m.userId] = round2(balance[m.userId] + (tx.amount - owed));
      } else {
        balance[m.userId] = round2(balance[m.userId] - owed);
      }
    }
  }
  return balance;
}
