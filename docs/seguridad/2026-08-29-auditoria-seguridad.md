# Auditoria de seguridad -- gastos-pareja (pre-produccion)

**Fecha:** 2026-08-29
**Alcance:** rama `mvp-nucleo` (worktree `.worktrees/mvp-nucleo`), previo a primer deploy real en Vercel + Supabase y a hacer publico el repo en GitHub.
**Metodologia:** revision estatica de codigo (Server Actions, middleware, clientes Supabase, esquemas zod), lectura linea por linea de todas las politicas RLS en `supabase/migrations/*.sql`, verificacion en vivo de esas politicas contra Postgres real via `pg_policies`/`pg_class` (solo SELECT, sin escritura), `npm audit`, y escaneo de `git log -p --all` en busca de secretos filtrados. No se modifico codigo, configuracion ni datos.

## Resumen ejecutivo

Riesgo global: **medio-alto, no apto para produccion tal cual** -- no por falta de intencion de diseno (el modelo RLS-como-unica-barrera esta bien pensado y en su mayoria bien ejecutado), sino por dos politicas de UPDATE sin clausula WITH CHECK que permiten a un miembro de un hogar reescribir la fila de membresia de **otra persona** (incluyendo a que hogar pertenece), y por un flujo de recuperacion de contrasena que, con alta probabilidad, no funciona en absoluto porque falta la ruta que intercambia el token del correo por una sesion real. Ninguno de los dos hallazgos criticos/importantes filtra datos de un hogar ajeno de forma directa (el aislamiento de lectura entre hogares, que era la prioridad #1 declarada del proyecto, se sostiene y esta confirmado por prueba real), pero si comprometen la integridad de los datos financieros dentro de la relacion de pareja y la disponibilidad de la cuenta. Se recomienda corregir los hallazgos Critico antes de dar de alta a la pareja real, y los Importante antes de publicar el repo o depender del flujo de olvide-mi-contrasena.

---

## Hallazgos -- Critico

### C1. Las politicas RLS de UPDATE en `household_members` y `transactions` no tienen WITH CHECK -- permiten mutar household_id/user_id/role a voluntad

**Donde:** `supabase/migrations/0001_households_profiles_members.sql:96-98` (tabla `household_members`) y `supabase/migrations/0003_transactions.sql:30-32` (tabla `transactions`). Confirmado en vivo contra el Postgres real (consulta de solo lectura a `pg_policies`): ambas politicas de UPDATE tienen `with_check = null`.

```sql
create policy "miembros editan el reparto dentro de su hogar"
  on household_members for update
  using (public.is_household_member(household_id));
```

Segun la semantica de Postgres, si una politica de UPDATE no define WITH CHECK, se reutiliza la expresion de USING como clausula de verificacion -- pero evaluada sobre la **fila nueva**, no la vieja. Aqui eso significa: puedo modificar cualquier fila de `household_members` cuya fila resultante, despues del cambio, tenga un `household_id` del que YO (quien ejecuta el UPDATE) sea miembro -- sin ninguna restriccion sobre que `user_id` esta siendo tocado, ni sobre que columnas cambian.

**Impacto concreto (sin pasar por ninguna Server Action, solo con el cliente anon + sesion del navegador, p. ej. desde devtools):**
- Un miembro (rol member) puede ejecutar un UPDATE sobre su propia fila fijando `role = owner` y auto-promoverse. Esto no es cosmetico: `lib/split-logic.ts:34-38` usa explicitamente `members.find(m => m.role === "owner")` para decidir a quien corresponde el porcentaje del reparto personalizado -- y el propio ADR del proyecto (`docs/adr/0003-modelo-auth-hogares-extensible.md:67-71`) documenta que esa decision de diseno depende de quien es el owner. O sea: cambiar `role` cambia matematicamente cuanto le toca pagar a cada quien en gastos tipo custom.
- Peor: un miembro puede tomar la fila de **su pareja** (`household_id = A, user_id = pareja`) y, si ademas pertenece a un segundo hogar B (crear un segundo hogar es trivial y no esta bloqueado, ver `app/onboarding/create-household-actions.ts`), ejecutar un UPDATE que cambie `household_id = A` por `household_id = B` en esa fila ajena. La fila nueva cumple la membresia de B para el atacante (que si es miembro de B) y la politica lo permite -- resultado: la pareja pierde instantaneamente su membresia al hogar A (ya no es miembro de A) y queda con una fila fantasma en el hogar B, sin su consentimiento ni el de nadie. Esto es, en la practica, expulsar a la otra persona del hogar compartido con una sola query.
- Lo mismo aplica, con menor probabilidad de explotacion real (requiere pertenecer a 2+ hogares), a `transactions`: se podria mover un gasto del hogar real a un hogar privado del atacante, ocultandolo de la vista de la pareja sin dejar rastro de borrado.

**Por que es mas grave que el punto ya aceptado (a):** el item (a) del historial (`household_members` INSERT no valida invitacion, solo `user_id = auth.uid()`) solo permite auto-unirse a un hogar cuyo UUID ya conozcas (poco practico de adivinar, 122 bits). Este hallazgo es distinto y peor: no requiere adivinar nada -- actua sobre una fila que **ya es visible** para el atacante porque comparte hogar con la victima, y permite modificar/reasignar esa fila ajena, incluyendo el rol que si tiene efecto funcional en el calculo de reparto. Es una escalada real dentro de una relacion de confianza que la app deberia seguir arbitrando correctamente incluso cuando esa confianza se rompe (ej. una separacion conflictiva, que es exactamente el escenario donde una app de finanzas compartidas mas necesita que sus controles de acceso sean estrictos).

**Remediacion concreta:**
1. Restringir la politica de `household_members` a la fila propia en ambos sentidos:
   ```sql
   drop policy "miembros editan el reparto dentro de su hogar" on household_members;
   create policy "un usuario edita solo su propia fila de membresia"
     on household_members for update
     using (user_id = auth.uid())
     with check (user_id = auth.uid());
   ```
2. Aun con lo anterior, un usuario podria seguir cambiando su **propio** `household_id`/`role` libremente. Para hacer esas columnas verdaderamente inmutables por el rol authenticated, agregar un trigger BEFORE UPDATE:
   ```sql
   create function public.prevent_membership_identity_change()
   returns trigger language plpgsql as $$
   begin
     if new.household_id <> old.household_id or new.user_id <> old.user_id then
       raise exception using message =
         "household_id y user_id de household_members son inmutables";
     end if;
     return new;
   end;
   $$;
   create trigger trg_membership_immutable
     before update on household_members
     for each row execute function public.prevent_membership_identity_change();
   ```
   (Esto no bloquea al service_role, que ignora RLS/triggers de negocio si se ejecuta con bypass explicito -- verificar que ninguna ruta legitima necesite mover una membresia entre hogares antes de aplicar esto; hoy ninguna la necesita.)
3. Para `transactions`, agregar el mismo tipo de trigger que impida cambiar `household_id` en un UPDATE (si se permite cambiar todo lo demas: monto, concepto, categoria, etc.), ya que no hay ningun flujo de producto que necesite mover un gasto entre hogares.
4. Anadir al menos un caso a `tests/integration/rls-isolation.test.ts` que reproduzca este ataque exacto (usuario B intenta hacer UPDATE sobre la fila de membresia del usuario A) para que quede cubierto por la prueba de aislamiento existente, igual que ya cubre `transactions`.

---

## Hallazgos -- Importante

### I1. El flujo de olvide-mi-contrasena (y muy probablemente la confirmacion de correo) no completan la sesion -- el reseteo real de contrasena probablemente no funciona

**Donde:** `app/(auth)/forgot-password/actions.ts:16-17`, `app/(auth)/reset-password/actions.ts:16-19`, `app/(auth)/reset-password/page.tsx` (sin manejo de token_hash/code), `lib/supabase/client.ts` (el cliente de navegador de Supabase **no se importa en ningun lugar de la app** -- confirmado por busqueda global, cero resultados), y ausencia total de una ruta tipo `app/auth/confirm/route.ts` (solo existe `app/auth/logout/route.ts`).

Supabase envia el enlace de recuperacion apuntando a `redirectTo` (`{SITE_URL}/reset-password`) pasando por el endpoint de verificacion de GoTrue, que al validar el token redirige al navegador con las credenciales de sesion (ya sea como fragmento de URL del flujo implicito, o como parametro `code` del flujo PKCE, que es el que usan por defecto los proyectos recientes con `@supabase/ssr`). En cualquiera de los dos casos, algo tiene que consumir ese token/codigo para convertirlo en una sesion real -- normalmente una ruta de servidor que llama a `verifyOtp(...)` o `exchangeCodeForSession(...)`, o al menos un cliente de navegador con `detectSessionInUrl` (el comportamiento por defecto, pero solo se activa si el SDK de navegador realmente se instancia en esa pagina).

Esta app no tiene ninguna de las dos cosas: `reset-password/page.tsx` es un simple formulario que llama a la Server Action `resetPassword`, la cual usa el cliente de **servidor** (`lib/supabase/server.ts`, que solo lee cookies) y llama directamente a `updateUser({ password })`. Si nunca se establecio una sesion de recuperacion en las cookies (porque nada la intercambio), esa llamada falla por falta de sesion activa.

Esto esta corroborado indirectamente por el propio comentario en `tests/e2e/core-flow.spec.ts:67-75`: el equipo ya detecto que este proyecto de Supabase tiene Confirm email activo, y **el test evita deliberadamente el enlace real de correo**, confirmando la cuenta via API de administrador (`admin.auth.admin.updateUserById(id, { email_confirm: true })`) en vez de hacer clic en el enlace real -- es decir, el flujo real basado en el enlace de correo nunca se ha ejercitado de punta a punta, ni en produccion ni en pruebas.

**Impacto:** en un caso de uso real (2 personas, cuentas de correo personales), si cualquiera de los dos olvida su contrasena, el flujo completo de olvide-mi-contrasena (recibir correo, hacer clic, poner nueva contrasena) muy probablemente falla en el ultimo paso, dejando a esa persona bloqueada fuera de su propia cuenta de datos financieros sin una via de recuperacion funcional. No es una fuga de datos, pero si un problema serio de disponibilidad para una app que ya va a produccion con usuarios reales.

**Remediacion concreta:** agregar una ruta de intercambio siguiendo el patron oficial de Supabase para Next.js App Router, por ejemplo:
```ts
// app/auth/confirm/route.ts
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/reset-password";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }
  redirect("/login?error=enlace_invalido");
}
```
y actualizar la plantilla de correo de Reset Password en el dashboard de Supabase para que apunte a una URL del tipo `{SITE_URL}/auth/confirm?token_hash=...&type=recovery&next=/reset-password` en vez de la plantilla por defecto. Despues, agregar una prueba E2E que si haga clic en un enlace real (o invoque la ruta directamente con un token_hash valido obtenido via admin API) para no volver a dejar este camino sin cubrir. Aplica el mismo arreglo, con type=signup, al flujo de confirmacion de registro.

### I2. Sin limite de intentos en la redencion de codigo de invitacion -- 32 bits de entropia, sin throttling propio

**Donde:** `app/onboarding/join-household-actions.ts:19-34`.

El codigo de invitacion se genera con `randomBytes(4).toString("hex")` (`app/settings/invite-actions.ts:8`) -- 8 caracteres hex, 32 bits de entropia, valido 7 dias. `joinHousehold` hace un select directo contra `household_invites` por codigo exacto usando el cliente service_role (que bypassa RLS a proposito) y no aplica ningun limite de intentos, contador de fallos ni bloqueo temporal. Esta ruta es una Server Action de Next.js, no un endpoint de Auth de Supabase (signInWithPassword, OTP, etc.), asi que **no esta cubierta por el rate limiting propio de Supabase Auth** -- cualquier cuenta autenticada (el registro es abierto) puede intentar tantos codigos como quiera.

32 bits (~4.3 mil millones de combinaciones) no es adivinable a mano, pero tampoco es una barrera seria contra un script automatizado sostenido en 7 dias de ventana de validez, sobre todo si en el futuro hay mas de un hogar activo (superficie de ataque que crece con el numero de usuarios reales del sistema, algo relevante de cara al roadmap de multi-hogar mencionado en el ADR 0003).

**Remediacion:** agregar throttling por usuario/IP a esta Server Action (tabla de intentos con ventana deslizante, o un rate-limiter tipo Upstash/Vercel KV), y/o subir la entropia del codigo (p. ej. `randomBytes(8)`, 64 bits) ya que no hay ningun requisito de UX que obligue a que sea corto y tecleable a mano -- de hecho hoy se copia/pega, no se dicta.

### I3. Enumeracion de correo en registro (signup)

**Donde:** `app/(auth)/signup/actions.ts:25`.

```ts
return { error: error.message === "User already registered" ? "Ese correo ya esta registrado" : error.message };
```

A diferencia del flujo de olvide-mi-contrasena (que correctamente siempre responde `sent: true`, ver `app/(auth)/forgot-password/actions.ts:20-21`), el registro si distingue explicitamente correo-ya-registrado de cualquier otro error, permitiendo confirmar si un correo especifico tiene cuenta en el sistema. Para una app de 2 usuarios el impacto real es bajo, pero es exactamente el tipo de detalle que el propio equipo ya se preocupo de evitar en el flujo de reset -- vale la pena ser consistente, mas aun siendo portafolio publico (cualquiera podra leer el codigo y ver la asimetria).

**Remediacion:** devolver un mensaje generico (No se pudo completar el registro, verifica tus datos, o similar) independientemente de la causa, o adoptar el mismo patron de siempre-decimos-que-si seguido de una validacion fuera de banda si hace falta.

---

## Hallazgos -- Menor

### M1. Correo personal real hardcodeado en un archivo de prueba que se va a publicar

**Donde:** `tests/e2e/core-flow.spec.ts` -- el comentario de las lineas 20-23 escribe literalmente el Gmail real del dueno del proyecto como el unico destinatario que el sandbox de Resend acepta, y la linea 110 lo usa tambien en codigo ejecutable, construyendo un alias +e2e-partner sobre esa direccion real.

El correo de la corrida principal si se maneja bien (se lee de `E2E_SIGNUP_TEST_EMAIL` en `.env.local`, que esta en `.gitignore` -- buena practica), pero el partner de prueba usa un alias construido directamente sobre la direccion real, escrita en texto plano tanto en el comentario como en el codigo. Al hacer publico este repo en GitHub, esa direccion queda indexable y asociada permanentemente al proyecto (spam, scraping, correlacion con la identidad real del autor).

**Remediacion:** construir el alias del partner a partir de la misma variable de entorno en vez de hardcodear el dominio/usuario (por ejemplo, insertando el sufijo +e2e-partner-<timestamp> justo antes de la arroba de `E2E_SIGNUP_TEST_EMAIL` en tiempo de ejecucion), y reescribir el comentario para describir el hallazgo sin citar la direccion real (referirse a ella como "la cuenta de Resend configurada" es suficiente contexto).

### M2. paid_by y category_id de una transaccion no se validan contra los miembros/categorias reales del hogar en el servidor

**Donde:** `app/transactions/actions.ts:8-39` (createTransaction) y `:41-83` (updateTransaction); `lib/validation/transaction.ts:7-8` solo valida forma UUID (`z.string().uuid()`), no pertenencia.

`categoryId` referenciando una categoria de **otro** hogar ya es el item aceptado (b) del historial (falta FK compuesta category_id + household_id) -- se confirma que sigue presente, sin empeorar: como la politica de SELECT de `categories` sigue exigiendo membresia del hogar, no hay fuga de lectura hacia el otro hogar, solo una referencia colgante rara en los datos propios.

Adicionalmente, y esto no estaba en la lista de aceptados: `paidBy` tampoco se valida contra `household_members` del hogar en cuestion -- solo se exige que sea un UUID valido de algun `profiles.id` existente (por el FK `transactions.paid_by references profiles(id)`, sin restriccion de hogar). Un miembro podria, con la Server Action tal cual esta, atribuir un gasto a cualquier `profiles.id` real que conozca (no necesariamente alguien de su hogar), corrompiendo la atribucion de quien-pago -- impacto bajo (no cruza el limite de aislamiento entre hogares, es un problema de integridad dentro del propio hogar), pero vale la pena cerrarlo junto con (b) ya que es la misma clase de problema y el mismo archivo.

**Remediacion:** antes del insert/update, verificar server-side que `paidBy` este en la lista de `household_members` del hogar correspondiente, y que `categoryId` pertenezca a `categories` de ese mismo hogar -- ya se tienen ambas listas cargadas en `app/transactions/new/page.tsx` y `app/transactions/[id]/edit/page.tsx` para poblar los selects, asi que la validacion server-side es una comparacion adicional trivial contra esos mismos datos (recuperados de nuevo dentro de la Server Action, no confiando en lo que vino del formulario).

### M3. Politica de contrasenas minima, sin proteccion contra contrasenas filtradas

**Donde:** `lib/validation/auth.ts:5,18` -- longitud minima de 8 caracteres para registro y reseteo, sin verificacion de complejidad ni de listas de contrasenas comprometidas.

El hasheo en si (bcrypt via Supabase Auth) es solido y no es responsabilidad de este codigo. Para una app financiera de 2 personas el riesgo es bajo, pero es una mejora barata.

**Remediacion:** activar en el dashboard de Supabase la opcion de proteccion contra contrasenas filtradas (chequeo contra HaveIBeenPwned) si el plan la incluye, y subir el minimo a 10-12 caracteres.

### M4. Sin cabeceras de seguridad HTTP ni proteccion de rutas centralizada en middleware

**Donde:** `next.config.ts` (sin `headers()`), `middleware.ts` (solo refresca la sesion, no redirige).

No es una vulnerabilidad explotable hoy: cada pagina protegida (`app/page.tsx:9-10`, `app/settings/page.tsx:9-12`, `app/transactions/new/page.tsx:8-9`, `app/transactions/[id]/edit/page.tsx:9-10`) repite correcta y consistentemente su propio chequeo de `auth.getUser()` + redirect. Pero es un patron fragil a futuro: basta con que una pagina nueva olvide ese chequeo para quedar expuesta, ya que el middleware no ofrece esa red de seguridad por si solo. Tampoco hay Content-Security-Policy, X-Frame-Options/frame-ancestors, ni Referrer-Policy configurados.

**Remediacion:** mover la redireccion si-no-hay-sesion-a-login al propio `middleware.ts` (matcher que excluya /login, /signup, /forgot-password, /reset-password, /auth/*) como defensa en profundidad, y agregar cabeceras basicas de seguridad via `headers()` en `next.config.ts`.

### Reevaluacion de items ya aceptados

- **(a) household_members INSERT sin validar invitacion** -- sigue presente tal cual se describio, pero ver C1: el hallazgo nuevo de este reporte es estrictamente mas grave que (a) porque no depende de adivinar un UUID de hogar; actua sobre membresias ya visibles. Se recomienda corregir ambos con el mismo cambio de politica/trigger propuesto en C1.
- **(b) Sin FK compuesta category_id/household_id** -- confirmado presente, sin cambio de severidad. Ver M2 para una propuesta de mitigacion a nivel de Server Action mientras no se agregue la FK compuesta.
- **(c) updated_at/updated_by poblados por la app, no por la base de datos** -- confirmado presente. Dado que las politicas de UPDATE de `transactions` tampoco tienen WITH CHECK (ver C1), en teoria alguien podria ademas falsificar `updated_by` con un id arbitrario via llamada directa a la API -- variante menor del mismo problema raiz de C1, no un hallazgo nuevo independiente.

---

## Lo que ya esta bien (sin inflar meritos)

- El diseno RLS-como-unica-barrera-de-autorizacion esta bien fundamentado y documentado (ADR 0003), y la funcion helper `public.is_household_member()` es SECURITY DEFINER con `search_path` fijado a `public` -- evita el clasico riesgo de secuestro de search_path en funciones SECURITY DEFINER, y centraliza la logica de pertenencia en un solo lugar en vez de duplicarla por politica.
- El aislamiento de **lectura** entre hogares -- la propiedad #1 de este proyecto -- se sostiene: se revisaron las 4 politicas de SELECT (households, profiles, household_members, categories, transactions) y ninguna tiene una via de bypass hacia datos de otro hogar. Esto ademas esta confirmado por una prueba de integracion real de dos hogares (`tests/integration/rls-isolation.test.ts`) que pasa y cubre lectura, insercion, UPDATE y DELETE cruzados -- no es solo una afirmacion de diseno, hay evidencia ejecutable.
- Los usos de `createServiceRoleClient()` estan acotados y localizados: solo en `join-household-actions.ts` (redencion de invitacion, necesario porque el usuario aun no es miembro) y en scripts/tests de siembra y limpieza. La logica de negocio que reemplaza a RLS ahi (codigo sin usar, no expirado, cupo de reparto disponible) esta completa salvo por la falta de throttling (I2).
- Ninguna politica de SELECT/INSERT tiene el mismo problema que C1 -- el problema esta acotado a las dos politicas de UPDATE senaladas, no es un patron sistemico en todo el esquema.
- No se encontro ningun secreto real filtrado en el historial de git (`git log -p --all` completo, sin limite de commits, buscando patrones de JWT de Supabase, cadenas de conexion postgres:// y tokens de Notion) -- el unico parecido fue un placeholder literal en un documento de instrucciones (texto truncado tipo "eyJ..."), no una clave real. `.env.local` esta en `.gitignore` desde el primer commit que la referencia.
- `npm audit` no reporta vulnerabilidades conocidas en el arbol de dependencias actual.
- No hay ningun uso de `dangerouslySetInnerHTML` en todo el codigo -- todo el contenido generado por el usuario (concepto de gasto, nombre de hogar, etc.) se renderiza via interpolacion estandar de JSX, que React escapa automaticamente.
- Cobertura de validacion con zod razonablemente completa: los 9 Server Actions que aceptan FormData (signup, login, forgot-password, reset-password, create-household, join-household, create-transaction, update-transaction, update-split-percentage) validan su entrada antes de tocar la base de datos.
- CSRF: al usar Server Actions de Next.js exclusivamente para mutaciones (no hay rutas de API legacy aceptando POST entre origenes), se hereda la verificacion de origen que Next.js aplica por defecto a las Server Actions.

---

## Priorizacion sugerida antes de dar de alta a los dos usuarios reales

1. **C1** -- corregir las politicas de UPDATE (y agregar los triggers de inmutabilidad). Es el unico hallazgo que permite a una de las dos partes manipular unilateralmente los datos/acceso de la otra.
2. **I1** -- arreglar el flujo de recuperacion de contrasena antes de necesitarlo de verdad.
3. **I2** e **I3** -- rapidos de aplicar, cierralos en la misma pasada.
4. **M1** -- antes del primer push a un remoto publico, no antes de dar de alta a los usuarios.
5. **M2, M3, M4** -- mejoras de robustez, sin apuro pero sin costo alto de implementar.
