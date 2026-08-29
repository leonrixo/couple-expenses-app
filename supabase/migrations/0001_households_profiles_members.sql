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
set search_path = public
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
