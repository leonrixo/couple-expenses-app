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
| 0 | Fundación (carpeta, repo, docs, tablero de Notion como PM) | En curso — repo creado 2026-08-27; documentación de PM y ADRs listas; esperando token de Notion del usuario |
| 1 | Núcleo de la app (auth, hogares, gastos, reparto, balance) | Diseño aprobado, spec escrita en [docs/superpowers/specs/2026-08-27-nucleo-app-mvp-design.md](docs/superpowers/specs/2026-08-27-nucleo-app-mvp-design.md), backlog en [docs/pm/03-backlog-mini-proyecto-1.md](docs/pm/03-backlog-mini-proyecto-1.md) — falta resolver 2 preguntas abiertas del backlog y luego el plan de implementación |
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

2026-08-27 — Brainstorming del Mini-proyecto 1 completado y aprobado por el usuario.
Repo git local creado (2 commits: spec técnica; documentación de PM + ADRs).
Documentación de PM (`docs/pm/`) y ADRs (`docs/adr/`) generadas por agentes delegados
(product-manager, architecture-documenter). El agente de PM detectó 4 vacíos en la
spec al construir el backlog — 2 resueltos directamente (ver Decisiones clave), 2
pendientes de que el usuario decida (ver Pendientes). Notion: usuario pidió conectarlo
ya; esperando que cree la integración interna y comparta el token + link de página.

## Decisiones clave ya tomadas (continuación — resueltas 2026-08-27 tras el backlog)

- El `default_split_percentage` del owner se fija al crear el hogar (no se pospone
  hasta que se una el segundo miembro); el complemento a 100% se asume para el otro
  miembro, consistente con el modelo de "hogar de 2 personas" del ADR 0003.
- El Mini-proyecto 1 SÍ termina con un despliegue real y accesible por URL (no solo
  local) — es parte de su Definition of Done. El Mini-proyecto 3 es únicamente
  pulido PWA/instalable sobre esa base ya desplegada, no un primer despliegue.

## Pendientes / preguntas abiertas

- **[ABIERTA] Editar/borrar un gasto ya capturado**: no estaba en la spec original.
  El agente de PM no lo incluyó en el backlog del Mini-proyecto 1 por no haber
  decisión de producto tomada, pero señala que es un caso de uso obvio (errores de
  captura). Falta que el usuario decida si entra al alcance del Mini-proyecto 1 o se
  pospone a propósito a un mini-proyecto posterior.
- **[ABIERTA] Método de autenticación principal**: la spec deja email/password y
  magic link como alternativas sin decidir cuál es el flujo primario. Falta fijarlo
  antes del plan de implementación.
- **Notion**: esperando token de integración interna + link de página del usuario.
  No bloquea el resto del Mini-proyecto 1.
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
- [ ] Usuario resuelve las 2 preguntas abiertas del backlog
- [ ] Plan de implementación (skill `writing-plans`)
- [ ] Implementación del Mini-proyecto 1 (subagentes)
- [ ] Reporte de fase del Mini-proyecto 1
- [ ] Definir acceso a Notion y montar tablero de PM
