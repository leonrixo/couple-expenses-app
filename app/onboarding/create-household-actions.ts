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

  // El id se genera aquí (no se deja el default de la columna) y NO se pide
  // de vuelta la fila insertada (.select()): la política de SELECT de
  // households exige ser miembro (is_household_member(id)), y ese usuario
  // todavía no lo es en este instante -- el INSERT en sí pasa su propio
  // WITH CHECK (auth.uid() is not null) sin problema, pero pedir la fila de
  // vuelta antes de existir la membresía hace que Postgres rechace el
  // RETURNING con el mismo error de RLS que un INSERT bloqueado de verdad.
  // Al conocer el id de antemano no hace falta el RETURNING para nada.
  const householdId = crypto.randomUUID();
  const { error: householdError } = await supabase
    .from("households")
    .insert({ id: householdId, name: parsed.data.name });
  if (householdError) {
    return { error: householdError.message };
  }

  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: householdId,
    user_id: userData.user.id,
    role: "owner",
    default_split_percentage: parsed.data.ownerSplitPercentage,
  });
  if (memberError) {
    return { error: memberError.message };
  }

  const { error: categoriesError } = await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((name) => ({ household_id: householdId, name, is_default: true }))
  );
  if (categoriesError) {
    return { error: categoriesError.message };
  }

  redirect("/");
}
