import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "../../lib/supabase/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function createTestUser(email: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "TestPassword123!",
    email_confirm: true,
  });
  if (error) throw error;
  return data.user!.id;
}

async function signIn(email: string) {
  const client = createSupabaseClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password: "TestPassword123!" });
  if (error) throw error;
  return client;
}

describe("aislamiento de datos entre hogares (RLS)", () => {
  let userAId: string, userBId: string;
  let householdAId: string, householdBId: string;
  const emailA = `rls-test-a-${Date.now()}@example.com`;
  const emailB = `rls-test-b-${Date.now()}@example.com`;

  beforeAll(async () => {
    const admin = createServiceRoleClient();
    userAId = await createTestUser(emailA);
    userBId = await createTestUser(emailB);

    const { data: householdA } = await admin.from("households").insert({ name: "Hogar A" }).select().single();
    const { data: householdB } = await admin.from("households").insert({ name: "Hogar B" }).select().single();
    householdAId = householdA!.id;
    householdBId = householdB!.id;

    await admin.from("household_members").insert([
      { household_id: householdAId, user_id: userAId, role: "owner", default_split_percentage: 60 },
      { household_id: householdBId, user_id: userBId, role: "owner", default_split_percentage: 60 },
    ]);

    const { data: catA } = await admin
      .from("categories")
      .insert({ household_id: householdAId, name: "Comida", is_default: true })
      .select()
      .single();

    await admin.from("transactions").insert({
      household_id: householdAId,
      amount: 500,
      concept: "Gasto secreto del hogar A",
      paid_by: userAId,
      category_id: catA!.id,
      split_type: "regular",
    });
  });

  afterAll(async () => {
    const admin = createServiceRoleClient();
    await admin.from("households").delete().in("id", [householdAId, householdBId]);
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("el usuario B NO puede leer las transacciones del hogar A", async () => {
    const clientB = await signIn(emailB);
    const { data, error } = await clientB.from("transactions").select("*").eq("household_id", householdAId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("el usuario B NO puede leer las categorías del hogar A", async () => {
    const clientB = await signIn(emailB);
    const { data } = await clientB.from("categories").select("*").eq("household_id", householdAId);
    expect(data).toEqual([]);
  });

  it("el usuario B NO puede insertar una transacción en el hogar A", async () => {
    const clientB = await signIn(emailB);
    const { data: catA } = await createServiceRoleClient()
      .from("categories")
      .select("id")
      .eq("household_id", householdAId)
      .single();

    const { error } = await clientB.from("transactions").insert({
      household_id: householdAId,
      amount: 100,
      concept: "Intento de escritura ajena",
      paid_by: userBId,
      category_id: catA!.id,
      split_type: "regular",
    });
    expect(error).not.toBeNull();
  });

  it("el usuario A SÍ puede leer sus propias transacciones", async () => {
    const clientA = await signIn(emailA);
    const { data } = await clientA.from("transactions").select("*").eq("household_id", householdAId);
    expect(data).toHaveLength(1);
    expect(data![0].concept).toBe("Gasto secreto del hogar A");
  });
});
