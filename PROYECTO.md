# Gastos en pareja — app web

**TL;DR:** App web para que Gustavo (Rizo) y Esperanza registren gastos del hogar
desde el celular o la PC, con reparto automático (60/40 en gastos regulares, 50/50 en
compras grandes/súbitas) y un balance vivo de quién le debe a quién. Reemplaza el
Excel manual que se analizó el 2026-08-27 (ver
`Documents\2 CASA Y TRAMITES\Informe financiero - gastos.xlsx`). Es también una pieza
de portafolio para el reposicionamiento de Gustavo hacia Project Manager (ver
[conseguir-jale](../conseguir-jale/PROYECTO.md)), por eso se documenta como un caso de
estudio de PM: cada mini-proyecto tiene su propio ciclo diseño → spec → plan →
implementación → reporte de fase.

## Objetivo

Sustituir el flujo manual en Excel por una app real que ambos usen día a día, y al
mismo tiempo dejar un caso de estudio de gestión de producto/PM completo y
presentable en portafolio: fases explicadas, decisiones documentadas, reportes por
fase.

## Hoja de ruta (mini-proyectos)

| # | Mini-proyecto | Estado |
|---|---|---|
| 0 | Fundación (carpeta, repo, docs, tablero de Notion como PM) | Prácticamente completa — repo, docs de PM, ADRs y tablero de Notion en vivo; falta solo decidir si se sube el repo a GitHub |
| 1 | Núcleo de la app (auth, hogares, gastos, reparto, balance) | **11 de 15 tasks completos** (implementación vía subagentes en `.worktrees/mvp-nucleo`) — Task 12 a medias, ver "Estado actual" abajo |
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
en `master`. **11 de 15 tasks completos y revisados limpio** (commits
`2aa0492`..`866bd3c`): scaffolding, clientes de Supabase, todo el esquema de
base de datos con RLS (incluida la prueba de aislamiento entre dos hogares
reales — historia de más riesgo del proyecto), el módulo de cálculo de reparto
y balance (con un bug de redondeo real encontrado y corregido en revisión),
autenticación completa, creación de hogar, invitaciones, y registrar/editar/
borrar un gasto.

**Task 12 (página principal con balance en vivo) quedó a medias** — sesión
pausada a propósito por el usuario (contexto de la conversación muy grande).
Hay archivos sin commitear en el worktree (`app/page.tsx` modificado,
`app/balance.test.ts`/`components/balance-card.tsx`/`components/transactions-table.tsx`
sin trackear) que no se descartaron. El ledger completo con el detalle exacto
de cómo retomarlo está en
`.worktrees/mvp-nucleo/.superpowers/sdd/2026-08-27-nucleo-app-mvp-plan/progress.md`
— léelo primero en la próxima sesión, tiene instrucciones precisas de si
conviene retomar ese trabajo sin commitear o descartarlo y redespachar Task 12
limpio.

Quedan las Tasks 12 (terminar) a 15 (editar % de reparto, prueba E2E con
Playwright, y despliegue a Vercel + verificación final de Definition of Done).

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

- **Repo remoto**: se creó el repo local únicamente. Falta preguntar si se quiere
  subir a GitHub (recomendable para portafolio) — no se hace sin confirmación
  explícita.
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
