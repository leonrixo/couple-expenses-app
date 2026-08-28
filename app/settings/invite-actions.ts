"use server";

import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function generateInviteCode(householdId: string) {
  const supabase = await createClient();
  const code = randomBytes(4).toString("hex").toUpperCase();

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
