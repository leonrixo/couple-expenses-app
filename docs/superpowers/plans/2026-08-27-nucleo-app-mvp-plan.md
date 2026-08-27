# Núcleo de la app de gastos en pareja — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el MVP de la app de gastos en pareja: registro/login, hogares con invitación, registrar/editar/borrar gastos con reparto automático (60/40, 50/50 o personalizado), balance en vivo de quién le debe a quién, y despliegue real en Vercel.

**Architecture:** Next.js 14+ (App Router) + TypeScript, Server Components para lectura y Server Actions para escritura (sin API REST separada). Supabase da Postgres + Auth + Row Level Security para aislar datos por hogar a nivel de base de datos. Tailwind + shadcn/ui para la interfaz, mobile-first.

**Tech Stack:** Next.js, TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Tailwind CSS, shadcn/ui, zod, react-hook-form, Vitest, Playwright, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-27-nucleo-app-mvp-design.md`

## Global Constraints

- Presupuesto de hosting: $0 — todo debe caber en las capas gratuitas de Vercel y Supabase.
- La app debe funcionar bien responsive en PC y en celular (mobile-first).
- Login principal: email + contraseña, con recuperación de contraseña por correo (no magic link).
- Reparto: `regular` usa `default_split_percentage` de cada miembro (ej. 60/40); `big` es siempre 50/50; `custom` usa `custom_split_percentage` de la transacción, definido como el % que corresponde al miembro con `role = owner`.
- El balance ("quién debe a quién") se calcula siempre al vuelo desde `transactions` — nunca se guarda duplicado en otra tabla.
- Las políticas de RLS de Supabase deben aislar TODAS las tablas por `household_id` — se prueba con dos hogares reales, no solo se revisa en el código.
- Este mini-proyecto asume hogares de exactamente 2 miembros (el modelo es extensible, pero no se prueba con más).
- No se migran datos históricos del Excel — la app arranca vacía.
- Fuera de alcance de este plan: PWA/manifest (Mini-proyecto 3), presupuestos por categoría y dashboard visual (Mini-proyecto 2) — el campo `categories.monthly_budget` existe en el esquema pero no se usa todavía.
- Cualquier miembro del hogar puede editar o borrar cualquier transacción de su propio hogar (colaborativo, no exclusivo de quien la creó). Borrado es definitivo (hard delete) para este MVP.

---

## Task 1: Scaffolding del proyecto Next.js

**Files:**
- Create: todo el árbol base de Next.js (`app/`, `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `next-env.d.ts`)
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Modify: `.gitignore` (ya existe, agregar entradas de Next.js si `create-next-app` no las agrega todas)

**Interfaces:**
- Consumes: nada (primer task)
- Produces: estructura base del proyecto sobre la que corren todos los demás tasks; scripts npm `dev`, `build`, `test` (Vitest), `test:e2e` (Playwright)

El repo ya tiene `docs/`, `PROYECTO.md`, `.gitignore`, `.env.local` y `.git` — `create-next-app` puede rechazar inicializar sobre un directorio no vacío, así que se genera en una carpeta temporal y se mueve.

- [ ] **Step 1: Generar el proyecto Next.js en una carpeta temporal**

```bash
cd "C:\Users\leonr\Visual studio claude\gastos-pareja"
npx create-next-app@latest app-tmp --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Mover los archivos generados a la raíz del repo**

```bash
cd "C:\Users\leonr\Visual studio claude\gastos-pareja"
mv app-tmp/app app-tmp/public app-tmp/next.config.ts app-tmp/tsconfig.json \
   app-tmp/tailwind.config.ts app-tmp/postcss.config.mjs app-tmp/package.json \
   app-tmp/package-lock.json app-tmp/next-env.d.ts app-tmp/.eslintrc.json .
rm -rf app-tmp
```

(Si algún nombre de archivo difiere según la versión de `create-next-app` — por ejemplo `postcss.config.js` en vez de `.mjs` — mover el que realmente se haya generado.)

- [ ] **Step 3: Instalar dependencias adicionales**

```bash
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers
npm install -D vitest @vitejs/plugin-react @playwright/test
```

- [ ] **Step 4: Inicializar shadcn/ui y agregar los componentes que va a usar toda la app**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label form select card dialog table checkbox sonner badge
```

- [ ] **Step 5: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Agregar a `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 6: Configurar Playwright**

```bash
npx playwright install --with-deps chromium
```

Crear `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

Agregar script: `"test:e2e": "playwright test"`.

- [ ] **Step 7: Smoke test — confirmar que el proyecto compila y los tests corren**

```bash
npm run build
npm run test
```

Expected: `npm run build` termina sin errores; `npm run test` corre 0 tests sin fallar (todavía no hay tests, pero el runner debe ejecutar limpio).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffolding de Next.js, Tailwind, shadcn/ui, Vitest y Playwright"
```

---

## Task 2: Cliente de Supabase y variables de entorno

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `middleware.ts`
- Create: `lib/supabase/check-connection.test.ts`
- Modify: `.env.local` (agregar variables de Supabase — el usuario debe haber creado ya un proyecto en supabase.com)

**Interfaces:**
- Consumes: ninguna interfaz de tasks previos
- Produces: `createClient()` (browser, en `lib/supabase/client.ts`) y `createClient()` (server, en `lib/supabase/server.ts`) — ambas devuelven un cliente de Supabase tipado, usados por TODOS los Server Actions y páginas de tasks posteriores.

Antes de este task, el usuario debe crear un proyecto gratuito en https://supabase.com y obtener: `Project URL` y `anon public key` (Settings → API), y el `service_role key` (mismo lugar, solo para uso server-side).

- [ ] **Step 1: Agregar variables de entorno**

Agregar a `.env.local` (ya está en `.gitignore`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 2: Cliente de Supabase para Client Components**

Crear `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Cliente de Supabase para Server Components y Server Actions**

Crear `lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // se llama desde un Server Component — el middleware refresca la sesión
          }
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

`createServiceRoleClient` se usa SOLO server-side (nunca en Client Components) para el flujo de unirse a un hogar con código de invitación (Task 9), donde el usuario todavía no es miembro y RLS le bloquearía ver el código.

- [ ] **Step 4: Middleware para refrescar la sesión**

Crear `middleware.ts` en la raíz:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Test de conexión**

Crear `lib/supabase/check-connection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createServiceRoleClient } from "./server";

