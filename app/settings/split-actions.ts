"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  householdId: z.string().uuid(),
  newPercentage: z.coerce.number().min(0).max(100),
});

export async function updateSplitPercentage(prevState: { error: string | null }, formData: FormData) {
  const parsed = schema.safeParse({
    householdId: formData.get("householdId"),
    newPercentage: formData.get("newPercentage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, default_split_percentage")
    .eq("household_id", parsed.data.householdId);

  const others = (members ?? []).filter((m) => m.user_id !== userData.user?.id);
  const othersSum = others.reduce((sum, m) => sum + Number(m.default_split_percentage), 0);

  if (Math.round((parsed.data.newPercentage + othersSum) * 100) / 100 !== 100) {
    return { error: `La suma debe dar 100%. Con este cambio daría ${parsed.data.newPercentage + othersSum}%` };
  }

  const { error } = await supabase
    .from("household_members")
    .update({ default_split_percentage: parsed.data.newPercentage })
    .eq("household_id", parsed.data.householdId)
    .eq("user_id", userData.user!.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { error: null };
}
