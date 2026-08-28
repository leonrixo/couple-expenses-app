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

    const { data: householdA, error: householdAError } = await admin
      .from("households")
      .insert({ name: "Hogar A" })
      .select()
      .single();
    if (householdAError) throw householdAError;
    const { data: householdB, error: householdBError } = await admin
      .from("households")
      .insert({ name: "Hogar B" })
      .select()
      .single();
    if (householdBError) throw householdBError;
    householdAId = householdA!.id;
    householdBId = householdB!.id;

    const { error: membersError } = await admin.from("household_members").insert([
      { household_id: householdAId, user_id: userAId, role: "owner", default_split_percentage: 60 },
      { household_id: householdBId, user_id: userBId, role: "owner", default_split_percentage: 60 },
    ]);
    if (membersError) throw membersError;

    const { data: catA, error: catAError } = await admin
      .from("categories")
      .insert({ household_id: householdAId, name: "Comida", is_default: true })
      .select()
      .single();
    if (catAError) throw catAError;

    const { error: txnError } = await admin.from("transactions").insert({
      household_id: householdAId,
      amount: 500,
      concept: "Gasto secreto del hogar A",
      paid_by: userAId,
      category_id: catA!.id,
      split_type: "regular",
    });
    if (txnError) throw txnError;
  });

  afterAll(async () => {
    const admin = createServiceRoleClient();
    const { error: deleteHouseholdsError } = await admin
      .from("households")
      .delete()
      .in("id", [householdAId, householdBId]);
    if (deleteHouseholdsError) throw deleteHouseholdsError;

    const { error: deleteAError } = await admin.auth.admin.deleteUser(userAId);
    if (deleteAError) throw deleteAError;
    const { error: deleteBError } = await admin.auth.admin.deleteUser(userBId);
    if (deleteBError) throw deleteBError;

    // No basta con que las llamadas de borrado no hayan devuelto error: se
    // verifica explícitamente que ya no quede nada — si la limpieza falla a
    // medias, este test debe reportarlo en vez de dar un PASS falso.
    const { data: remainingHouseholds, error: verifyHouseholdsError } = await admin
      .from("households")
      .select("id")
      .in("id", [householdAId, householdBId]);
    if (verifyHouseholdsError) throw verifyHouseholdsError;
    expect(remainingHouseholds).toEqual([]);

    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    const stillPresent = listData.users.filter((u) => u.email === emailA || u.email === emailB);
    expect(stillPresent).toEqual([]);
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
    expect(error!.code).toBe("42501");
  });

  it("el usuario B NO puede modificar una transacción del hogar A", async () => {
    const clientB = await signIn(emailB);
    await clientB.from("transactions").update({ amount: 1 }).eq("household_id", householdAId);
    const { data } = await createServiceRoleClient()
      .from("transactions")
      .select("amount")
      .eq("household_id", householdAId)
      .single();
    expect(Number(data!.amount)).toBe(500);
  });

  it("el usuario B NO puede borrar una transacción del hogar A", async () => {
    const clientB = await signIn(emailB);
    await clientB.from("transactions").delete().eq("household_id", householdAId);
    const { count } = await createServiceRoleClient()
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdAId);
    expect(count).toBe(1);
  });

  it("el usuario A SÍ puede leer sus propias transacciones", async () => {
    const clientA = await signIn(emailA);
    const { data } = await clientA.from("transactions").select("*").eq("household_id", householdAId);
    expect(data).toHaveLength(1);
    expect(data![0].concept).toBe("Gasto secreto del hogar A");
  });
});
