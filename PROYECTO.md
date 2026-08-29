# Gastos en pareja — app web

## Resumen rápido (TL;DR)

**Qué es:** App web (Next.js + Supabase) para que Gustavo (Rizo) y Esperanza
registren gastos del hogar con reparto automático (60/40 regular, 50/50 en
compras grandes) y balance vivo de quién le debe a quién. Reemplaza el Excel
manual analizado el 2026-08-27. También es caso de estudio de PM para el
portafolio de Gustavo (ver [conseguir-jale](../conseguir-jale/PROYECTO.md)).

**🚨 BLOQUEO CRÍTICO DE PRODUCCIÓN (2026-08-29):** ahora mismo **nadie puede
crear un hogar en la app real** — cualquier usuario autenticado, verificado
de 3 formas independientes, recibe "new row violates row-level security
policy for table households" al insertar, aunque el JWT es válido y la
política (`auth.uid() is not null`) debería dejarlo pasar. **Ya se probó
reiniciar el proyecto desde el dashboard (2026-08-29) y NO lo arregló**
(re-verificado en vivo justo después del restart, mismo error exacto).
Hipótesis aún sin confirmar: desfase de JWT signing keys tras adoptar el
sistema nuevo de API keys de Supabase (`sb_publishable_...`) — el siguiente
paso es revisar directamente Project Settings → API → JWT Keys/Signing Keys
en el dashboard (no hecho todavía). **Esto es más urgente que terminar
Task 14 o que cualquier otra cosa en este proyecto** — ver el ledger (`.worktrees/mvp-nucleo/.superpowers/sdd/2026-08-27-nucleo-app-mvp-plan/progress.md`,
sección "Task 14 resume (2026-08-29)") para la evidencia completa y qué
revisar en el dashboard (Settings → API Keys / JWT Signing Keys).