describe("conexión a Supabase", () => {
  it("responde sin error de red ni de credenciales", async () => {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("_realtime_dummy_check").select("*").limit(1);
    // Se espera un error de "tabla no existe" (42P01), NO un error de red o de API key inválida.
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42P01");
  });
});
```

- [ ] **Step 6: Correr el test**

```bash
npm run test
```

Expected: PASS — confirma que las credenciales de Supabase son válidas y el proyecto responde (el error esperado es "la tabla no existe", no un error de autenticación).

- [ ] **Step 7: Commit**

```bash
git add lib/supabase middleware.ts
git commit -m "feat: cliente de Supabase (browser, server, service role) y middleware de sesión"
```

---

## Task 3: Migración — households, profiles, household_members

**Files:**
- Create: `supabase/migrations/0001_households_profiles_members.sql`

**Interfaces:**
- Consumes: proyecto de Supabase de Task 2
- Produces: tablas `households`, `profiles`, `household_members`; función `public.is_household_member(uuid) returns boolean`, usada por las políticas RLS de todas las tablas siguientes; trigger que crea automáticamente una fila en `profiles` al registrarse un usuario.

Esta migración se aplica manualmente en el SQL Editor del dashboard de Supabase (o vía `supabase db push` si el usuario instala la CLI de Supabase — cualquiera de las dos funciona, se documenta la opción del dashboard por ser la más simple sin herramientas adicionales).

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/0001_households_profiles_members.sql`:

```sql
-- households
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- profiles: extiende auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- crea automáticamente un profile al registrarse un usuario
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- household_members
create type household_role as enum ('owner', 'member');

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role household_role not null default 'member',
  default_split_percentage numeric(5,2) not null check (default_split_percentage >= 0 and default_split_percentage <= 100),
  primary key (household_id, user_id)
);

-- helper usado por TODAS las políticas RLS de este proyecto
create function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

alter table households enable row level security;
alter table profiles enable row level security;
alter table household_members enable row level security;

create policy "miembros ven su propio hogar"
  on households for select
  using (public.is_household_member(id));

create policy "cualquier usuario autenticado puede crear un hogar"
  on households for insert
  with check (auth.uid() is not null);

create policy "un usuario ve su propio profile y los de sus hogares"
  on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from household_members hm1
      join household_members hm2 on hm1.household_id = hm2.household_id
      where hm1.user_id = auth.uid() and hm2.user_id = profiles.id
    )
  );

create policy "un usuario edita solo su propio profile"
  on profiles for update
  using (id = auth.uid());

create policy "miembros ven a los demás miembros de su hogar"
  on household_members for select
  using (public.is_household_member(household_id));

create policy "un usuario se agrega a si mismo como miembro"
  on household_members for insert
  with check (user_id = auth.uid());

create policy "miembros editan el reparto dentro de su hogar"
  on household_members for update
  using (public.is_household_member(household_id));
```

- [ ] **Step 2: Aplicar la migración**

Copiar y correr el contenido del archivo en el SQL Editor del dashboard de Supabase del proyecto (Database → SQL Editor → New query → pegar → Run).

Expected: "Success. No rows returned."

- [ ] **Step 3: Test de verificación del esquema**

Crear `supabase/migrations/0001.test.ts` (test manual de humo, no en `lib/` porque valida infraestructura, no lógica de la app):

```ts
import { describe, it, expect } from "vitest";
import { createServiceRoleClient } from "../../lib/supabase/server";

describe("migración 0001 — households, profiles, household_members", () => {
  it("las tres tablas existen y son consultables", async () => {
    const supabase = createServiceRoleClient();
    for (const table of ["households", "profiles", "household_members"]) {
      const { error } = await supabase.from(table).select("*").limit(1);
      expect(error, `tabla ${table} debería existir`).toBeNull();
    }
  });
});
```

- [ ] **Step 4: Correr el test**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_households_profiles_members.sql supabase/migrations/0001.test.ts
git commit -m "feat(db): migración de households, profiles y household_members con RLS base"
```

---

## Task 4: Migración — categories y household_invites

**Files:**
- Create: `supabase/migrations/0002_categories_invites.sql`
- Create: `lib/households/default-categories.ts`

**Interfaces:**
- Consumes: `is_household_member()` de Task 3
- Produces: tablas `categories`, `household_invites`; constante `DEFAULT_CATEGORIES: string[]` (usada por Task 8 al crear un hogar)

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/0002_categories_invites.sql`:

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  monthly_budget numeric(10,2),
  is_default boolean not null default false
);

create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references profiles(id),
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table household_invites enable row level security;

create policy "miembros ven las categorias de su hogar"
  on categories for select
  using (public.is_household_member(household_id));

create policy "miembros crean categorias en su hogar"
  on categories for insert
  with check (public.is_household_member(household_id));

-- household_invites: solo miembros del hogar pueden VER/crear invitaciones desde
-- la app (para generar el código). La consulta de un código por alguien que
-- todavía no es miembro (flujo de "unirse") se hace server-side con la service
-- role key en Task 9, que bypassa RLS a propósito.
create policy "miembros ven las invitaciones de su hogar"
  on household_invites for select
  using (public.is_household_member(household_id));

create policy "miembros crean invitaciones en su hogar"
  on household_invites for insert
  with check (public.is_household_member(household_id));
```

- [ ] **Step 2: Aplicar la migración**

Correr el archivo en el SQL Editor de Supabase, igual que Task 3.

- [ ] **Step 3: Constante de categorías por defecto**

Crear `lib/households/default-categories.ts`:

```ts
export const DEFAULT_CATEGORIES = [
  "Tienda/Súper",
  "Comida",
  "Otros/Varios",
  "Cuidado del hogar",
  "Gasolina",
  "Servicios",
  "Entretenimiento",
  "Salud",
  "Auto",
  "Mascotas",
  "Transporte",
  "Renta",
] as const;
```

- [ ] **Step 4: Test de la constante**

Crear `lib/households/default-categories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_CATEGORIES } from "./default-categories";

describe("DEFAULT_CATEGORIES", () => {
  it("tiene exactamente las 12 categorías del análisis histórico", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(12);
    expect(DEFAULT_CATEGORIES).toContain("Tienda/Súper");
    expect(DEFAULT_CATEGORIES).toContain("Renta");
  });

  it("no tiene nombres duplicados", () => {
    expect(new Set(DEFAULT_CATEGORIES).size).toBe(DEFAULT_CATEGORIES.length);
  });
});
```

- [ ] **Step 5: Correr los tests**

```bash
npm run test
```

Expected: PASS (incluye también el test de humo de la migración — agregar el mismo patrón de `supabase/migrations/0002.test.ts` que en Task 3, Step 3, verificando `categories` y `household_invites`).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_categories_invites.sql lib/households/default-categories.ts lib/households/default-categories.test.ts
git commit -m "feat(db): migración de categories y household_invites + constante de categorías por defecto"
```

---

## Task 5: Migración — transactions, RLS completo, y prueba de aislamiento entre hogares

**Files:**
- Create: `supabase/migrations/0003_transactions.sql`
- Create: `tests/integration/rls-isolation.test.ts`

**Interfaces:**
- Consumes: todas las tablas y `is_household_member()` de Tasks 3-4
- Produces: tabla `transactions`; prueba automatizada de que dos hogares están completamente aislados — historia 13 del backlog (Must have, la de más riesgo del proyecto)

