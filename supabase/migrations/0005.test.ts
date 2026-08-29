import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "../../lib/supabase/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe("migración 0005 — household_invite_attempts (I2)", () => {
  it("la tabla existe y es consultable por service_role", async () => {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("household_invite_attempts").select("*").limit(1);
    expect(error, "tabla household_invite_attempts debería existir").toBeNull();
  });

  describe("RLS y ventana deslizante usadas por joinHousehold", () => {
    let userId: string;
    const email = `invite-throttle-${Date.now()}@example.com`;

    beforeAll(async () => {
      const admin = createServiceRoleClient();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: "TestPassword123!",
        email_confirm: true,
      });
      if (error) throw error;
      userId = data.user!.id;
    });

    afterAll(async () => {
      const admin = createServiceRoleClient();
      const { error: deleteAttemptsError } = await admin
        .from("household_invite_attempts")
        .delete()
        .eq("user_id", userId);
      if (deleteAttemptsError) throw deleteAttemptsError;

      const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
      if (deleteUserError) throw deleteUserError;
    });

    it("un usuario autenticado NO puede leer ni insertar intentos directamente (solo service_role bypassa RLS)", async () => {
      const client = createSupabaseClient(url, anonKey);
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password: "TestPassword123!",
      });
      if (signInError) throw signInError;

      const { data: readData, error: readError } = await client
        .from("household_invite_attempts")
        .select("*")
        .eq("user_id", userId);
      expect(readError).toBeNull();
      expect(readData).toEqual([]);

      const { error: insertError } = await client.from("household_invite_attempts").insert({ user_id: userId });
      expect(insertError).not.toBeNull();
      expect(insertError!.code).toBe("42501");
    });

    it("la consulta de ventana deslizante que usa joinHousehold cuenta los intentos recientes y excluye los que ya expiraron de la ventana", async () => {
      const admin = createServiceRoleClient();
      const now = Date.now();

      // 10 intentos dentro de la ventana de 15 minutos (deben contar)
      const recentRows = Array.from({ length: 10 }, (_, i) => ({
        user_id: userId,
        attempted_at: new Date(now - i * 1000).toISOString(),
      }));
      // 3 intentos fuera de la ventana de 15 minutos (NO deben contar)
      const oldRows = Array.from({ length: 3 }, (_, i) => ({
        user_id: userId,
        attempted_at: new Date(now - (20 + i) * 60 * 1000).toISOString(),
      }));

      const { error: insertError } = await admin
        .from("household_invite_attempts")
        .insert([...recentRows, ...oldRows]);
      if (insertError) throw insertError;

      // Misma construcción de consulta que app/onboarding/join-household-actions.ts
      const windowStart = new Date(now - 15 * 60 * 1000).toISOString();
      const { count, error: countError } = await admin
        .from("household_invite_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("attempted_at", windowStart);

      expect(countError).toBeNull();
      expect(count).toBe(10);
    });
  });
});
