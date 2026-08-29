# Reporte de fase — Mini-proyecto 1: Núcleo de la app

**Fecha de cierre de implementación:** 2026-08-29
**Estado:** Desplegada en producción. Cierre formal pendiente de validación con
los usuarios reales (ver "Pendientes" al final) — este reporte documenta el
estado exacto en vez de declarar el mini-proyecto "hecho" sin esa validación,
siguiendo el propio Definition of Done del proyecto.

## Qué se construyó

App web (Next.js 16 App Router + TypeScript + Supabase Postgres/Auth/RLS +
Tailwind/shadcn) que reemplaza el Excel manual de gastos de Gustavo y
Esperanza. Cubre las 18 historias del backlog de Mini-proyecto 1 en 15 tasks
de implementación (plan `docs/superpowers/plans/2026-08-27-nucleo-app-mvp-plan.md`):

- Autenticación completa (registro, login, logout, recuperar contraseña por
  correo).
- Creación de hogar con siembra automática de categorías por defecto.
- Invitación a la pareja por código y unión a un hogar existente.
- Registrar, editar y borrar gastos, con reparto automático (`regular`
  60/40, `big` 50/50, `custom`) y rastro de auditoría (`updated_at`/`updated_by`).
- Balance en vivo de quién le debe a quién, con historial de gastos.
- Ajustar el % de reparto regular del hogar desde Ajustes.
- PWA básica y diseño responsive.

**URL de producción:** https://gastos-pareja-two.vercel.app (Vercel, branch
`master`, deploy automático conectado al repo de GitHub
`leonrixo/couple-expenses-app`, privado).

## Decisiones tomadas durante la implementación (no estaban en la spec original)

- **El id del hogar se genera en el cliente** (`crypto.randomUUID()`) en vez
  de dejarlo al default de la columna — necesario para cerrar el bloqueo
  crítico de producción descrito abajo, sin bypasear RLS.
- **SMTP propio vía Resend** para Supabase Auth (cuenta gratuita del
  usuario) — el servicio de correo integrado de Supabase, pensado solo para
  desarrollo, agotó su cuota y bloqueaba `signUp()` de forma atómica. Esto
  también resuelve el mismo límite para producción real (confirmar cuenta,
  recuperar contraseña).
- **Editar/borrar un gasto redirige a inicio con confirmación** — bug de UX
  real descubierto durante el intento de Task 14 (guardar no daba ninguna
  señal ni navegaba), corregido fuera del plan original a pedido del usuario
  (commit `b5d1d81`).
- **Auditoría de seguridad completa antes de hacer público el repo**
  (`docs/seguridad/2026-08-29-auditoria-seguridad.md`) — no estaba en el plan
  de 15 tasks, se agregó porque el repo se subió a GitHub durante esta fase.
- **`mvp-nucleo` se fusionó a `master` localmente** (en vez de PR) antes del
  deploy, una vez verificados tests y build sobre el resultado fusionado —
  `master` traía commits de documentación que `mvp-nucleo` no tenía.

## Incidente relevante para el caso de estudio: bloqueo crítico de producción

Vale la pena documentarlo en detalle porque es un ejemplo real de diagnóstico
bajo presión con una pista falsa costosa. Cualquier usuario autenticado real
recibía `42501` (violación de RLS) al intentar crear un hogar — nadie podía
completar el onboarding. La investigación inicial (rotación de JWT signing
keys, restarts del proyecto, análisis de 3 exports de logs reales de
Supabase, un ticket de soporte abierto con evidencia técnica completa) apuntó
durante horas a un incidente de plataforma real y confirmado de Supabase
("401 errors due to JWT rejections", abierto desde el 14 de agosto). Un
restart posterior al rollout del fix oficial de Supabase (27 de agosto) no
cambió el síntoma — la señal que finalmente descartó la hipótesis de
plataforma.

