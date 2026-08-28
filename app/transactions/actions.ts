"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTransactionSchema } from "@/lib/validation/transaction";

export async function createTransaction(householdId: string, prevState: { error: string | null }, formData: FormData) {
  const parsed = createTransactionSchema.safeParse({
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    categoryId: formData.get("categoryId"),
    paidBy: formData.get("paidBy"),
    date: formData.get("date"),
    splitType: formData.get("splitType"),
    customSplitPercentage: formData.get("customSplitPercentage") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    household_id: householdId,
    amount: parsed.data.amount,
    concept: parsed.data.concept,
    category_id: parsed.data.categoryId,
    paid_by: parsed.data.paidBy,
    date: parsed.data.date,
    split_type: parsed.data.splitType,
    custom_split_percentage: parsed.data.splitType === "custom" ? parsed.data.customSplitPercentage : null,
  });
  if (error) {
    return { error: "No se pudo guardar el gasto, intenta de nuevo" };
  }

  revalidatePath("/");
  return { error: null, success: true };
}
