import type { Balance } from "@/lib/split-logic";

interface BalanceCardProps {
  balance: Balance;
  members: { userId: string; displayName: string }[];
}

export function BalanceCard({ balance, members }: BalanceCardProps) {
  const [a, b] = members;
  if (!a || !b) return null;

  const balanceA = balance[a.userId] ?? 0;
  const isSquared = Math.abs(balanceA) < 0.01;

  let text: string;
  if (isSquared) {
    text = "Todo cuadrado — nadie le debe nada a nadie.";
  } else if (balanceA > 0) {
    text = `${b.displayName} le debe $${balanceA.toFixed(2)} a ${a.displayName}.`;
  } else {
    text = `${a.displayName} le debe $${Math.abs(balanceA).toFixed(2)} a ${b.displayName}.`;
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="text-lg font-medium">{text}</p>
    </div>
  );
}
