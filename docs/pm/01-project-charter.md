# Project Charter — Gastos en pareja

## ¿Qué es este documento y para qué sirve?

El Project Charter es el documento fundacional de un proyecto: el que
"autoriza" que el proyecto exista y le da un objetivo, un alcance y unos
límites claros antes de que se planee ninguna tarea. En el mundo real, un PM lo
escribe (o lo negocia con quien patrocina el proyecto) al principio, y lo usa
después como referencia cada vez que alguien propone agregar algo — la
pregunta siempre es "¿esto está dentro de lo que el charter dice que vamos a
hacer?". Si la respuesta es no, no se agrega sin decidirlo explícitamente (ver
el término *scope creep* en el glosario).

Aquí cumple ese mismo rol, con la particularidad de que Gustavo es a la vez el
PM, el usuario principal y quien autoriza el proyecto — un caso poco común en
un trabajo formal, pero perfectamente normal en un proyecto personal usado
como pieza de portafolio.

---

## Resumen ejecutivo

Gustavo y Esperanza son pareja y comparten gastos del hogar. Hoy llevan ese
registro en un Excel manual, con reparto 60/40 en gastos regulares y 50/50 en
compras grandes. Este proyecto construye una app web que reemplaza ese Excel:
ambos registran gastos desde el celular o la PC, el reparto se calcula
automático y el balance de quién le debe a quién está siempre disponible sin
tener que sumar nada a mano. En paralelo, el proyecto se documenta como un
caso de estudio de gestión de producto completo, para el reposicionamiento
profesional de Gustavo hacia Project Manager.

## El problema

El Excel actual (`Informe financiero - gastos.xlsx`, analizado el 2026-08-27)
ya tiene más de 2,000 transacciones categorizadas a mano — la pareja sí lleva
un registro disciplinado. El problema no es falta de disciplina, es la
fricción del proceso manual:

- Hay que abrir un archivo de escritorio para anotar un gasto — poco práctico
  desde el celular, que es donde de verdad ocurre el gasto (en el súper, en la
  gasolinera).
- El reparto 60/40 o 50/50 se calcula a mano, lo cual es lento y propenso a
  error de captura.
- El balance de "quién le debe a quién" no está disponible al momento — hay
  que sumar columnas para saberlo, así que en la práctica se revisa poco
  seguido.
- No hay aislamiento de datos ni estructura pensada para crecer (por ejemplo,
  a un presupuesto por categoría) sin rehacer el archivo.

## Objetivo del proyecto

Sustituir por completo el flujo manual en Excel por una app web real que la
pareja use día a día para registrar gastos y consultar el balance, construida
y documentada con las mismas prácticas de gestión de producto que se usarían
en un proyecto profesional — de forma que el resultado sea, al mismo tiempo,
una herramienta que resuelve un problema real y un caso de estudio verificable
para el portafolio de PM de Gustavo.

## Alcance del proyecto completo

Lo que el proyecto completo (todos los mini-proyectos) sí incluye:

- Autenticación real de usuarios (registro/login) vía Supabase Auth.
- Modelo de "hogares" con invitación para que dos personas compartan datos.
- Registro de gastos con monto, concepto, categoría, quién pagó y tipo de
  reparto (regular 60/40, grande 50/50, o personalizado).
- Cálculo automático del balance de quién le debe a quién, en vivo.
- Presupuestos mensuales por categoría y un dashboard visual de gasto vs.
  presupuesto (Mini-proyecto 2).
- Instalación como PWA en el celular y pulido de la experiencia móvil
  (Mini-proyecto 3).
- Documentación completa del proceso (specs, roadmap, backlog, reportes de
  fase) como pieza de portafolio.

## Fuera de alcance explícito (todo el proyecto)

- Migrar o importar el historial del Excel actual — la app arranca sin datos
  históricos; el Excel se conserva como archivo aparte.
- Integración de datos con Notion (Notion se usa solo como tablero de PM del
  proyecto, fuera de la app).
- Soporte real para más de un hogar o más de dos miembros por hogar — el
  modelo de datos lo permite a futuro, pero no se prueba ni se garantiza en
  este proyecto salvo que se retome explícitamente en el Mini-proyecto 4.
- Notificaciones push o por correo, adjuntar fotos de recibos, soporte
  multi-moneda — quedan fuera salvo que el usuario lo pida explícitamente más
  adelante.
