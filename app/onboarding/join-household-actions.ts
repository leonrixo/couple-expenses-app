"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { joinHouseholdSchema } from "@/lib/validation/household";

// Mitigación de I2 (auditoría de seguridad 2026-08-29): sin esto, un usuario
// autenticado podía probar códigos de invitación sin límite -- esta Server
// Action no pasa por el rate limiting propio de Supabase Auth. Ventana
// deslizante simple contra household_invite_attempts (ver migración 0005),
// sin infraestructura externa nueva.
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;

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

  const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString();
  const { count: recentAttempts, error: countError } = await admin
    .from("household_invite_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userData.user.id)
    .gte("attempted_at", windowStart);

  if (countError) {
    return { error: countError.message };
  }
  if ((recentAttempts ?? 0) >= MAX_ATTEMPTS_PER_WINDOW) {
    return { error: "Demasiados intentos, espera unos minutos e intenta de nuevo" };
  }

  // Se registra el intento ANTES de validar el código (sea válido o no
  // cuenta para el límite -- lo que se limita es la cantidad de canjes
  // probados, no solo los fallidos).
  await admin.from("household_invite_attempts").insert({ user_id: userData.user.id });

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
