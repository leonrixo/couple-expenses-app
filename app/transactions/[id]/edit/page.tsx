import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transaction-form";
import { updateTransaction } from "../../actions";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: tx } = await supabase.from("transactions").select("*").eq("id", id).single();
  if (!tx) notFound(); // RLS ya bloquea leer transacciones de otro hogar antes de llegar aquí

  const { data: categories } = await supabase.from("categories").select("id, name").eq("household_id", tx.household_id).order("name");
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, profiles(display_name)")
    .eq("household_id", tx.household_id);

  const membersFormatted = (members ?? []).map((m: any) => ({
    userId: m.user_id,
    displayName: m.profiles?.display_name ?? "Miembro",
  }));

  return (
    <div className="mx-auto mt-8 max-w-md px-4">
      <h1 className="mb-6 text-2xl font-semibold">Editar gasto</h1>
      <TransactionForm
        categories={categories ?? []}
        members={membersFormatted}
        action={updateTransaction.bind(null, tx.id)}
        submitLabel="Guardar cambios"
        defaultValues={{
          amount: String(tx.amount),
          concept: tx.concept,
          categoryId: tx.category_id,
          paidBy: tx.paid_by,
          date: tx.date,
          splitType: tx.split_type,
          customSplitPercentage: tx.custom_split_percentage ? String(tx.custom_split_percentage) : undefined,
        }}
      />
    </div>
  );
}
