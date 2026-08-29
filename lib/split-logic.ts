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
  const member = members.find((m) => m.userId === userId);
  if (!member) throw new Error(`El usuario ${userId} no es miembro de este hogar`);

  if (tx.splitType === "big") return 50;

  if (tx.splitType === "custom") {
    const owner = members.find((m) => m.role === "owner");
    if (!owner) throw new Error("El hogar no tiene un owner definido");
    const ownerPct = tx.customSplitPercentage ?? 50;
    return userId === owner.userId ? ownerPct : 100 - ownerPct;
  }

  return member.defaultSplitPercentage;
}

export function amountOwedBy(
  userId: string,
  tx: SplitTransaction,
  members: HouseholdMember[]
): number {
  const member = members.find((m) => m.userId === userId);
  if (!member) throw new Error(`El usuario ${userId} no es miembro de este hogar`);

  if (members.length !== 2) {
    // Fuera del alcance probado (hogares de más de 2 miembros); redondeo
    // independiente como antes — no garantiza suma exacta con N>2.
    const pct = percentageFor(userId, tx, members);
    return round2((tx.amount * pct) / 100);
  }

  // Con exactamente 2 miembros: elegimos un miembro "primario" de forma
  // determinista (alfabético por userId, sin importar el orden de members[]
  // ni en qué orden se llama esta función para cada miembro) para que las
  // dos partes SIEMPRE sumen exactamente tx.amount — nunca +/- 1 centavo
  // por redondeo independiente de cada mitad.
  const [primary, secondary] = [...members].sort((a, b) => a.userId.localeCompare(b.userId));

  const primaryPct = percentageFor(primary.userId, tx, members);
  const primaryOwed = round2((tx.amount * primaryPct) / 100);

  if (userId === primary.userId) return primaryOwed;
  return round2(tx.amount - primaryOwed);
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