**Estado al 2026-08-29 (sesión 2):** Mini-proyecto 1 (núcleo) en 13/15 tasks
completos. Task 14 (E2E Playwright) sigue bloqueada, ya no por el correo (eso
se resolvió con Resend) sino por el bug crítico de RLS/JWT de abajo.
**Auditoría de seguridad completa**, hallazgo **Crítico C1 ya cerrado**
(commit `cb7a7cb`, pusheado): políticas de UPDATE en
`household_members`/`transactions` ahora tienen `WITH CHECK` + triggers de
inmutabilidad (`household_id`/`user_id`/`role`), verificado en vivo con 4
tests nuevos de ataque real + 42/42 suite completa + build limpio. Quedan 3
Importantes y 4 Menores del reporte de auditoría, ver
`docs/seguridad/2026-08-29-auditoria-seguridad.md`. Repo ya subido a GitHub
como privado: `couple-expenses-app`
(https://github.com/leonrixo/couple-expenses-app).

**🚨 Sigue sin resolverse el bloqueo crítico de RLS/JWT de arriba** — es lo
único que falta para que Task 14 avance y para que la app sirva para alguien
real. Requiere acción del usuario en el dashboard, ver más abajo.

**Pendiente inmediato al retomar (en este orden):**
1. **Resolver el bloqueo crítico de RLS/JWT** (el de arriba) — reiniciar el
   proyecto NO lo arregló (ya probado); siguiente paso es revisar Project
   Settings → API → JWT Keys/Signing Keys en el dashboard de Supabase. Sin
   esto, la app no sirve para nadie en producción. **Solo el usuario puede
   hacer este paso** (requiere el dashboard de Supabase).
2. ~~Arreglar el hallazgo Crítico C1~~ — **hecho** (commit `cb7a7cb`).
3. Los hallazgos Importantes de la auditoría (I1 recuperar contraseña, I2
   throttling de invitación, I3 enumeración de correo).
4. Retomar y terminar Task 14 (E2E) una vez resuelto el punto 1.
5. Antes de hacer público el repo: arreglar M1 (correo real hardcodeado en
   el test E2E).
6. Task 15: despliegue a Vercel + reporte de fase que cierra el Mini-proyecto 1.

---

## Objetivo

Sustituir el flujo manual en Excel por una app real que ambos usen día a día, y al
mismo tiempo dejar un caso de estudio de gestión de producto/PM completo y
presentable en portafolio: fases explicadas, decisiones documentadas, reportes por
fase.

## Hoja de ruta (mini-proyectos)

| # | Mini-proyecto | Estado |
|---|---|---|
| 0 | Fundación (carpeta, repo, docs, tablero de Notion como PM) | Prácticamente completa — repo, docs de PM, ADRs y tablero de Notion en vivo; falta solo decidir si se sube el repo a GitHub |
| 1 | Núcleo de la app (auth, hogares, gastos, reparto, balance) | **12 de 15 tasks completos** (implementación vía subagentes en `.worktrees/mvp-nucleo`) — ver "Estado actual" abajo |
| 2 | Presupuestos y Dashboard | No iniciado |
| 3 | Deploy y pulido móvil (PWA) | No iniciado |
| 4 (futuro) | Notion API / multi-hogar real | No iniciado, sin fecha |

## Decisiones clave ya tomadas

- Hosting: nube gratuita (Vercel + Supabase), no autohospedado.
- Alcance de usuarios: auth real con invitación por hogar, extensible a
  multi-hogar pero solo probado para 1 hogar de 2 personas por ahora.
- Stack: Next.js (App Router) + TypeScript + Supabase (Postgres + Auth + RLS) +
  Tailwind/shadcn + PWA.
- Notion: tablero de PM del proyecto (fuera de la app), no integración de datos.
- La app arranca sin datos históricos — el CSV/Excel del análisis se queda como
  archivo separado, no se migra.

Detalle completo de cada decisión y el porqué en la spec de Mini-proyecto 1.

## Estado actual

2026-08-28 — Implementación del Mini-proyecto 1 en curso vía Subagent-Driven
Development, en el worktree `.worktrees/mvp-nucleo` (branch `mvp-nucleo`), **no**
en `master`. **12 de 15 tasks completos y revisados limpio** (commits
`2aa0492`..`20b4123`): scaffolding, clientes de Supabase, todo el esquema de
base de datos con RLS (incluida la prueba de aislamiento entre dos hogares
reales — historia de más riesgo del proyecto), el módulo de cálculo de reparto
y balance (con un bug de redondeo real encontrado y corregido en revisión),
autenticación completa, creación de hogar, invitaciones, registrar/editar/
borrar un gasto, y la página principal con balance en vivo e historial de
gastos (Task 12, retomada esta sesión desde trabajo sin commitear de la sesión
anterior — verificado contra el esquema real antes de comitear).

De paso, esta sesión también investigó una falla intermitente en la prueba de
aislamiento entre hogares (RLS) — se confirmó que fue un arranque en frío del
proyecto gratuito de Supabase, no una regresión real; no requirió cambios de
código.

**2026-08-29 — continuación de la misma sesión:** Task 13 (editar % de
reparto regular del hogar) completa y revisada limpio (commit `e5e8069`).
Task 14 (prueba E2E con Playwright) se topó con un bloqueo real de
infraestructura: el proyecto de Supabase tenía agotada su cuota de envío de
correos (servicio de email integrado, pensado solo para desarrollo) — bloqueaba
`signUp()` de forma atómica. Se resolvió configurando SMTP propio vía Resend
(cuenta gratuita, verificada en vivo antes de configurarla en Supabase), lo
cual además resuelve el mismo límite para producción real (recuperar
contraseña, confirmar cuenta de Esperanza). Con eso resuelto, Task 14 se
re-despachó para terminar con un PASS genuino — **su resultado final está
pendiente de confirmar** al momento de escribir esto (revisar el ledger).

Durante el intento de Task 14 se descubrió (con evidencia empírica, no solo
lectura de código) un bug real de UX: guardar o editar un gasto no daba
ninguna confirmación ni regresaba a la pantalla principal. Se decidió
arreglarlo de inmediato (fuera del plan original de 15 tasks) — commit
`b5d1d81`, revisado limpio.

También se despachó un `security-auditor` (solo lectura, sin editar código)
para revisar RLS, Server Actions, autenticación y manejo de secretos antes de
subir el repo a GitHub — reporte en `docs/seguridad/2026-08-29-auditoria-seguridad.md`
(revisar su veredicto antes de asumir que es seguro hacer el repo público).

Quedan: confirmar Task 14, revisar la auditoría de seguridad, subir el repo a
GitHub (privado, nombre `couple-expenses-app`), y Task 15 (despliegue a
Vercel + verificación final de Definition of Done).

**Notion: tablero de PM ya montado y en vivo.** Página raíz:
https://app.notion.com/p/Gastos-en-pareja-PM-3c9534bc10b480cf8cf9e64c5917b7e1 —
contiene charter resumido, base de datos Roadmap (5 mini-proyectos), base de
datos Backlog Mini-proyecto 1 (18 historias con Prioridad/Estado editables),
glosario, checklist de Definition of Done con casillas reales, y resumen de
ADRs. Construido por API (token en `.env.local`, git-ignored) tras compartir la
página desde la UI de Notion. La fuente de verdad técnica sigue siendo el repo
git — Notion es la vista de seguimiento para el usuario como PM.

## Decisiones clave ya tomadas (continuación — resueltas 2026-08-27 tras el backlog)

- El `default_split_percentage` del owner se fija al crear el hogar (no se pospone
  hasta que se una el segundo miembro); el complemento a 100% se asume para el otro
  miembro, consistente con el modelo de "hogar de 2 personas" del ADR 0003.
- El Mini-proyecto 1 SÍ termina con un despliegue real y accesible por URL (no solo
  local) — es parte de su Definition of Done. El Mini-proyecto 3 es únicamente
  pulido PWA/instalable sobre esa base ya desplegada, no un primer despliegue.
- Login principal: email + contraseña con recuperación por correo (no magic link).
- Editar/borrar un gasto ya capturado entra al alcance del Mini-proyecto 1
  (historia 8 del backlog), con `updated_at`/`updated_by` como rastro de auditoría
  y borrado definitivo (sin papelera) para el MVP.

## Pendientes / preguntas abiertas

- **Repo remoto**: el usuario confirmó explícitamente (2026-08-29) subirlo a
  GitHub como repo **privado** con el nombre `couple-expenses-app` — se hace
  privado primero (no público) hasta confirmar que la auditoría de seguridad
  en curso no encontró nada peligroso de publicar. Ver "Estado actual".
- **Continuidad de sesión**: no hay forma de leer el % exacto de uso de la ventana de
  5 horas de la cuenta del usuario; la mitigación es mantener este archivo y la spec
  actualizados para poder retomar sin perder contexto.

## Próximos pasos

- [x] Brainstorming y diseño del Mini-proyecto 1
- [x] Escribir spec del Mini-proyecto 1
- [x] Documentación de PM (charter, roadmap, backlog, DoD) y ADRs
- [x] Resolver las 3 preguntas abiertas del backlog
- [x] Plan de implementación (skill `writing-plans`) — [docs/superpowers/plans/2026-08-27-nucleo-app-mvp-plan.md](docs/superpowers/plans/2026-08-27-nucleo-app-mvp-plan.md), 15 tasks
- [x] El usuario creó el proyecto en supabase.com antes del Task 2 (URL + anon key + service role key + DATABASE_URL, todo en `.env.local` git-ignored)
- [ ] Implementación del Mini-proyecto 1 (subagentes) — **11/15 tasks, en curso**, ver "Estado actual"
- [ ] Reporte de fase del Mini-proyecto 1
- [x] Compartir una página de Notion con la integración y montar el tablero de PM