- [ ] **Step 1: Escribir la migración**

Crear `supabase/migrations/0003_transactions.sql`:

```sql
create type split_type as enum ('regular', 'big', 'custom');

create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  concept text not null check (char_length(trim(concept)) > 0),
  paid_by uuid not null references profiles(id),
  category_id uuid not null references categories(id),
  date date not null default current_date,
  split_type split_type not null default 'regular',
  custom_split_percentage numeric(5,2) check (custom_split_percentage is null or (custom_split_percentage >= 0 and custom_split_percentage <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references profiles(id)
);

alter table transactions enable row level security;

create policy "miembros ven las transacciones de su hogar"
  on transactions for select
  using (public.is_household_member(household_id));

create policy "miembros crean transacciones en su hogar"
  on transactions for insert
  with check (public.is_household_member(household_id));

create policy "miembros editan transacciones de su hogar"
  on transactions for update
  using (public.is_household_member(household_id));

create policy "miembros borran transacciones de su hogar"
  on transactions for delete
  using (public.is_household_member(household_id));
```

- [ ] **Step 2: Aplicar la migración**

Correr el archivo en el SQL Editor de Supabase.

- [ ] **Step 3: Escribir la prueba de aislamiento entre hogares (falla primero)**

Crear `tests/integration/rls-isolation.test.ts`:

```ts
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
```

- [ ] **Step 4: Correr la prueba**

```bash
npm run test -- tests/integration/rls-isolation.test.ts
```

Expected al inicio (antes de aplicar la migración, o si alguna política falta): al menos uno de los tres primeros casos FALLA con datos visibles donde no debería. Si esto pasa, corregir las políticas antes de seguir — es la prueba más importante del proyecto.

- [ ] **Step 5: Confirmar que los 4 casos pasan tras la migración completa**

```bash
npm run test -- tests/integration/rls-isolation.test.ts
```

Expected: PASS los 4 casos.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0003_transactions.sql tests/integration/rls-isolation.test.ts
git commit -m "feat(db): migración de transactions con RLS completo + prueba de aislamiento entre hogares"
```

---

## Task 6: lib/split-logic.ts — cálculo de reparto y balance

**Files:**
- Create: `lib/split-logic.ts`
- Test: `lib/split-logic.test.ts`

**Interfaces:**
- Consumes: nada (lógica pura, sin dependencias de Supabase ni de Next.js)
- Produces: `percentageFor(userId, tx, members)`, `amountOwedBy(userId, tx, members)`, `calculateBalance(transactions, members)` — usadas por Task 12 (ver balance) y por los Server Actions de Tasks 10-11 para mostrar feedback

Esta es la parte con la cobertura de tests más alta del proyecto: un error aquí significa dinero mal calculado entre la pareja.

- [ ] **Step 1: Escribir los tests (fallan primero, `split-logic.ts` no existe todavía)**

Crear `lib/split-logic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { percentageFor, amountOwedBy, calculateBalance, type HouseholdMember, type SplitTransaction } from "./split-logic";

const gustavo: HouseholdMember = { userId: "gustavo", role: "owner", defaultSplitPercentage: 60 };
const esperanza: HouseholdMember = { userId: "esperanza", role: "member", defaultSplitPercentage: 40 };
const members = [gustavo, esperanza];

describe("percentageFor", () => {
  it("reparto regular usa el default_split_percentage de cada miembro", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "gustavo", splitType: "regular" };
    expect(percentageFor("gustavo", tx, members)).toBe(60);
    expect(percentageFor("esperanza", tx, members)).toBe(40);
  });

  it("reparto grande siempre es 50/50 sin importar default_split_percentage", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "gustavo", splitType: "big" };
    expect(percentageFor("gustavo", tx, members)).toBe(50);
    expect(percentageFor("esperanza", tx, members)).toBe(50);
  });

  it("reparto personalizado usa custom_split_percentage para el owner y el complemento para el resto", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "esperanza", splitType: "custom", customSplitPercentage: 70 };
    expect(percentageFor("gustavo", tx, members)).toBe(70);
    expect(percentageFor("esperanza", tx, members)).toBe(30);
  });

  it("lanza error si el usuario no es miembro del hogar", () => {
    const tx: SplitTransaction = { amount: 100, paidBy: "gustavo", splitType: "regular" };
    expect(() => percentageFor("desconocido", tx, members)).toThrow();
  });
});

describe("amountOwedBy", () => {
  it("calcula el monto exacto con decimales y redondeo a 2 posiciones", () => {
    const tx: SplitTransaction = { amount: 99.99, paidBy: "gustavo", splitType: "regular" };
    expect(amountOwedBy("gustavo", tx, members)).toBeCloseTo(59.99, 2);
    expect(amountOwedBy("esperanza", tx, members)).toBeCloseTo(40.0, 2);
  });
});

describe("calculateBalance", () => {
  it("una sola transacción regular deja al que no pagó debiendo su parte", () => {
    const txs: SplitTransaction[] = [{ amount: 100, paidBy: "gustavo", splitType: "regular" }];
    const balance = calculateBalance(txs, members);
    expect(balance["gustavo"]).toBeCloseTo(40, 2);
    expect(balance["esperanza"]).toBeCloseTo(-40, 2);
  });

  it("una transacción grande 50/50 reparte la deuda a la mitad", () => {
    const txs: SplitTransaction[] = [{ amount: 100, paidBy: "esperanza", splitType: "big" }];
    const balance = calculateBalance(txs, members);
    expect(balance["esperanza"]).toBeCloseTo(50, 2);
    expect(balance["gustavo"]).toBeCloseTo(-50, 2);
  });

  it("varias transacciones se netean correctamente", () => {
    const txs: SplitTransaction[] = [
      { amount: 100, paidBy: "gustavo", splitType: "regular" }, // gustavo +40
      { amount: 50, paidBy: "esperanza", splitType: "big" }, // esperanza +25, gustavo -25
    ];
    const balance = calculateBalance(txs, members);
    expect(balance["gustavo"]).toBeCloseTo(15, 2);
    expect(balance["esperanza"]).toBeCloseTo(-15, 2);
  });

  it("el balance de ambos miembros siempre suma cero", () => {
    const txs: SplitTransaction[] = [
      { amount: 733.5, paidBy: "gustavo", splitType: "regular" },
      { amount: 120, paidBy: "esperanza", splitType: "custom", customSplitPercentage: 25 },
      { amount: 40, paidBy: "gustavo", splitType: "big" },
    ];
    const balance = calculateBalance(txs, members);
    expect(balance["gustavo"] + balance["esperanza"]).toBeCloseTo(0, 2);
  });
});
```

- [ ] **Step 2: Correr los tests para confirmar que fallan**

```bash
npm run test -- lib/split-logic.test.ts
```

Expected: FAIL — `Cannot find module './split-logic'`.

- [ ] **Step 3: Implementar `lib/split-logic.ts`**

```ts
export type SplitType = "regular" | "big" | "custom";

