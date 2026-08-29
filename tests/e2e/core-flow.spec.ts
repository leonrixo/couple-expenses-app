import { config } from "dotenv";
// playwright test (a diferencia de vitest, ver vitest.config.ts) no carga
// .env.local automáticamente al proceso de Node que ejecuta este archivo —
// se necesita para poder usar createServiceRoleClient() aquí abajo.
config({ path: `${process.cwd()}/.env.local` });

import { test, expect } from "@playwright/test";
import { createServiceRoleClient } from "../../lib/supabase/server";

test("flujo completo: registro, hogar, gasto, balance, edición", async ({ page }) => {
  // El proyecto de Resend usado por el SMTP personalizado de este Supabase
  // aún no tiene un dominio de envío verificado, así que sigue en "modo
  // sandbox": solo puede ENTREGAR correo al address exacto con el que se dio
  // de alta la cuenta de Resend — cualquier otro destinatario, real o no,
  // rebota de inmediato con "Error sending confirmation email" (HTTP 500 en
  // /auth/v1/signup). Lo confirmé empíricamente probando tres variantes:
  // - e2e-<ts>@playwright-e2e-test.dev (dominio que ni siquiera existe en
  //   DNS) → rebota.
  // - e2e-<ts>@mailinator.com (dominio real, con MX válidos) → rebota igual.
  // - un alias "+" sobre la cuenta de Resend configurada → rebota igual
  //   (Resend hace match exacto de string, un alias no cuenta aunque el
  //   proveedor de correo lo entregue al mismo inbox).
  // - el address literal de la cuenta de Resend configurada, sin alias →
  //   SÍ entrega (HTTP 200), confirmando que ese es el único destinatario
  //   que Resend aceptará en sandbox.
  // Esto significa que, hasta que se verifique un dominio propio en Resend,
  // el flujo real de registro no puede probarse con un correo desechable
  // nuevo en cada corrida (el ideal, y lo que pedía el brief original) — hay
  // que reusar ese address fijo. Se lee de .env.local (E2E_SIGNUP_TEST_EMAIL)
  // en vez de dejarlo escrito en este archivo, para no commitear el correo
  // personal real del dueño del proyecto. Como es un address real y no
  // desechable, este test se limpia solo al final (ver el `finally` más
  // abajo) para no ir acumulando hogares/usuarios de prueba bajo la cuenta
  // real de alguien — a diferencia del resto de este proyecto, donde el
  // usuario e2e-* principal se deja sin limpiar a propósito porque es
  // realmente desechable.
  const email = process.env.E2E_SIGNUP_TEST_EMAIL;
  if (!email) {
    throw new Error(
      "Falta E2E_SIGNUP_TEST_EMAIL en .env.local — debe ser el address exacto con el que se dio de alta la cuenta de Resend usada como SMTP de este proyecto de Supabase (mientras no tenga un dominio de envío verificado, es el único destinatario al que puede entregar correo real)."
    );
  }
  const password = "TestPassword123!";
  const ownerSplitPercentage = 60;

  const admin = createServiceRoleClient();

  // Como email es un address FIJO y real (ver nota arriba), una corrida
  // anterior interrumpida a medias (o simplemente la corrida previa, que se
  // limpia a sí misma pero podría fallar antes de llegar al `finally`) podría
  // dejar un usuario/hogar residual con este mismo correo — y signUp()
  // rechazaría un correo ya registrado. Se limpia cualquier residuo ANTES de
  // arrancar, usando la misma lógica que el cleanup final de abajo.
  await deleteUserAndHousehold(admin, email);

  await page.goto("/signup");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  // El click solo dispara el submit — hay que esperar a que la server
  // action de signUp() resuelva (redirect a /onboarding si tuvo éxito, o el
  // botón se reactiva con un mensaje de error si falló) antes de consultar
  // por admin API si el usuario ya quedó creado.
  await expect(page.getByRole("button", { name: "Creando cuenta..." })).toBeHidden({ timeout: 10000 });

  // Este proyecto de Supabase tiene "Confirm email" activo: signUp() crea la
  // cuenta pero no deja sesión iniciada hasta que se confirma el correo por
  // el enlace que se manda por email. En vez de depender de que la entrega
  // real (vía Resend) haya llegado a tiempo, lo confirmamos del lado del
  // servidor con la service-role key (mismo patrón que ya usa
  // tests/integration/rls-isolation.test.ts) y luego iniciamos sesión real
  // por la UI para que el navegador tenga la cookie de sesión (una
  // confirmación hecha fuera del navegador no se refleja sola en el contexto
  // de Playwright).
  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const testUser = usersPage.users.find((u) => u.email === email);
  if (!testUser) {
    throw new Error(
      `No se encontró el usuario recién registrado (${email}). signUp() pudo haber fallado antes de crear la cuenta — revisar el mensaje de error mostrado en /signup (p.ej. "Error sending confirmation email" si Resend rechazó la entrega).`
    );
  }
  const { error: confirmError } = await admin.auth.admin.updateUserById(testUser.id, { email_confirm: true });
  if (confirmError) throw confirmError;

  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Nombre del hogar").fill("Hogar de prueba E2E");
  await page.getByLabel(/porcentaje/i).fill(String(ownerSplitPercentage));
  await page.getByRole("button", { name: "Crear hogar" }).click();

  await expect(page).toHaveURL("/");

  // components/balance-card.tsx sólo renderiza el texto de balance cuando el
  // hogar tiene EXACTAMENTE 2 miembros ("const [a, b] = members; if (!a ||
  // !b) return null;") — coherente con que esta es una app de gastos EN
  // PAREJA. El flujo de este registro solo crea a un usuario, así que
  // agregamos una "pareja" de prueba directamente en la base de datos (mismo
  // patrón de siembra directa con la service-role key que ya usa
  // rls-isolation.test.ts) para poder ejercer y comprobar el balance real
  // sin relajar esa aserción.
  // El partner se crea vía admin API (createUser con email_confirm: true), que
  // nunca dispara un envío real de correo — el dominio aquí no pasa por
  // Resend en absoluto, así que no le aplica el mismo problema.
  // El alias del partner se deriva de E2E_SIGNUP_TEST_EMAIL en tiempo de
  // ejecución en vez de escribir el correo real como literal (M1 de la
  // auditoría de seguridad 2026-08-29 -- este archivo se va a publicar).
  const [emailLocalPart, emailDomain] = email.split("@");
  const partnerEmail = `${emailLocalPart}+e2e-partner-${Date.now()}@${emailDomain}`;
  const { data: partnerData, error: partnerError } = await admin.auth.admin.createUser({
    email: partnerEmail,
    password: "TestPassword123!",
    email_confirm: true,
  });
  if (partnerError) throw partnerError;
  const partnerId = partnerData.user!.id;

  try {
    const { data: membership, error: membershipError } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", testUser.id)
      .single();
    if (membershipError) throw membershipError;

    const { error: addPartnerError } = await admin.from("household_members").insert({
      household_id: membership.household_id,
      user_id: partnerId,
      role: "member",
      default_split_percentage: 100 - ownerSplitPercentage,
    });
    if (addPartnerError) throw addPartnerError;

    await page.goto("/transactions/new");
    await page.getByLabel("Monto").fill("250");
    await page.getByLabel("Concepto").fill("Súper de prueba E2E");
    // categoryId y paidBy son campos requeridos (uuid) en createTransactionSchema
    // — a diferencia del resto del formulario, estos <Select> no traen un
    // valor por default al crear una transacción nueva, así que hay que
    // elegirlos o el guardado falla la validación ("Categoría inválida").
    await page.getByLabel("Categoría").click();
    await page.getByRole("option", { name: "Comida" }).click();
    await page.getByLabel("Quién pagó").click();
    // Match exacto (no regex parcial): el alias del partner (M1) empieza con
    // el mismo prefijo que el dueño (emailLocalPart + "+e2e-partner-..."), así
    // que un regex suelto sobre emailLocalPart hace match ambiguo con las dos
    // opciones del <Select>.
    await page.getByRole("option", { name: emailLocalPart, exact: true }).click();
    await page.getByRole("button", { name: /guardar|registrar/i }).click();
    // app/transactions/actions.ts (createTransaction) llama redirect("/") al
    // guardar con éxito (fix del commit b5d1d81 — antes se quedaba en
    // /transactions/new sin navegar). El redirect de una Server Action es una
    // navegación real del lado del cliente, así que basta esperar a que el
    // botón en estado pendiente desaparezca y comprobar la URL final; ya no
    // hace falta hacer click manual en el link del header para "llegar" a
    // "/" (se intentó así en una versión anterior de este archivo, cuando el
    // redirect todavía no existía — con el fix, ese click extra sería
    // redundante e innecesariamente propenso a una carrera contra la
    // navegación que ya está en curso).
    await expect(page.getByRole("button", { name: "Guardando..." })).toBeHidden({ timeout: 10000 });
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Súper de prueba E2E")).toBeVisible();
    await expect(page.getByText(/le debe|todo cuadrado/i)).toBeVisible();

    await page.getByRole("link", { name: /editar/i }).first().click();
    await page.getByLabel("Monto").fill("300");
    await page.getByRole("button", { name: /guardar|actualizar/i }).click();
    // Mismo caso que arriba: updateTransaction también redirige solo ahora.
    await expect(page.getByRole("button", { name: "Guardando..." })).toBeHidden({ timeout: 10000 });
    await expect(page).toHaveURL("/");
    await expect(page.getByText("300")).toBeVisible();
  } finally {
    // email es un address real y fijo (ver nota arriba) — a diferencia del
    // resto de este proyecto (donde el usuario e2e-* principal se deja sin
    // limpiar a propósito, por ser genuinamente desechable), aquí sí hay que
    // limpiar todo lo que esta corrida creó: la "pareja" de prueba, y el
    // usuario/hogar/gastos principales, para no ir acumulando datos de
    // prueba bajo la cuenta real de alguien ni bloquear la siguiente corrida.
    await admin.auth.admin.deleteUser(partnerId);
    await deleteUserAndHousehold(admin, email);
  }
});

// Borra, si existen, el hogar (con sus gastos y miembros, vía cascade) y el
// usuario de auth asociados a este correo. transactions.paid_by/updated_by
// referencian profiles(id) SIN "on delete cascade" (ver
// supabase/migrations/0003_transactions.sql), así que borrar el usuario de
// auth directamente fallaría por violación de foreign key mientras existan
// gastos suyos — hay que borrar primero el hogar (que sí cascadea sus propios
// household_members y transactions vía household_id) y solo después el
// usuario de auth.
async function deleteUserAndHousehold(admin: ReturnType<typeof createServiceRoleClient>, email: string) {
  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existingUser = usersPage.users.find((u) => u.email === email);
  if (!existingUser) return;

  const { data: memberships, error: membershipError } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", existingUser.id);
  if (membershipError) throw membershipError;

  for (const { household_id } of memberships ?? []) {
    const { error: deleteHouseholdError } = await admin.from("households").delete().eq("id", household_id);
    if (deleteHouseholdError) throw deleteHouseholdError;
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(existingUser.id);
  if (deleteUserError) throw deleteUserError;
}
