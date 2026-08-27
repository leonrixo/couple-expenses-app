# ADR 0003: Auth real con invitación, modelada por "hogares" extensibles

**Estado:** Aceptado (2026-08-27)

## Contexto

La app necesita identificar quién registra cada gasto (Gustavo o Esperanza) y
garantizar que sus datos no se mezclen con los de nadie más. Al ser una app que en
el MVP solo van a usar dos personas de una misma pareja, existía la tentación de
resolver esto de la forma más simple posible: dos cuentas fijas, predefinidas en el
código o en la base de datos, sin un flujo de registro/login real.

Restricciones relevantes:
- El MVP está pensado explícitamente para un solo hogar de 2 personas (ver spec,
  tabla "Decisiones ya tomadas": "Alcance de usuarios").
- El roadmap del proyecto contempla, como Mini-proyecto 4 futuro, soporte
  multi-hogar real (potencialmente con más parejas o núcleos familiares usando la
  misma app) — sin fecha comprometida, pero es una dirección plausible.
- El código y el modelo de datos se están construyendo ahora; cambiar el modelo de
  autenticación y aislamiento de datos más adelante (de cuentas fijas a auth real,
  o de una sola "cuenta" a un modelo con tabla de hogares) es una migración mucho
  más cara que diseñarlo bien desde el inicio, incluso si de momento solo se prueba
  con un hogar.

## Decisión

Implementar autenticación real con Supabase Auth (email/password o magic link) y
un flujo de invitación por código/link, modelando los datos alrededor de la entidad
`households` (hogar) desde el inicio — extensible a múltiples hogares — pero
probando y validando el MVP únicamente con un hogar de 2 personas. Se descarta tanto
usar cuentas fijas hardcodeadas como construir de una vez un sistema multi-tenant
completo tipo SaaS.

## Alternativas consideradas

- **Cuentas fijas hardcodeadas** (por ejemplo, dos usuarios "Gustavo" y "Esperanza"
  predefinidos, sin registro ni login real, quizás protegidos con una sola
  contraseña compartida o ni eso). Se descartó porque no hay auth real ni
  aislamiento de datos verdadero — cualquiera con la URL podría ver o modificar los
  gastos. Tampoco es una base reusable: si el proyecto avanza al Mini-proyecto 4
  (multi-hogar), habría que reconstruir el modelo de identidad desde cero, migrando
  datos ya en producción. Y como pieza de portafolio, "cuentas hardcodeadas" no
  demuestra ninguna decisión de diseño de auth real.
- **Multi-tenant completo tipo SaaS** (con roles y permisos granulares, límites de
  hogares por plan, panel de administración de tenants, facturación, etc.). Se
  descartó por sobre-ingeniería: nada de eso tiene usuarios reales que lo necesiten
  hoy — es una sola pareja. Construirlo ahora habría consumido tiempo del MVP en
  funcionalidad que no se valida ni se usa, retrasando la entrega de la parte que sí
  importa (registrar gastos y ver el balance).

## Consecuencias

**Positivas:**
- El modelo de datos (`households`, `household_members`, `household_invites`) ya
  soporta conceptualmente que un usuario pertenezca a un hogar y que un hogar tenga
  más de un miembro, sin necesitar un rediseño de esquema si en el futuro se abre a
  más hogares o más de 2 miembros por hogar.
- RLS en Supabase aísla los datos por `household_id` a nivel de base de datos desde
  el día uno, aunque solo exista un hogar en producción — la garantía de seguridad
  no depende de que se agregue "después, cuando haya más hogares".
- El flujo de invitación (código/link generado por el `owner`) es el mecanismo real
  que se necesitaría de todas formas para que Esperanza se una al hogar de Gustavo,
  así que no es trabajo extra "por si acaso": es trabajo necesario para el caso de
  uso actual.

**Trade-offs aceptados:**
- El modelo asume explícitamente hogares de 2 miembros para el reparto (ver spec,
  sección "Validación de porcentajes": el reparto custom se define en función del
  miembro `owner`, y el resto se lleva el complemento). Soportar reparto
  personalizado por persona en hogares de 3+ miembros queda fuera de alcance y
  requeriría trabajo adicional si el Mini-proyecto 4 llega a implementarse.
- Al no probarse con más de un hogar real, es posible que aparezcan casos de borde
  no anticipados cuando efectivamente se abra a multi-hogar (por ejemplo, en
  permisos entre hogares, o en la unicidad de códigos de invitación a mayor escala)
  — riesgo aceptado y diferido explícitamente al Mini-proyecto 4.
- Se paga el costo de construir un flujo de auth e invitación real (más código y más
  superficie de prueba) en vez de la ruta más rápida de cuentas fijas, a cambio de
  una base correcta desde el inicio.
