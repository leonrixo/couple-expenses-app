import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateBalance, type HouseholdMember, type SplitTransaction } from "@/lib/split-logic";
import { BalanceCard } from "@/components/balance-card";
import { TransactionsTable } from "@/components/transactions-table";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userData.user.id)
    .single();
  if (!membership) redirect("/onboarding");

  const [{ data: membersRaw }, { data: transactionsRaw }] = await Promise.all([
    supabase
      .from("household_members")
      .select("user_id, role, default_split_percentage, profiles(display_name)")
      .eq("household_id", membership.household_id),
    supabase
      .from("transactions")
      .select("id, amount, concept, paid_by, date, split_type, custom_split_percentage, categories(name), profiles!transactions_paid_by_fkey(display_name)")
      .eq("household_id", membership.household_id)
      .order("date", { ascending: false }),
  ]);

  const members: HouseholdMember[] = (membersRaw ?? []).map((m: any) => ({
    userId: m.user_id,
    role: m.role,
    defaultSplitPercentage: Number(m.default_split_percentage),
  }));
  const membersDisplay = (membersRaw ?? []).map((m: any) => ({
    userId: m.user_id,
    displayName: m.profiles?.display_name ?? "Miembro",
  }));

  const splitTxs: SplitTransaction[] = (transactionsRaw ?? []).map((t: any) => ({
    amount: Number(t.amount),
    paidBy: t.paid_by,
    splitType: t.split_type,
    customSplitPercentage: t.custom_split_percentage ? Number(t.custom_split_percentage) : null,
  }));
  const balance = calculateBalance(splitTxs, members);

  const rows = (transactionsRaw ?? []).map((t: any) => ({
    id: t.id,
    date: t.date,
    concept: t.concept,
    categoryName: t.categories?.name ?? "",
    amount: Number(t.amount),
    paidByName: t.profiles?.display_name ?? "",
    splitType: t.split_type,
  }));

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-6 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gastos del hogar</h1>
        <a href="/transactions/new"><button className="rounded bg-primary px-4 py-2 text-primary-foreground">+ Registrar gasto</button></a>
      </div>
      <BalanceCard balance={balance} members={membersDisplay} />
      <TransactionsTable rows={rows} />
    </div>
  );
}
