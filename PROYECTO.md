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
| 0 | Fundación (carpeta, repo, docs, tablero de Notion como PM) | En curso — repo creado 2026-08-27; falta definir acceso a Notion |
| 1 | Núcleo de la app (auth, hogares, gastos, reparto, balance) | Diseño aprobado, spec escrita en [docs/superpowers/specs/2026-08-27-nucleo-app-mvp-design.md](docs/superpowers/specs/2026-08-27-nucleo-app-mvp-design.md) — falta plan de implementación |
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
Repo git local creado. Spec escrita y auto-revisada. Pendiente: que el usuario revise
la spec, luego generar el plan de implementación (skill `writing-plans`) antes de
escribir cualquier código de la app.

## Pendientes / preguntas abiertas

- **Notion**: falta decidir cómo conectar (¿el usuario crea una integración interna
  de Notion y comparte el token, o se arma la estructura del tablero y él la crea a
  mano?). No bloquea el Mini-proyecto 1.
- **Repo remoto**: se creó el repo local únicamente. Falta preguntar si se quiere
  subir a GitHub (recomendable para portafolio) — no se hace sin confirmación
  explícita.
- **Continuidad de sesión**: no hay forma de leer el % exacto de uso de la ventana de
  5 horas de la cuenta del usuario; la mitigación es mantener este archivo y la spec
  actualizados para poder retomar sin perder contexto.

## Próximos pasos

- [x] Brainstorming y diseño del Mini-proyecto 1
- [x] Escribir spec del Mini-proyecto 1
- [ ] Usuario revisa la spec
- [ ] Plan de implementación (skill `writing-plans`)
- [ ] Implementación del Mini-proyecto 1 (subagentes)
- [ ] Reporte de fase del Mini-proyecto 1
- [ ] Definir acceso a Notion y montar tablero de PM