- Sincronización offline real (solo se garantiza un mensaje de error claro si
  no hay conexión, no guardar y sincronizar después).

## Stakeholders

| Persona | Rol en el proyecto | Interés / qué espera | Involucramiento |
|---|---|---|---|
| Gustavo ("Rizo") | Project Manager, usuario principal, dueño del proyecto | Que la app reemplace el Excel de verdad, y que el proceso documentado sirva como pieza de portafolio para su reposicionamiento a PM | Alto — toma todas las decisiones de producto y prioriza el backlog |
| Esperanza | Usuaria co-igual, stakeholder | Que registrar un gasto sea igual o más fácil que el Excel, y que el balance sea confiable | Medio — no participa en decisiones técnicas, pero su experiencia de uso real valida (o invalida) el éxito del proyecto |
| Claude Code (agentes) | Equipo de ejecución técnica | — | Alto en implementación — construye lo que el backlog prioriza, bajo la dirección de Gustavo como PM |

## Criterios de éxito medibles

- Ambos (Gustavo y Esperanza) registran al menos un gasto cada uno desde su
  celular sin ayuda ni fricción reportada, dentro de la primera semana de uso
  real después del despliegue del Mini-proyecto 1.
- El balance que calcula la app coincide con un cálculo manual de control al
  menos 3 veces seguidas (verificación de confianza en el número).
- Cero incidentes de un usuario viendo datos de un hogar que no es el suyo
  (aislamiento por RLS confirmado, no solo asumido).
- A las 2 semanas de uso real del Mini-proyecto 1, cero gastos nuevos
  anotados a mano en el Excel — la app lo reemplazó de facto, no solo en
  teoría.
- Al menos el Mini-proyecto 1 queda documentado end-to-end (diseño → spec →
  plan → implementación → reporte de fase) y es presentable como pieza de
  portafolio sin necesitar contexto adicional para entenderse.

## Restricciones

- **Presupuesto de hosting: $0.** Debe caber por completo en las capas
  gratuitas de Vercel y Supabase.
- **Debe funcionar bien en PC y en celular** (mobile-first), porque así es
  como de verdad se va a usar en el día a día.
- **Debe ser mantenible por Gustavo con ayuda de Claude Code**, sin depender
  de un equipo de desarrollo — esto influye en decisiones de arquitectura
  (por ejemplo, elegir Server Actions en vez de una capa de API separada, para
  reducir superficie de mantenimiento).
- **Cadencia de trabajo limitada por sesiones de Claude Code** (ventanas de
  uso de la cuenta) — afecta el ritmo de avance, no el alcance; se mitiga
  manteniendo `PROYECTO.md` y las specs actualizadas para poder retomar sin
  perder contexto entre sesiones.

## Supuestos

- Se asume que Esperanza está de acuerdo en migrar del Excel a la app (vale la
  pena confirmarlo con ella explícitamente antes de considerar "adoptado" el
  Mini-proyecto 1, no solo asumirlo).
- Se asume que, por ahora, solo se necesita soportar 1 hogar de 2 personas en
  uso real — el modelo de datos es extensible, pero multi-hogar real no está
  validado ni es un compromiso de este proyecto.

## Riesgos iniciales

- **Riesgo de adopción:** si registrar un gasto tiene más fricción que
  abrir el Excel, la pareja regresa al hábito anterior. Mitigación: probar el
  flujo de registro de gasto con ambos usuarios reales antes de dar por
  cerrado el Mini-proyecto 1.
- **Riesgo de integridad del dato (dinero mal calculado):** un error en la
  lógica de reparto o en el aislamiento de datos entre hogares (RLS) sería el
  fallo más costoso posible en este proyecto. Mitigación: cobertura de tests
  más alta de todo el proyecto en `lib/split-logic.ts` y verificación
  explícita de RLS (ver Definition of Done).
- **Riesgo de continuidad de contexto:** al ser un proyecto ejecutado en
  sesiones acotadas de Claude Code, se puede perder contexto entre sesiones.
  Mitigación: `PROYECTO.md` como estado vivo, y este mismo conjunto de
  documentos de PM como referencia estable.

## Aprobación

- **Project Manager / Owner:** Gustavo — aprueba este charter como base del
  proyecto.
- **Stakeholder:** Esperanza — informada del alcance y los criterios de éxito;
  pendiente confirmación explícita de su parte antes de cerrar el
  Mini-proyecto 1 como "adoptado" (ver Supuestos).