export interface HouseholdMember {
  userId: string;
  role: "owner" | "member";
  defaultSplitPercentage: number;
}

export interface SplitTransaction {
  amount: number;
  paidBy: string;
  splitType: SplitType;
  customSplitPercentage?: number | null;
}

export interface Balance {
  [userId: string]: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function percentageFor(
  userId: string,
  tx: SplitTransaction,
  members: HouseholdMember[]
): number {
  if (tx.splitType === "big") return 50;

  if (tx.splitType === "custom") {
    const owner = members.find((m) => m.role === "owner");
    if (!owner) throw new Error("El hogar no tiene un owner definido");
    const ownerPct = tx.customSplitPercentage ?? 50;
    return userId === owner.userId ? ownerPct : 100 - ownerPct;
  }

  const member = members.find((m) => m.userId === userId);
  if (!member) throw new Error(`El usuario ${userId} no es miembro de este hogar`);
  return member.defaultSplitPercentage;
}

export function amountOwedBy(
  userId: string,
  tx: SplitTransaction,
  members: HouseholdMember[]
): number {
  const pct = percentageFor(userId, tx, members);
  return round2((tx.amount * pct) / 100);
}

export function calculateBalance(
  transactions: SplitTransaction[],
  members: HouseholdMember[]
): Balance {
  const balance: Balance = {};
  for (const m of members) balance[m.userId] = 0;

  for (const tx of transactions) {
    for (const m of members) {
      const owed = amountOwedBy(m.userId, tx, members);
      if (m.userId === tx.paidBy) {
        balance[m.userId] = round2(balance[m.userId] + (tx.amount - owed));
      } else {
        balance[m.userId] = round2(balance[m.userId] - owed);
      }
    }
  }
  return balance;
}
```

- [ ] **Step 4: Correr los tests para confirmar que pasan**

```bash
npm run test -- lib/split-logic.test.ts
```

Expected: PASS los 9 casos.

- [ ] **Step 5: Commit**

```bash
git add lib/split-logic.ts lib/split-logic.test.ts
git commit -m "feat: lib/split-logic con cálculo de reparto (regular/big/custom) y balance neto"
```

---

## Task 7: Autenticación — registro, login, logout, recuperar contraseña

**Files:**
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/signup/actions.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/actions.ts`
- Create: `app/(auth)/forgot-password/page.tsx`
- Create: `app/(auth)/forgot-password/actions.ts`
- Create: `app/(auth)/reset-password/page.tsx`
- Create: `app/(auth)/reset-password/actions.ts`
- Create: `app/auth/logout/route.ts`
- Create: `lib/validation/auth.ts`
- Test: `lib/validation/auth.test.ts`

**Interfaces:**
- Consumes: `createClient()` de `lib/supabase/server.ts` (Task 2)
- Produces: rutas `/signup`, `/login`, `/forgot-password`, `/reset-password`; esquemas zod `signUpSchema`, `signInSchema` reutilizados por Task 8 (redirección post-login según si el usuario ya tiene hogar)

- [ ] **Step 1: Escribir el test de validación (falla primero)**

Crear `lib/validation/auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { signUpSchema, signInSchema } from "./auth";

describe("signUpSchema", () => {
  it("acepta correo y contraseña válidos", () => {
    const result = signUpSchema.safeParse({ email: "a@b.com", password: "Segura123!" });
    expect(result.success).toBe(true);
  });

  it("rechaza correo inválido", () => {
    const result = signUpSchema.safeParse({ email: "no-es-correo", password: "Segura123!" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    const result = signUpSchema.safeParse({ email: "a@b.com", password: "corta" });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("acepta correo y contraseña no vacíos", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "cualquiera" });
    expect(result.success).toBe(true);
  });

  it("rechaza contraseña vacía", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test — falla**

```bash
npm run test -- lib/validation/auth.test.ts
```

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar los esquemas**

Crear `lib/validation/auth.ts`:

```ts
import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const signInSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Correo inválido"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});
```

- [ ] **Step 4: Correr el test — pasa**

```bash
npm run test -- lib/validation/auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Server Action de registro**

Crear `app/(auth)/signup/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/auth";

export async function signUp(prevState: { error: string | null }, formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: error.message === "User already registered" ? "Ese correo ya está registrado" : error.message };
  }

  redirect("/onboarding");
}
```

- [ ] **Step 6: Página de registro**

Crear `app/(auth)/signup/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { signUp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, { error: null });

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <a href="/login" className="underline">Inicia sesión</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Server Action y página de login**

Crear `app/(auth)/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/auth";

export async function signIn(prevState: { error: string | null }, formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Correo o contraseña incorrectos" };
  }

  redirect("/");
}
```

Crear `app/(auth)/login/page.tsx` (mismo patrón que `signup/page.tsx`, cambiando el título a "Iniciar sesión", el texto del botón, la acción importada de `./actions`, y agregando un link `<a href="/forgot-password">¿Olvidaste tu contraseña?</a>` debajo del formulario).

- [ ] **Step 8: Recuperar contraseña**

Crear `app/(auth)/forgot-password/actions.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export async function requestPasswordReset(prevState: { error: string | null; sent: boolean }, formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, sent: false };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  // Siempre se responde "enviado", exista o no el correo (no revelar qué correos están registrados)
  return { error: null, sent: true };
}
```

Crear `app/(auth)/forgot-password/page.tsx` (formulario de un solo campo "email"; si `state.sent` es true, mostrar "Si el correo existe, te enviamos un link para restablecer tu contraseña" en vez del formulario).

Crear `app/(auth)/reset-password/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function resetPassword(prevState: { error: string | null }, formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }

  redirect("/login");
}
```

Crear `app/(auth)/reset-password/page.tsx` (un solo campo "password", llama a `resetPassword`; el usuario llega aquí ya autenticado por el link del correo, Supabase Auth maneja esa sesión temporal automáticamente).

- [ ] **Step 9: Logout**

Crear `app/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
}
```

- [ ] **Step 10: Verificación manual del flujo completo**

```bash
npm run dev
```

Abrir `http://localhost:3000/signup`, crear una cuenta de prueba, confirmar redirección a `/onboarding` (la página se crea en Task 8 — por ahora puede dar 404, lo importante es confirmar que el registro y la sesión funcionan). Cerrar sesión con un `fetch("/auth/logout", { method: "POST" })` desde la consola del navegador y confirmar que redirige a `/login`. Iniciar sesión de nuevo con las mismas credenciales.

Expected: registro, logout y login funcionan sin error; un correo repetido en `/signup` muestra "Ese correo ya está registrado".

