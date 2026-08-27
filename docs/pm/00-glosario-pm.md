# Glosario de PM — Gastos en pareja

## ¿Qué es este documento y para qué sirve?

Un glosario de proyecto es un documento corto que define, en el lenguaje del
propio proyecto, los términos técnicos de gestión de producto/proyecto que se
usan en el resto de la documentación. No es un capítulo de libro de texto: sirve
para que cualquier persona que entre al proyecto (un stakeholder, un reclutador
que revisa el portafolio, o el propio Gustavo dentro de tres meses cuando ya se
le olvidó el detalle) pueda entender rápido de qué se está hablando sin tener
que buscar en Google "qué es un Definition of Done".

Se escribe una sola vez al inicio y se actualiza solo si aparece vocabulario
nuevo. Cada término aquí tiene un ejemplo tomado de este proyecto real, no una
definición genérica — esa es la diferencia entre un glosario útil y uno
decorativo.

---

### Project Charter
Documento fundacional que autoriza y define un proyecto: por qué existe, qué
incluye, qué no incluye, quién participa y cómo se mide el éxito. Es lo primero
que se escribe, antes de planear el trabajo día a día.
**En este proyecto:** [`01-project-charter.md`](01-project-charter.md) — define
que el objetivo es reemplazar el Excel de gastos por una app real Y dejar un
caso de estudio de PM presentable en portafolio.

### Roadmap
Plan de alto nivel que muestra en qué orden se van a entregar los grandes
bloques de trabajo de un proyecto (aquí, los "mini-proyectos"), y por qué en ese
orden. No detalla tareas día a día — eso es el backlog.
**En este proyecto:** [`02-roadmap.md`](02-roadmap.md) — Fundación → Núcleo →
Presupuestos/Dashboard → Deploy/PWA → (futuro) Notion/multi-hogar.

### Backlog
Lista priorizada de todo el trabajo pendiente dentro de un bloque del roadmap,
escrito como historias de usuario concretas. Es donde el roadmap se vuelve
trabajo ejecutable.
**En este proyecto:** [`03-backlog-mini-proyecto-1.md`](03-backlog-mini-proyecto-1.md)
— 18 historias priorizadas para construir auth, hogares, gastos y balance.

### Historia de usuario (User Story)
Forma de escribir un requerimiento desde la perspectiva de quien lo va a usar,
no desde la perspectiva técnica: "Como [rol], quiero [acción], para
[beneficio]". Obliga a explicar el "para qué" antes de construir el "qué".
**En este proyecto:** "Como miembro de un hogar, quiero ver el balance actual,
para saber si le debo dinero a mi pareja o ella a mí" — no "implementar endpoint
de balance".

### Criterios de aceptación
Lista concreta y verificable de condiciones que una historia de usuario debe
cumplir para considerarse resuelta. Son específicos de CADA historia (a
diferencia del Definition of Done, que aplica a todo el mini-proyecto).
**En este proyecto:** para la historia de registrar un gasto, un criterio de
aceptación es "si el monto es negativo o no numérico, la app muestra un error
claro y no guarda la transacción".

### Definition of Done (DoD)
Checklist único que aplica a TODO un mini-proyecto (no a una historia
individual) para decidir si de verdad está terminado: pruebas pasando,
desplegado, sin errores de consola, revisado en dispositivo real, etc. Se
escribe antes de empezar a construir, no al final.
**En este proyecto:** [`04-definition-of-done.md`](04-definition-of-done.md) —
incluye, por ejemplo, que el aislamiento de datos entre hogares (RLS) esté
probado y confirmado, no solo "debería funcionar".

### Stakeholder
Cualquier persona con interés legítimo en el resultado del proyecto, tenga o
no poder de decisión técnica. No todos los stakeholders son "el usuario".
**En este proyecto:** Esperanza es stakeholder y usuaria (su experiencia de uso
define si el proyecto tuvo éxito real), aunque no participa en decisiones
técnicas del stack.

### Sprint (y por qué aquí usamos "mini-proyecto")
Un sprint es un ciclo de trabajo de duración fija (típicamente 1-2 semanas) que
usan los equipos que siguen Scrum, con ceremonias fijas (planning, daily,
review, retro) pensadas para *equipos* recurrentes.
**Por qué aquí no aplica igual:** este proyecto lo ejecuta una sola persona
(Gustavo) apoyado por Claude Code, sin duración fija ni ceremonias de equipo —
lo que varía es el alcance de cada bloque (auth+gastos, luego
presupuestos+dashboard...), no el tiempo. Por eso se usa **"mini-proyecto"**:
un ciclo completo de diseño → spec → plan → implementación → reporte, con
alcance fijo y duración variable, en vez de duración fija y alcance variable.

### ADR (Architecture Decision Record)
Registro corto de una decisión técnica importante: qué se decidió, qué
alternativas se consideraron y por qué se descartaron. Sirve para que, meses
después, nadie tenga que adivinar "¿por qué elegimos esto?".
**En este proyecto:** la tabla "Decisiones ya tomadas" dentro de la spec de
Mini-proyecto 1 es, en esencia, un mini-ADR — por ejemplo, "Hosting: Vercel +
Supabase, se descartó autohospedado en TrueNAS".

### MVP (Minimum Viable Product / Producto Mínimo Viable)
La versión más pequeña de un producto que ya entrega valor real y permite
aprender de uso real, sin construir todo lo imaginable de una sola vez.
**En este proyecto:** el Mini-proyecto 1 completo (auth, hogares, gastos,
reparto, balance, sin presupuestos ni dashboard ni PWA) es el MVP — ya
reemplaza al Excel aunque le falten funciones que vienen después.

### Criterios de priorización (MoSCoW / P0-P1-P2)
Framework simple para decidir qué se construye primero cuando no se puede
construir todo a la vez: Must have (indispensable), Should have (importante
pero no bloquea), Could have (deseable, prescindible por ahora).
**En este proyecto:** ver [`03-backlog-mini-proyecto-1.md`](03-backlog-mini-proyecto-1.md)
— registrar un gasto es Must have; editar el porcentaje de reparto default es
Should have.

### Scope creep / Fuera de alcance
Scope creep es cuando un proyecto va agregando funciones "de paso" sin
decisión explícita, hasta que el alcance original se pierde. Se previene
escribiendo explícitamente qué NO incluye cada bloque de trabajo.
**En este proyecto:** el Mini-proyecto 1 declara explícitamente que fotos de
recibos, multi-moneda y notificaciones push quedan fuera — si en medio de la
implementación alguien "de paso" agrega fotos de recibos, eso es scope creep.

### Spec (documento de diseño técnico)
Documento que traduce una decisión de producto ya aprobada en un diseño técnico
concreto: modelo de datos, arquitectura, manejo de errores, testing. Se escribe
después de decidir el "qué" y antes de planear el "cómo, paso a paso".
**En este proyecto:** [`docs/superpowers/specs/2026-08-27-nucleo-app-mvp-design.md`](../superpowers/specs/2026-08-27-nucleo-app-mvp-design.md)
— ya aprobada, es la base de la que se deriva el backlog de este mini-proyecto.
