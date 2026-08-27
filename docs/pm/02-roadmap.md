# Roadmap — Gastos en pareja

## ¿Qué es este documento y para qué sirve?

Un roadmap es el plan de alto nivel de un proyecto: muestra en qué orden se
van a entregar los grandes bloques de trabajo y, sobre todo, **por qué en ese
orden**. No es una lista de tareas (eso es el backlog, ver
[`03-backlog-mini-proyecto-1.md`](03-backlog-mini-proyecto-1.md)) — es el nivel
de zoom que le sirve a un stakeholder o a un reclutador para entender la
estrategia de secuenciación sin tener que leer cada historia de usuario.

Un roadmap útil no solo dice "qué sigue", dice también **qué NO incluye** cada
bloque — eso es lo que evita que, a mitad de la implementación, alguien
empiece a agregar funciones "de paso" que no se decidieron (scope creep).

### Cómo se decidió el orden: dependencias y riesgo

Hay dos criterios que se usan típicamente para secuenciar bloques de trabajo,
y ambos aplican aquí:

1. **Dependencias técnicas:** no se puede construir un dashboard de
   presupuestos si todavía no existen transacciones ni categorías guardadas
   en la base de datos. Un bloque que otro necesita va antes.
2. **Riesgo:** conviene resolver primero la parte más incierta o más costosa
   de equivocarse, para descubrir problemas cuando todavía es barato
   corregirlos. Aquí, el modelo de datos, la seguridad por hogar (RLS) y la
   lógica de reparto de dinero son la parte de mayor riesgo del proyecto
   completo — por eso van en el Mini-proyecto 1, no al final.

---

## Tabla resumen

| # | Mini-proyecto | Entrega | Estado |
|---|---|---|---|
| 0 | Fundación | Repo, estructura de docs, tablero de PM en Notion | En curso |
| 1 | Núcleo de la app | Auth, hogares, invitación, gastos, reparto, balance, deploy básico | Spec aprobada, plan pendiente |
| 2 | Presupuestos y Dashboard | Presupuesto mensual por categoría, dashboard visual | No iniciado |
| 3 | Deploy y pulido móvil (PWA) | Instalación como PWA, pulido final de UI móvil | No iniciado |
| 4 (futuro) | Notion API / multi-hogar real | Integración de datos con Notion, soporte multi-hogar validado | No iniciado, sin fecha |

---

## Mini-proyecto 0 — Fundación

**Entrega:** carpeta y repo git del proyecto, estructura de `docs/`
(`superpowers/specs`, `fases`, `pm`), y un tablero de PM en Notion para
rastrear el trabajo fuera de la propia app.

**Por qué va primero:** no depende de nada — es el mínimo necesario para que
exista un lugar donde documentar y rastrear todo lo demás. Es, en sí mismo,
de riesgo casi nulo (no hay decisiones técnicas complejas), lo cual lo hace
el punto de partida natural.

**Qué NO incluye:** ninguna línea de código de la app en sí (ni backend ni
frontend). Tampoco incluye decidir la arquitectura técnica — eso es parte del
diseño del Mini-proyecto 1.

---

## Mini-proyecto 1 — Núcleo de la app

**Entrega:** autenticación, modelo de hogares con invitación, registro de
gastos con categoría y tipo de reparto, cálculo de balance en vivo, seed de
categorías por defecto, y un **despliegue básico funcional en Vercel**
(accesible por una URL real desde el primer entregable, no solo en
`localhost`) para que Gustavo y Esperanza puedan empezar a usarlo cuanto
antes en sus propios dispositivos.

**Por qué va justo después de Fundación:** es, de los cuatro bloques de
producto, el de mayor riesgo técnico — el modelo de datos, la seguridad por
hogar (Row Level Security) y la lógica de reparto de dinero se definen aquí y
todo lo demás se construye encima. Resolverlo primero significa que, si algo
del diseño está mal, se descubre y se corrige antes de construir presupuestos
o un dashboard sobre una base equivocada. Además, es el bloque que por sí
solo ya reemplaza el Excel (es el MVP) — entregar valor real lo antes posible
también es una razón de negocio, no solo técnica.

