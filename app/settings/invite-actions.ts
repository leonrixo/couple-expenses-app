"use server";

import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function generateInviteCode(householdId: string) {
  const supabase = await createClient();
  // Mitigación de I2 (auditoría de seguridad 2026-08-29): 4 bytes (32 bits)
  // no era una barrera seria contra un script sostenido en la ventana de
  // validez de 7 días. 8 bytes (64 bits) sí lo es, y no hay ningún
  // requisito de UX que exija un código corto/tecleable -- se copia/pega.
  const code = randomBytes(8).toString("hex").toUpperCase();

  const { data, error } = await supabase
    .from("household_invites")
    .insert({
      household_id: householdId,
      code,
      created_by: (await supabase.auth.getUser()).data.user!.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message, code: null };
  return { error: null, code: data.code };
}
