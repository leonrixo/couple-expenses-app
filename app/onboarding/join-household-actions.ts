"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { joinHouseholdSchema } from "@/lib/validation/household";

export async function joinHousehold(prevState: { error: string | null }, formData: FormData) {
  const parsed = joinHouseholdSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Sesión inválida, inicia sesión de nuevo" };
  }

  const admin = createServiceRoleClient();
  const { data: invite } = await admin
    .from("household_invites")
    .select("*")
    .eq("code", parsed.data.code.toUpperCase())
    .maybeSingle();

  if (!invite) {
    return { error: "Código de invitación inválido" };
  }
  if (invite.used_at) {
    return { error: "Este código ya fue usado" };
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "Este código expiró" };
  }

  const { data: existingMembers } = await admin
    .from("household_members")
    .select("default_split_percentage")
    .eq("household_id", invite.household_id);

  const usedPercentage = (existingMembers ?? []).reduce((sum, m) => sum + Number(m.default_split_percentage), 0);
  const remainingPercentage = 100 - usedPercentage;
  if (remainingPercentage <= 0) {
    return { error: "El reparto del hogar ya suma 100%, no se puede agregar otro miembro sin ajustarlo primero" };
  }

  const { error: memberError } = await admin.from("household_members").insert({
    household_id: invite.household_id,
    user_id: userData.user.id,
    role: "member",
    default_split_percentage: remainingPercentage,
  });
  if (memberError) {
    return { error: memberError.message };
  }

  await admin.from("household_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id);

  redirect("/");
}