**Qué NO incluye:**
- Presupuestos por categoría ni ningún dashboard visual (Mini-proyecto 2).
- El manifest/service worker de PWA ni el pulido final de experiencia móvil
  (Mini-proyecto 3) — el despliegue básico en Vercel sí ocurre aquí, pero
  "instalable en pantalla de inicio como app" es trabajo del Mini-proyecto 3.
- Integración de datos con Notion ni soporte real para más de un hogar
  (Mini-proyecto 4).
- Notificaciones push/email, fotos de recibos, multi-moneda, sincronización
  offline real — fuera de alcance del proyecto salvo pedido explícito futuro.

> Nota de secuenciación: en la spec técnica, "desplegado en Vercel" aparece
> descrito dentro de la arquitectura general, mientras que el título del
> Mini-proyecto 3 es "Deploy y pulido móvil (PWA)". Este roadmap interpreta
> que el **primer despliegue funcional** (URL real, sin PWA) ocurre dentro del
> Mini-proyecto 1 — porque forma parte de su Definition of Done — y que el
> Mini-proyecto 3 se enfoca específicamente en la instalabilidad como PWA y el
> pulido móvil final, no en el primer deploy. Vale la pena confirmarlo
> explícitamente con el usuario (ver resumen de dudas al final de esta
> tanda de documentos).

---

## Mini-proyecto 2 — Presupuestos y Dashboard

**Entrega:** presupuesto mensual configurable por categoría
(`categories.monthly_budget`, ya contemplado en el modelo de datos del
Mini-proyecto 1) y un dashboard visual que compare gasto real vs. presupuesto,
con tendencias a lo largo del tiempo.

**Por qué va después del Núcleo:** depende directamente de que ya existan
transacciones y categorías reales guardadas — construir un dashboard antes de
tener datos que graficar no aporta nada verificable. También depende de que
el cálculo de balance del Mini-proyecto 1 ya sea confiable, porque el
dashboard se apoya en las mismas transacciones.

**Qué NO incluye:** cambios al modelo de autenticación, hogares o invitación
(eso ya quedó resuelto en el Mini-proyecto 1). Tampoco incluye trabajo de PWA
ni pulido móvil — eso sigue siendo del Mini-proyecto 3.

---

## Mini-proyecto 3 — Deploy y pulido móvil (PWA)

**Entrega:** manifest y service worker para poder instalar la app en la
pantalla de inicio del celular, más una revisión final de UI/UX específica
para móvil (tamaños de toque, navegación, rendimiento percibido).

**Por qué va al final (de los bloques comprometidos):** pulir la experiencia
móvil de funciones que todavía podrían cambiar (porque el Mini-proyecto 2
todavía no se ha construido) sería trabajo que se puede desperdiciar o
rehacer. Conviene pulir cuando el conjunto de funciones del producto ya está
estable.

**Qué NO incluye:** ninguna función de producto nueva — es explícitamente un
mini-proyecto de calidad/experiencia, no de alcance.

---

## Mini-proyecto 4 (futuro) — Notion API / multi-hogar real

**Entrega:** integración de datos entre la app y Notion (más allá del uso de
Notion como tablero de PM), y soporte validado para más de un hogar o más de
dos miembros por hogar.

**Por qué va al final y sin fecha comprometida:** es una expansión de alcance,
no una necesidad confirmada — depende de que el modelo básico (probado solo
para 1 hogar de 2 personas) demuestre funcionar bien en el uso real de la
pareja antes de invertir en generalizarlo. Se mantiene explícitamente "sin
fecha" para que no compita por prioridad con los mini-proyectos que sí están
comprometidos.

**Qué NO incluye (todavía):** ningún compromiso de entrega. Este bloque existe
en el roadmap para dejar constancia de que la idea se consideró y se decidió
posponer conscientemente, no que se olvidó.