La causa real: `create-household-actions.ts` pedía la fila recién insertada
de vuelta (`.select()`/`RETURNING`) antes de que el usuario fuera miembro del
hogar; la política de SELECT de `households` rechazaba esa lectura con el
mismo código de error que una violación real de `WITH CHECK`, aunque el
INSERT en sí nunca falló. Presente desde la Task 8, nunca detectado porque
ningún test anterior ejercía ese flujo exacto con una sesión anónima real
(todos usaban `service-role`, que bypasea RLS). Un test dirigido, ejecutando
operaciones sueltas con la MISMA sesión autenticada contra distintas tablas,
lo aisló en minutos. **Lección aplicable a cualquier debugging futuro:**
antes de asumir que un síntoma "auth roto" es un problema de plataforma,
probar la misma sesión contra otras tablas/operaciones — si esas sí
funcionan, el problema está acotado al código propio.

## Definition of Done — estado real (`docs/pm/04-definition-of-done.md`)

### ✅ Verificado con evidencia
- Tests de `lib/split-logic.ts` (3 tipos de reparto, decimales, redondeo) —
  verde, incluidos en la suite de 46/46.
- Aislamiento RLS entre dos hogares reales — probado empíricamente
  (`tests/integration/rls-isolation.test.ts`), no solo revisado en el código
  de las políticas.
- Flujo de registro/login de principio a fin — Playwright, Task 14.
- Flujo E2E completo (login + registrar gasto + balance actualizado) — PASS
  genuino, commit `24080df`.
- Monto negativo, monto cero y monto no numérico rechazados — tests unitarios
  en `lib/validation/transaction.test.ts`.
- Código versionado en git con commits legibles, mergeado a `master`, build y
  tests verdes sobre el resultado fusionado.
- App desplegada en Vercel, accesible por URL real (no localhost), responde
  `307` a `/login` como se esperaba.

### ⏳ Pendiente — explícito, no ignorado
- **Balance de la app vs. cálculo manual, 3 casos distintos.** Requiere que
  un humano lo verifique contra su propia expectativa — no se puede
  automatizar de forma significativa. Pendiente de que Gustavo lo haga.
- **Flujo de invitación por código, probado por UI real, incluyendo los 3
  casos de error (código inválido, expirado, ya usado).** El código en
  `join-household-actions.ts` maneja los 3 casos (mensajes de error
  específicos por caso), pero **ningún test automatizado los ejerce hoy** —
  el E2E de Task 14 agrega a la pareja directo por `service-role` para
  esquivar la restricción de "balance solo con 2 miembros", así que nunca
  pasa por el formulario real de "Unirme con código". Es un gap de cobertura
  real, no solo un checkbox sin marcar — candidato natural para un test
  Playwright nuevo antes de considerar esto "hecho" de verdad.
- **Error de red al guardar un gasto** (mensaje claro, sin perder lo
  escrito, sin fallar en silencio) — sin test ni verificación manual
  registrada.
- **App probada en un celular real** (no solo devtools) — pendiente de
  Gustavo o Esperanza.
- **Sin errores de consola durante los flujos principales** — el test E2E no
  hace ninguna aserción sobre la consola del navegador; pendiente de
  verificación manual.
- **Gustavo y Esperanza probaron la app cada uno de forma independiente** y
  confirmaron que el balance coincide con lo esperado — no ha ocurrido
  todavía, es el pendiente de mayor peso para poder cerrar el mini-proyecto
  de verdad (es, literalmente, la validación con los usuarios reales).

### No bloqueantes para "estar en producción", pero abiertos
- M2, M3, M4 de la auditoría de seguridad (mejoras de robustez, ver
  `docs/seguridad/2026-08-29-auditoria-seguridad.md`).
- Responder/cerrar por cortesía el ticket de soporte a Supabase, aclarando
  que la causa fue un bug propio, no de su plataforma.

## Próximo paso recomendado

Con el deploy resuelto, lo que falta para cerrar el mini-proyecto ya no es
trabajo de ingeniería — es la sesión de validación con Gustavo y Esperanza
probando la app real en sus propios celulares, más (opcionalmente) cerrar el
gap de cobertura del flujo de invitación antes de esa sesión, para que
cualquier bug que aparezca en la validación con usuarios reales sea uno
genuinamente nuevo y no uno que un test ya habría atrapado.
