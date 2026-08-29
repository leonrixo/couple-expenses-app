-- Fix C1 (auditoría de seguridad 2026-08-29): las políticas de UPDATE en
-- household_members y transactions no tenían WITH CHECK. Postgres reutiliza
-- USING como check sobre la fila NUEVA cuando no hay WITH CHECK explícito, lo
-- que permitía a cualquier miembro de un hogar reasignar la fila de
-- membresía de su pareja (household_id/role) sin su consentimiento, o
-- auto-promoverse a owner (afecta el cálculo de reparto en
-- lib/split-logic.ts). Ver docs/seguridad/2026-08-29-auditoria-seguridad.md.

drop policy "miembros editan el reparto dentro de su hogar" on household_members;

create policy "un usuario edita solo su propia fila de membresía"
  on household_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Aun con la política de arriba, un usuario podría seguir cambiando su
-- PROPIO household_id/user_id/role libremente. Estas columnas deben ser
-- inmutables para el rol authenticated (no hay ningún flujo de producto que
-- necesite mover una membresía entre hogares, y el rol se fija una sola vez
-- al crear el hogar o aceptar una invitación — nunca se reasigna después).
-- role se incluye explícitamente aquí porque es el vector de auto-promoción
-- a owner descrito en el hallazgo C1 (impacto #1) — el código de ejemplo del
-- reporte de auditoría solo mencionaba household_id/user_id, un hueco real
-- que el test de esta migración detectó.
create function public.prevent_membership_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.household_id <> old.household_id or new.user_id <> old.user_id or new.role <> old.role then
    raise exception 'household_id, user_id y role de household_members son inmutables';
  end if;
  return new;
end;
$$;

create trigger trg_membership_immutable
  before update on household_members
  for each row execute function public.prevent_membership_identity_change();

-- Mismo problema de fondo en transactions: nada impide reasignar household_id
-- en un UPDATE, lo que permitiría mover un gasto a otro hogar del que el
-- atacante también sea miembro, ocultándolo de su pareja. No hay flujo de
-- producto que necesite mover un gasto entre hogares.
create function public.prevent_transaction_household_change()
returns trigger
language plpgsql
as $$
begin
  if new.household_id <> old.household_id then
    raise exception 'household_id de transactions es inmutable';
  end if;
  return new;
end;
$$;

create trigger trg_transaction_household_immutable
  before update on transactions
  for each row execute function public.prevent_transaction_household_change();