- [ ] **Step 11: Commit**

```bash
git add app/\(auth\) app/auth lib/validation
git commit -m "feat: auth completa (registro, login, logout, recuperar contraseña)"
```

---

## Task 8: Crear un hogar (onboarding) con siembra de categorías

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `app/onboarding/create-household-actions.ts`
- Create: `lib/validation/household.ts`
- Test: `lib/validation/household.test.ts`

**Interfaces:**
- Consumes: `createClient()` (Task 2), `DEFAULT_CATEGORIES` (Task 4), tablas `households`/`household_members`/`categories` (Tasks 3-4)
- Produces: `createHouseholdSchema`; ruta `/onboarding` a la que Task 7 redirige tras el registro

- [ ] **Step 1: Escribir el test de validación (falla primero)**

Crear `lib/validation/household.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createHouseholdSchema } from "./household";

describe("createHouseholdSchema", () => {
  it("acepta un nombre de hogar y un porcentaje entre 0 y 100", () => {
    const result = createHouseholdSchema.safeParse({ name: "Casa Gustavo y Esperanza", ownerSplitPercentage: 60 });
    expect(result.success).toBe(true);
  });

  it("rechaza un porcentaje mayor a 100", () => {
    const result = createHouseholdSchema.safeParse({ name: "Casa", ownerSplitPercentage: 150 });
    expect(result.success).toBe(false);
  });

  it("rechaza un porcentaje negativo", () => {
    const result = createHouseholdSchema.safeParse({ name: "Casa", ownerSplitPercentage: -10 });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre vacío", () => {
    const result = createHouseholdSchema.safeParse({ name: "", ownerSplitPercentage: 60 });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test — falla**

```bash
npm run test -- lib/validation/household.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implementar el esquema**

Crear `lib/validation/household.ts`:

```ts
import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "El nombre del hogar es requerido"),
  ownerSplitPercentage: z.coerce.number().min(0).max(100),
});

export const joinHouseholdSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
});
```

- [ ] **Step 4: Correr el test — pasa**

```bash
npm run test -- lib/validation/household.test.ts
```

Expected: PASS.

- [ ] **Step 5: Server Action para crear el hogar**

Crear `app/onboarding/create-household-actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createHouseholdSchema } from "@/lib/validation/household";
import { DEFAULT_CATEGORIES } from "@/lib/households/default-categories";

export async function createHousehold(prevState: { error: string | null }, formData: FormData) {
  const parsed = createHouseholdSchema.safeParse({
    name: formData.get("name"),
    ownerSplitPercentage: formData.get("ownerSplitPercentage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Sesión inválida, inicia sesión de nuevo" };
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({ name: parsed.data.name })
    .select()
    .single();
  if (householdError) {
    return { error: householdError.message };
  }

  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: userData.user.id,
    role: "owner",
    default_split_percentage: parsed.data.ownerSplitPercentage,
  });
  if (memberError) {
    return { error: memberError.message };
  }

  const { error: categoriesError } = await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((name) => ({ household_id: household.id, name, is_default: true }))
  );
  if (categoriesError) {
    return { error: categoriesError.message };
  }

  redirect("/");
}
```

- [ ] **Step 6: Página de onboarding**

Crear `app/onboarding/page.tsx` con dos opciones visibles (crear hogar / unirse con código — el formulario de "unirse" se conecta en Task 9):

```tsx
"use client";

import { useActionState } from "react";
import { createHousehold } from "./create-household-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(createHousehold, { error: null });

  return (
    <div className="mx-auto mt-16 max-w-md space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Bienvenido</h1>
      <Card>
        <CardHeader>
          <CardTitle>Crear un hogar nuevo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del hogar</Label>
              <Input id="name" name="name" required placeholder="Ej. Casa Gustavo y Esperanza" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerSplitPercentage">Tu porcentaje en gastos regulares (%)</Label>
              <Input id="ownerSplitPercentage" name="ownerSplitPercentage" type="number" min={0} max={100} required defaultValue={50} />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creando..." : "Crear hogar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">— o —</p>
      <Card>
        <CardHeader>
          <CardTitle>Unirse a un hogar existente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Pide el código de invitación a tu pareja.</p>
          {/* Formulario de unirse: Task 9 */}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Verificación manual**

```bash
npm run dev
```

Registrar una cuenta nueva, en `/onboarding` crear un hogar con nombre y porcentaje, confirmar redirección a `/` y (via SQL Editor de Supabase, `select * from categories where household_id = '...'`) confirmar que se insertaron las 12 categorías por defecto.

Expected: 12 filas en `categories`, 1 fila en `household_members` con `role = 'owner'`.

- [ ] **Step 8: Commit**

```bash
git add app/onboarding lib/validation/household.ts lib/validation/household.test.ts
git commit -m "feat: crear un hogar nuevo con siembra automática de categorías"
```

---

## Task 9: Invitaciones — generar código y unirse a un hogar

**Files:**
- Create: `app/settings/invite-actions.ts`
- Create: `app/settings/page.tsx`
- Create: `app/onboarding/join-household-actions.ts`
- Modify: `app/onboarding/page.tsx` (conectar el formulario de "unirse")

**Interfaces:**
- Consumes: `joinHouseholdSchema` (Task 8), `createServiceRoleClient()` (Task 2)
- Produces: generación de código (`generateInviteCode`) y unión a hogar (`joinHousehold`) — cierran las historias 4, 5, 10, 11 y 13 (validación de suma 100%) del backlog

- [ ] **Step 1: Server Action para generar código de invitación**

Crear `app/settings/invite-actions.ts`:

```ts
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
```

- [ ] **Step 2: Server Action para unirse a un hogar (usa service role — el usuario todavía no es miembro)**

Crear `app/onboarding/join-household-actions.ts`:

```ts
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
```

- [ ] **Step 3: Conectar el formulario de "unirse" en onboarding**

Modificar `app/onboarding/page.tsx`: agregar un segundo `useActionState` con `joinHousehold`, y dentro del `<CardContent>` de "Unirse a un hogar existente" agregar:

```tsx
<form action={joinFormAction} className="mt-3 flex gap-2">
  <Input name="code" placeholder="Código de invitación" required />
  <Button type="submit" disabled={joinPending}>
    {joinPending ? "Uniendo..." : "Unirme"}
  </Button>
