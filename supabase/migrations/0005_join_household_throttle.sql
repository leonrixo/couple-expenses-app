-- Mitigación de I2 (auditoría de seguridad 2026-08-29): joinHousehold no
-- tenía ningún límite de intentos al canjear un código de invitación contra
-- household_invites. Es una Server Action de Next.js (no un endpoint de
-- Supabase Auth como signInWithPassword/OTP), así que no hereda el rate
-- limiting propio de Supabase Auth -- cualquier cuenta autenticada podía
-- probar códigos sin límite durante toda la ventana de validez de 7 días.
--
-- La entropía del código ya se subió de 32 a 64 bits en código
-- (randomBytes(8) en app/settings/invite-actions.ts), lo cual por sí solo ya
-- vuelve inviable la fuerza bruta sostenida en esa ventana. Esta tabla es la
-- mitigación complementaria en base de datos: un límite de intentos por
-- usuario autenticado con ventana deslizante, usando solo Postgres -- sin
-- agregar infraestructura externa tipo Redis/Upstash, que sería
-- sobre-ingeniería para una app de 2 usuarios reales.
--
-- Solo el cliente service_role la usa (el mismo que ya usa
-- join-household-actions.ts para bypassar RLS al leer household_invites
-- antes de que el usuario sea miembro) -- RLS se habilita sin políticas para
-- bloquear cualquier acceso directo desde anon/authenticated vía la API de
-- PostgREST.
create table household_invite_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

-- Soporta la consulta "cuántos intentos de este usuario en los últimos N
-- minutos" que hace joinHousehold en cada canje.
create index idx_household_invite_attempts_user_time
  on household_invite_attempts (user_id, attempted_at);

alter table household_invite_attempts enable row level security;
