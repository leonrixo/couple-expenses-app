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

describe("escalada de privilegios entre miembros del mismo hogar (C1)", () => {
  let ownerId: string, memberId: string;
  let householdId: string;
  const ownerEmail = `rls-c1-owner-${Date.now()}@example.com`;
  const memberEmail = `rls-c1-member-${Date.now()}@example.com`;

  beforeAll(async () => {
    const admin = createServiceRoleClient();
    ownerId = await createTestUser(ownerEmail);
    memberId = await createTestUser(memberEmail);

    const { data: household, error: householdError } = await admin
      .from("households")
      .insert({ name: "Hogar compartido C1" })
      .select()
      .single();
    if (householdError) throw householdError;
    householdId = household!.id;

    const { error: membersError } = await admin.from("household_members").insert([
      { household_id: householdId, user_id: ownerId, role: "owner", default_split_percentage: 60 },
      { household_id: householdId, user_id: memberId, role: "member", default_split_percentage: 40 },
    ]);
    if (membersError) throw membersError;
  });

  afterAll(async () => {
    const admin = createServiceRoleClient();
    const { error: deleteHouseholdError } = await admin.from("households").delete().eq("id", householdId);
    if (deleteHouseholdError) throw deleteHouseholdError;

    const { error: deleteOwnerError } = await admin.auth.admin.deleteUser(ownerId);
    if (deleteOwnerError) throw deleteOwnerError;
    const { error: deleteMemberError } = await admin.auth.admin.deleteUser(memberId);
    if (deleteMemberError) throw deleteMemberError;

    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    const stillPresent = listData.users.filter((u) => u.email === ownerEmail || u.email === memberEmail);
    expect(stillPresent).toEqual([]);
  });

  it("un miembro NO puede modificar la fila de household_members de su pareja", async () => {
    // La política de UPDATE filtra por user_id = auth.uid() vía USING: la
    // fila de la pareja queda invisible para este UPDATE, así que Postgres
    // simplemente afecta 0 filas sin lanzar error (no hay fila que viole
    // WITH CHECK porque no hay fila que actualizar) — el read-back de abajo
    // es la prueba real de que nada cambió.
    const clientMember = await signIn(memberEmail);
    await clientMember
      .from("household_members")
      .update({ role: "member", default_split_percentage: 0 })
      .eq("household_id", householdId)
      .eq("user_id", ownerId);

    const { data } = await createServiceRoleClient()
      .from("household_members")
      .select("role, default_split_percentage")
      .eq("household_id", householdId)
      .eq("user_id", ownerId)
      .single();
    expect(data!.role).toBe("owner");
    expect(Number(data!.default_split_percentage)).toBe(60);
  });

  it("un miembro NO puede auto-promoverse a owner en su propia fila", async () => {
    const clientMember = await signIn(memberEmail);
    await clientMember
      .from("household_members")
      .update({ role: "owner" })
      .eq("household_id", householdId)
      .eq("user_id", memberId);

    const { data } = await createServiceRoleClient()
      .from("household_members")
      .select("role")
      .eq("household_id", householdId)
      .eq("user_id", memberId)
      .single();
    expect(data!.role).toBe("member");
  });

  it("un miembro SÍ puede editar su propio default_split_percentage", async () => {
    const clientMember = await signIn(memberEmail);
    const { error } = await clientMember
      .from("household_members")
      .update({ default_split_percentage: 45 })
      .eq("household_id", householdId)
      .eq("user_id", memberId);
    expect(error).toBeNull();

    const { data } = await createServiceRoleClient()
      .from("household_members")
      .select("default_split_percentage")
      .eq("household_id", householdId)
      .eq("user_id", memberId)
      .single();
    expect(Number(data!.default_split_percentage)).toBe(45);
  });

  it("un miembro NO puede reasignar su propia fila a otro hogar (household_id inmutable)", async () => {
    const admin = createServiceRoleClient();
    const { data: otherHousehold, error: otherHouseholdError } = await admin
      .from("households")
      .insert({ name: "Hogar ajeno C1" })
      .select()
      .single();
    if (otherHouseholdError) throw otherHouseholdError;

    const clientMember = await signIn(memberEmail);
    const { error } = await clientMember
      .from("household_members")
      .update({ household_id: otherHousehold!.id })
      .eq("household_id", householdId)
      .eq("user_id", memberId);
    expect(error).not.toBeNull();

    const { data } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", memberId)
      .single();
    expect(data!.household_id).toBe(householdId);

    await admin.from("households").delete().eq("id", otherHousehold!.id);
  });
});

describe("onboarding real de punta a punta con sesión anon (no service-role)", () => {
  // Este escenario específico -- un usuario recién autenticado creando SU
  // PRIMER hogar con el cliente normal de la app (sesión anon, no
  // service-role) -- nunca estuvo cubierto por ningún test de este proyecto
  // hasta ahora: la prueba de aislamiento de arriba siembra los hogares vía
  // service-role, y las verificaciones "en vivo" de las Tasks 8/9 también
  // usaron service-role sin que se detectara en su momento (ver el ledger,
  // "Task 8: Second concern"). Fue exactamente la ausencia de este caso la
  // que dejó pasar sin detectar, desde la Task 8, un bug real en
  // create-household-actions.ts: pedir la fila recién insertada de vuelta
  // (.select()) requiere pasar la política de SELECT de households
  // (is_household_member), y el usuario todavía no es miembro en ese
  // instante -- Postgres rechaza el INSERT completo con el mismo error que
  // una violación real de RLS, aunque el WITH CHECK del INSERT en sí nunca
  // falló. El fix (generar el id en el cliente, sin pedir RETURNING) se
  // verifica aquí reproduciendo el flujo real de la Server Action paso a
  // paso con una sesión anon real.
  it("un usuario recién autenticado puede crear su hogar, agregarse como miembro y sembrar categorías", async () => {
    const email = `onboarding-e2e-${Date.now()}@example.com`;
    const userId = await createTestUser(email);
    const client = await signIn(email);
    const householdId = crypto.randomUUID();

    try {
      const { error: householdError } = await client
        .from("households")
        .insert({ id: householdId, name: "Onboarding real" });
      expect(householdError).toBeNull();

      const { error: memberError } = await client.from("household_members").insert({
        household_id: householdId,
        user_id: userId,
        role: "owner",
        default_split_percentage: 60,
      });
      expect(memberError).toBeNull();

      const { error: categoriesError } = await client
        .from("categories")
        .insert([{ household_id: householdId, name: "Comida", is_default: true }]);
      expect(categoriesError).toBeNull();

      const { data: readBack, error: readError } = await client
        .from("households")
        .select("*")
        .eq("id", householdId)
        .single();
      expect(readError).toBeNull();
      expect(readBack!.name).toBe("Onboarding real");
    } finally {
      const admin = createServiceRoleClient();
      await admin.from("households").delete().eq("id", householdId);
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
