"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createHouseholdSchema } from "@/lib/validation/household";
import { DEFAULT_CATEGORIES } from "@/lib/households/default-categories";

export async function createHousehold(prevState: { error: string | null }, formData: FormData) {
  const parsed = createHouseholdSchema.safeParse({
    name: formData.get("name"),
    ownerSplitPercentage: formData.get("ownerSplitPercentage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Sesión inválida, inicia sesión de nuevo" };
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({ name: parsed.data.name })
    .select()
    .single();
  if (householdError) {
    return { error: householdError.message };
  }

  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: userData.user.id,
    role: "owner",
    default_split_percentage: parsed.data.ownerSplitPercentage,
  });
  if (memberError) {
    return { error: memberError.message };
  }

  const { error: categoriesError } = await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((name) => ({ household_id: household.id, name, is_default: true }))
  );
  if (categoriesError) {
    return { error: categoriesError.message };
  }

  redirect("/");
}