</form>
{joinState.error && <p className="mt-2 text-sm text-red-600">{joinState.error}</p>}
```

(con los imports y hooks correspondientes: `import { joinHousehold } from "./join-household-actions";` y `const [joinState, joinFormAction, joinPending] = useActionState(joinHousehold, { error: null });`)

- [ ] **Step 4: Página de configuración con el botón de generar invitación**

Crear `app/settings/page.tsx` (Server Component que obtiene el `household_id` del usuario actual y muestra un botón que llama a `generateInviteCode` — usar un Client Component pequeño embebido para el botón con `useState` mostrando el código generado en un `<Dialog>`).

- [ ] **Step 5: Verificación manual del flujo completo**

Con dos cuentas de prueba distintas (dos navegadores o uno en incógnito): cuenta A crea un hogar con 60%, genera un código desde `/settings`; cuenta B se une con ese código desde `/onboarding`.

Expected: cuenta B queda como `member` con `default_split_percentage = 40`; el código generado no se puede volver a usar (probar de nuevo con el mismo código debe mostrar "ya fue usado"); un código inventado muestra "inválido".

- [ ] **Step 6: Commit**

```bash
git add app/settings app/onboarding
git commit -m "feat: generar código de invitación y unirse a un hogar existente"
```

---

## Task 10: Registrar un gasto

**Files:**
- Create: `app/transactions/new/page.tsx`
- Create: `app/transactions/actions.ts`
- Create: `lib/validation/transaction.ts`
- Test: `lib/validation/transaction.test.ts`

**Interfaces:**
- Consumes: `createClient()` (Task 2), categorías del hogar (Task 4/8)
- Produces: `createTransactionSchema`; Server Action `createTransaction` reutilizada como base por Task 11 (editar)

- [ ] **Step 1: Escribir el test de validación (falla primero)**

Crear `lib/validation/transaction.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createTransactionSchema } from "./transaction";

const base = {
  amount: "150.50",
  concept: "Súper de la semana",
  categoryId: "11111111-1111-1111-1111-111111111111",
  paidBy: "22222222-2222-2222-2222-222222222222",
  date: "2026-08-27",
  splitType: "regular" as const,
};

