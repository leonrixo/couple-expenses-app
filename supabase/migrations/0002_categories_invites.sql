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
