import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transaction-form";
import { createTransaction } from "../actions";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userData.user.id)
    .single();
  if (!membership) redirect("/onboarding");

  const [{ data: categories }, { data: members }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("household_id", membership.household_id).order("name"),
    supabase
      .from("household_members")
      .select("user_id, profiles(display_name)")
      .eq("household_id", membership.household_id),
  ]);

  const membersFormatted = (members ?? []).map((m: any) => ({
    userId: m.user_id,
    displayName: m.profiles?.display_name ?? "Miembro",
  }));

  return (
    <div className="mx-auto mt-8 max-w-md px-4">
      <h1 className="mb-6 text-2xl font-semibold">Registrar gasto</h1>
      <TransactionForm
        categories={categories ?? []}
        members={membersFormatted}
        action={createTransaction.bind(null, membership.household_id)}
        submitLabel="Registrar gasto"
      />
    </div>
  );
}
