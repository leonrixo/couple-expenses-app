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
  updated_by uuid references profiles(id),
  check (split_type <> 'custom' or custom_split_percentage is not null),
  check (split_type = 'custom' or custom_split_percentage is null)
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