describe("createTransactionSchema", () => {
  it("acepta una transacción regular válida", () => {
    expect(createTransactionSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza monto negativo", () => {
    expect(createTransactionSchema.safeParse({ ...base, amount: "-10" }).success).toBe(false);
  });

  it("rechaza monto cero", () => {
    expect(createTransactionSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
  });

  it("rechaza monto no numérico", () => {
    expect(createTransactionSchema.safeParse({ ...base, amount: "abc" }).success).toBe(false);
  });

  it("rechaza concepto vacío", () => {
    expect(createTransactionSchema.safeParse({ ...base, concept: "  " }).success).toBe(false);
  });

  it("split_type custom requiere customSplitPercentage entre 0 y 100", () => {
    expect(
      createTransactionSchema.safeParse({ ...base, splitType: "custom", customSplitPercentage: "70" }).success
    ).toBe(true);
    expect(
      createTransactionSchema.safeParse({ ...base, splitType: "custom", customSplitPercentage: "150" }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test — falla**

```bash
npm run test -- lib/validation/transaction.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implementar el esquema**

Crear `lib/validation/transaction.ts`:

```ts
import { z } from "zod";

export const createTransactionSchema = z
  .object({
    amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
    concept: z.string().trim().min(1, "El concepto es requerido"),
    categoryId: z.string().uuid("Categoría inválida"),
    paidBy: z.string().uuid("Quién pagó es requerido"),
    date: z.string().min(1, "La fecha es requerida"),
    splitType: z.enum(["regular", "big", "custom"]),
    customSplitPercentage: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((data) => data.splitType !== "custom" || data.customSplitPercentage !== undefined, {
    message: "El reparto personalizado requiere un porcentaje",
    path: ["customSplitPercentage"],
  });
```

- [ ] **Step 4: Correr el test — pasa**

```bash
npm run test -- lib/validation/transaction.test.ts
```

Expected: PASS.

- [ ] **Step 5: Server Action de creación**

Crear `app/transactions/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTransactionSchema } from "@/lib/validation/transaction";

export async function createTransaction(householdId: string, prevState: { error: string | null }, formData: FormData) {
  const parsed = createTransactionSchema.safeParse({
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    categoryId: formData.get("categoryId"),
    paidBy: formData.get("paidBy"),
    date: formData.get("date"),
    splitType: formData.get("splitType"),
    customSplitPercentage: formData.get("customSplitPercentage") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    household_id: householdId,
    amount: parsed.data.amount,
    concept: parsed.data.concept,
    category_id: parsed.data.categoryId,
    paid_by: parsed.data.paidBy,
    date: parsed.data.date,
    split_type: parsed.data.splitType,
    custom_split_percentage: parsed.data.splitType === "custom" ? parsed.data.customSplitPercentage : null,
  });
  if (error) {
    return { error: "No se pudo guardar el gasto, intenta de nuevo" };
  }

  revalidatePath("/");
  return { error: null, success: true };
}
```

- [ ] **Step 6: Página del formulario**

Crear `app/transactions/new/page.tsx` como Server Component que obtiene `household_id`, la lista de `categories` y `household_members` (con sus `display_name` vía join a `profiles`) del hogar del usuario actual, y los pasa a un Client Component con el formulario (`<Select>` de shadcn/ui para categoría, quién pagó y tipo de reparto; `<Input type="number">` para monto; campo `customSplitPercentage` que solo se muestra si `splitType === "custom"`).

- [ ] **Step 7: Verificación manual**

```bash
npm run dev
```

Registrar un gasto de cada tipo (`regular`, `big`, `custom`) y confirmar en el SQL Editor de Supabase que las filas se guardaron con los valores correctos. Probar un monto negativo y uno vacío y confirmar que el formulario muestra el error sin guardar nada.

Expected: 3 filas nuevas en `transactions`, ningún intento inválido crea una fila.

- [ ] **Step 8: Commit**

```bash
git add app/transactions lib/validation/transaction.ts lib/validation/transaction.test.ts
git commit -m "feat: registrar un gasto con validación de monto y tipo de reparto"
```

---

## Task 11: Editar y borrar un gasto

**Files:**
- Create: `app/transactions/[id]/edit/page.tsx`
- Modify: `app/transactions/actions.ts` (agregar `updateTransaction` y `deleteTransaction`)

**Interfaces:**
- Consumes: `createTransactionSchema` (Task 10), tabla `transactions` con `updated_at`/`updated_by` (Task 5)
- Produces: `updateTransaction`, `deleteTransaction` — historia 8 (Must have) del backlog

- [ ] **Step 1: Agregar `updateTransaction` y `deleteTransaction` a `app/transactions/actions.ts`**

```ts
export async function updateTransaction(
  transactionId: string,
  prevState: { error: string | null },
  formData: FormData
) {
  const parsed = createTransactionSchema.safeParse({
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    categoryId: formData.get("categoryId"),
    paidBy: formData.get("paidBy"),
    date: formData.get("date"),
    splitType: formData.get("splitType"),
    customSplitPercentage: formData.get("customSplitPercentage") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: parsed.data.amount,
      concept: parsed.data.concept,
      category_id: parsed.data.categoryId,
      paid_by: parsed.data.paidBy,
      date: parsed.data.date,
      split_type: parsed.data.splitType,
      custom_split_percentage: parsed.data.splitType === "custom" ? parsed.data.customSplitPercentage : null,
      updated_at: new Date().toISOString(),
      updated_by: userData.user?.id,
    })
    .eq("id", transactionId);

  if (error) {
    return { error: "No se pudo actualizar el gasto, intenta de nuevo" };
  }

  revalidatePath("/");
  return { error: null, success: true };
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) {
    return { error: "No se pudo borrar el gasto, intenta de nuevo" };
  }
  revalidatePath("/");
  return { error: null, success: true };
}
```

- [ ] **Step 2: Página de edición**

Crear `app/transactions/[id]/edit/page.tsx`: Server Component que lee la transacción por `id` (RLS ya garantiza que solo se puede leer si es del hogar del usuario), precarga el mismo formulario de Task 10 (extraer el formulario a un componente compartido `components/transaction-form.tsx` que reciba `defaultValues` opcionales, para no duplicar el JSX) y llama a `updateTransaction` en vez de `createTransaction`.

- [ ] **Step 3: Botón de borrar con confirmación**

En la lista de transacciones (se termina de construir en Task 12), agregar un botón "Borrar" que abre un `<Dialog>` de confirmación de shadcn/ui antes de llamar a `deleteTransaction`.

- [ ] **Step 4: Verificación manual**

Editar una transacción existente cambiando el monto y el tipo de reparto — confirmar que se actualiza `updated_at`/`updated_by` en la base. Borrar otra y confirmar que desaparece de la lista y de cualquier cálculo de balance.

Expected: los cambios persisten correctamente; la fila borrada ya no existe en `transactions`.

- [ ] **Step 5: Commit**

```bash
git add app/transactions
git commit -m "feat: editar y borrar gastos registrados, con rastro de auditoría"
```

---

## Task 12: Ver balance actual e historial de gastos

**Files:**
- Create: `app/page.tsx`
- Create: `components/balance-card.tsx`
- Create: `components/transactions-table.tsx`
- Test: `app/balance.test.ts`

**Interfaces:**
- Consumes: `calculateBalance` (Task 6), tabla `transactions` + `household_members` + `profiles`
- Produces: página principal de la app — historias 9 y 15 del backlog

- [ ] **Step 1: Escribir un test de integración del cálculo de balance con datos reales de forma (falla primero por no existir el helper)**

Crear `app/balance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateBalance, type HouseholdMember, type SplitTransaction } from "@/lib/split-logic";

describe("balance mostrado en la página principal", () => {
  it("con transacciones mixtas, el signo indica correctamente quién debe a quién", () => {
    const members: HouseholdMember[] = [
      { userId: "u1", role: "owner", defaultSplitPercentage: 60 },
      { userId: "u2", role: "member", defaultSplitPercentage: 40 },
    ];
    const txs: SplitTransaction[] = [
      { amount: 1000, paidBy: "u1", splitType: "regular" },
      { amount: 200, paidBy: "u2", splitType: "big" },
    ];
    const balance = calculateBalance(txs, members);

    // u1 pagó 1000 pero solo le tocaban 600 -> le deben 400, menos los 100 que le debe a u2 del gasto grande
    expect(balance["u1"]).toBeCloseTo(400 - 100, 2);
    expect(balance["u2"]).toBeCloseTo(-(400 - 100), 2);
  });
});
```

- [ ] **Step 2: Correr el test**

```bash
npm run test -- app/balance.test.ts
```

Expected: PASS (ya reutiliza `split-logic.ts` de Task 6, así que esto confirma la integración del cálculo, no requiere implementación nueva).

- [ ] **Step 3: Página principal — Server Component**

Crear `app/page.tsx`: obtiene `household_id` del usuario (si no tiene, `redirect("/onboarding")`), consulta todos los `household_members` (con `display_name` vía join a `profiles`) y todas las `transactions` del hogar, mapea las transacciones al tipo `SplitTransaction` de `lib/split-logic`, llama a `calculateBalance`, y renderiza `<BalanceCard balance={balance} members={members} />` seguido de `<TransactionsTable transactions={transactions} members={members} categories={categories} />`.

- [ ] **Step 4: Componente de balance**

Crear `components/balance-card.tsx`: Client o Server Component simple que recibe `balance: Balance` y `members: {userId, displayName}[]`, y muestra frases como "Esperanza le debe $400.00 a Gustavo" (monto positivo de un miembro = los demás le deben esa cantidad en total) o "Todo cuadrado" si el balance de todos es 0.

- [ ] **Step 5: Tabla de historial**

Crear `components/transactions-table.tsx` usando `<Table>` de shadcn/ui: columnas Fecha, Concepto, Categoría, Monto, Quién pagó, Reparto, y una columna de acciones con links "Editar" (a `/transactions/[id]/edit`) y el botón "Borrar" de Task 11.

- [ ] **Step 6: Verificación manual**

```bash
npm run dev
```

Con las transacciones ya creadas en Tasks 10-11, abrir `/` y confirmar que el balance mostrado coincide con un cálculo manual hecho aparte (sumar a mano lo que le tocaba a cada quien vs. lo que pagó cada quien).

Expected: el balance en pantalla es exacto.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/balance.test.ts components/balance-card.tsx components/transactions-table.tsx
git commit -m "feat: página principal con balance en vivo e historial de gastos"
```

---

## Task 13: Editar el porcentaje de reparto regular del hogar

**Files:**
- Modify: `app/settings/page.tsx`
- Create: `app/settings/split-actions.ts`

**Interfaces:**
- Consumes: tabla `household_members` (Task 3)
- Produces: `updateSplitPercentage` — historia 14 del backlog

- [ ] **Step 1: Server Action**

Crear `app/settings/split-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  householdId: z.string().uuid(),
  newPercentage: z.coerce.number().min(0).max(100),
});

export async function updateSplitPercentage(prevState: { error: string | null }, formData: FormData) {
  const parsed = schema.safeParse({
    householdId: formData.get("householdId"),
    newPercentage: formData.get("newPercentage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, default_split_percentage")
    .eq("household_id", parsed.data.householdId);

  const others = (members ?? []).filter((m) => m.user_id !== userData.user?.id);
  const othersSum = others.reduce((sum, m) => sum + Number(m.default_split_percentage), 0);

  if (Math.round((parsed.data.newPercentage + othersSum) * 100) / 100 !== 100) {
    return { error: `La suma debe dar 100%. Con este cambio daría ${parsed.data.newPercentage + othersSum}%` };
  }

  const { error } = await supabase
    .from("household_members")
    .update({ default_split_percentage: parsed.data.newPercentage })
    .eq("household_id", parsed.data.householdId)
    .eq("user_id", userData.user!.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { error: null };
}
```

- [ ] **Step 2: Agregar el formulario a `app/settings/page.tsx`**

Agregar una sección "Reparto de gastos regulares" con un `<Input type="number">` prellenado con el `default_split_percentage` actual del usuario y un botón "Guardar", conectados a `updateSplitPercentage` vía `useActionState`.

- [ ] **Step 3: Verificación manual**

Cambiar el porcentaje de 60 a 70 desde `/settings`, confirmar que el otro miembro sigue en 40 (la suma ahora daría 110% — el sistema debe rechazarlo con el mensaje de error). Ajustarlo a 60 de nuevo (suma 100%, debe aceptarse).

Expected: el sistema bloquea cualquier cambio que no sume 100% considerando al otro miembro.

- [ ] **Step 4: Commit**

```bash
git add app/settings
git commit -m "feat: editar el porcentaje de reparto regular del hogar, con revalidación de suma 100%"
```

---

## Task 14: Prueba E2E con Playwright

**Files:**
- Create: `tests/e2e/core-flow.spec.ts`

**Interfaces:**
- Consumes: la app completa corriendo en `localhost:3000` (Tasks 7-12)
- Produces: prueba automatizada del flujo crítico end-to-end

- [ ] **Step 1: Escribir la prueba E2E**

Crear `tests/e2e/core-flow.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("flujo completo: registro, hogar, gasto, balance, edición", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "TestPassword123!";

  await page.goto("/signup");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Nombre del hogar").fill("Hogar de prueba E2E");
  await page.getByLabel(/porcentaje/i).fill("60");
  await page.getByRole("button", { name: "Crear hogar" }).click();

  await expect(page).toHaveURL("/");

  await page.goto("/transactions/new");
  await page.getByLabel("Monto").fill("250");
  await page.getByLabel("Concepto").fill("Súper de prueba E2E");
  await page.getByRole("button", { name: /guardar|registrar/i }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Súper de prueba E2E")).toBeVisible();
  await expect(page.getByText(/le debe|todo cuadrado/i)).toBeVisible();

  await page.getByRole("link", { name: /editar/i }).first().click();
  await page.getByLabel("Monto").fill("300");
  await page.getByRole("button", { name: /guardar|actualizar/i }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("300")).toBeVisible();
});
```

- [ ] **Step 2: Correr la prueba**

```bash
npm run test:e2e
```

Expected: PASS. Si algún selector (`getByLabel`, `getByRole`) no coincide con el texto real de la UI construida en Tasks 7-13, ajustar el selector o el `name`/`aria-label` del componente correspondiente — no relajar la aserción.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/core-flow.spec.ts
git commit -m "test: E2E del flujo crítico completo (registro, hogar, gasto, balance, edición)"
```

---

## Task 15: Despliegue a Vercel y verificación final de Definition of Done

**Files:**
- Create: `docs/fases/2026-mini-proyecto-1-reporte.md`
- Modify: `PROYECTO.md`

**Interfaces:**
- Consumes: toda la app de Tasks 1-14
- Produces: URL de producción real; reporte de fase que cierra el Mini-proyecto 1

- [ ] **Step 1: Conectar el repo a Vercel**

En https://vercel.com, "Add New Project" → importar el repo `gastos-pareja` (requiere subirlo a GitHub primero si aún no está — confirmar con el usuario antes de hacer push a un remoto, según lo dejado pendiente en `PROYECTO.md`).

- [ ] **Step 2: Configurar variables de entorno en Vercel**

En el proyecto de Vercel → Settings → Environment Variables, agregar: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (con la URL de producción que asigna Vercel).

- [ ] **Step 3: Configurar la URL de redirect de Supabase Auth**

En el dashboard de Supabase → Authentication → URL Configuration, agregar la URL de producción de Vercel a "Site URL" y a "Redirect URLs" (necesario para que `resetPasswordForEmail` funcione en producción).

- [ ] **Step 4: Desplegar**

```bash
git push  # o el flujo de deploy automático de Vercel al conectar el repo
```

- [ ] **Step 5: Verificar la URL real**

```bash
curl -I https://<tu-proyecto>.vercel.app
```

Expected: `HTTP/2 200` (o redirect a `/login`/`/onboarding` si la ruta raíz protege por sesión).

Abrir la URL en el navegador del celular de Gustavo y de Esperanza (no solo en devtools de escritorio) y repetir manualmente el flujo de Task 14 (registro, crear/unirse a hogar, registrar gasto, ver balance) una vez cada uno, de forma independiente.

- [ ] **Step 6: Recorrer el checklist completo de `docs/pm/04-definition-of-done.md`**

Marcar cada casilla del checklist (también reflejado en la database de Notion) conforme se confirma. Cualquier punto que no se pueda marcar en verde debe convertirse en un pendiente explícito en el reporte de fase, no ignorarse.

- [ ] **Step 7: Escribir el reporte de fase**

Crear `docs/fases/2026-mini-proyecto-1-reporte.md` con: qué se construyó, qué decisiones se tomaron durante la implementación que difirieron de la spec (si las hubo, y por qué), resultado del checklist de DoD, y qué queda pendiente para el Mini-proyecto 2.

- [ ] **Step 8: Actualizar `PROYECTO.md`**

Marcar el Mini-proyecto 1 como completo en la tabla de la hoja de ruta, actualizar "Estado actual" con la URL de producción, y agregar el siguiente paso (Mini-proyecto 2).

- [ ] **Step 9: Commit final**

```bash
git add docs/fases PROYECTO.md
git commit -m "docs: reporte de fase del Mini-proyecto 1 y cierre de Definition of Done"
```

---

## Self-Review

**Cobertura de la spec:** las 18 historias del backlog quedan cubiertas — 1-2 (Task 7), 3 (Task 8), 4-5 (Task 9), 6 (Task 4/8), 7 (Task 10), 8 (Task 11), 9 (Task 12), 10 (Task 10 esquema), 11 (Task 9), 12 (Task 10 esquema), 13 (Task 5), 14 (Task 13), 15 (Task 12), 16 (Task 10), 17 (Task 7), 18 (Task 12, toast pendiente de UI final — cubierto por los componentes de shadcn/ui `sonner` instalados en Task 1, se agrega en Task 10/11 al confirmar éxito). Los 7 puntos del DoD tienen tarea que los cierra: dinero (Task 6), RLS (Task 5), flujos (Tasks 7-13), visual/responsive (verificación manual en cada task de UI), despliegue (Task 15), documentación (Task 15), validación con usuarios reales (Task 15).

**Consistencia de tipos:** `SplitTransaction`/`HouseholdMember`/`Balance` de Task 6 se usan sin cambios de forma en Tasks 10, 11 y 12. Los nombres de columnas de la base (Tasks 3-5) coinciden con los usados en los Server Actions (Tasks 7-13).

**Placeholders:** ninguno — cada step tiene código real, no descripciones de qué hacer.
