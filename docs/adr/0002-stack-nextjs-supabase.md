# ADR 0002: Stack Next.js (App Router) + TypeScript + Supabase

**Estado:** Aceptado (2026-08-27)

## Contexto

Con el hosting ya decidido (ADR 0001: Vercel + Supabase), había que elegir cómo
estructurar el código de la app en sí: qué framework de frontend, si separar
frontend y backend en proyectos/servicios distintos, y cuánto código propio construir
frente a apoyarse en lo que Supabase ya ofrece de fábrica (Auth, cliente de datos,
Row Level Security).

Restricciones relevantes:
- El MVP (Mini-proyecto 1) necesita salir rápido: auth, hogares, registro de gastos,
  reparto automático y balance — sin sobre-construir infraestructura que no se va a
  usar en esta fase.
- El proyecto es también pieza de portafolio de PM: el stack elegido debe poder
  explicarse y justificarse claramente ante un evaluador no necesariamente experto en
  cada tecnología.
- No hay necesidad de una API pública consumida por terceros ni de apps nativas
  separadas (móvil se resuelve como PWA en el Mini-proyecto 3), lo que reduce la
  necesidad de una capa de API REST/GraphQL independiente.

## Decisión

Usar **Next.js (App Router) + TypeScript + Supabase** como stack único: Next.js sirve
tanto el frontend como la lógica de servidor (Server Components para lectura, Server
Actions para escritura), y Supabase provee Postgres, Auth y Row Level Security —
en vez de separar frontend y backend en proyectos distintos, o de construir todo
directamente contra el cliente de Supabase con el mínimo código propio posible.

## Alternativas consideradas

- **Frontend y backend separados** (por ejemplo, un frontend en Next.js/React
  consumiendo una API propia en Node/Express, NestJS u otro backend independiente).
  Se descartó porque para el volumen de lógica de negocio de este MVP (reparto de
  gastos, cálculo de balance) no se justifica el costo de mantener y desplegar dos
  proyectos, con su propio versionado de contratos de API entre ambos. Next.js con
  Server Actions cubre esa necesidad sin la capa adicional.
- **Todo-en-Supabase con mínimo código propio** (usar el cliente de Supabase
  directamente desde componentes de frontend, sin una capa de servidor propia que
  centralice validación y lógica de reparto). Se descartó porque la lógica de reparto
  y cálculo de balance es la parte más sensible del proyecto ("dinero mal calculado
  entre la pareja", ver spec, sección Testing) y conviene que viva en código propio,
  testeable de forma aislada (`lib/split-logic.ts`), y no dispersa en llamadas directas
  desde el cliente sin una capa de validación de servidor.

## Consecuencias

**Positivas:**
- Un solo repositorio, un solo despliegue, un solo lenguaje (TypeScript) de punta a
  punta — menor superficie para errores de coordinación entre frontend y backend.
- Server Actions evitan construir y mantener una capa de API REST/GraphQL propia solo
  para uso interno de la misma app.
- Row Level Security de Supabase aplica el aislamiento de datos por hogar a nivel de
  base de datos, no solo en checks de la aplicación — una capa de seguridad adicional
  que no depende de que el código de la app nunca tenga un bug.
- Stack ampliamente documentado y con soporte de la comunidad, lo que facilita usar
  herramientas de asistencia de código (Context7, etc.) durante el desarrollo.

**Trade-offs aceptados:**
- Acoplamiento a las convenciones y límites de Next.js App Router y del modelo de
  Server Actions — si el proyecto creciera hasta necesitar una API pública consumida
  por terceros (por ejemplo, para la integración con Notion del Mini-proyecto 4),
  probablemente haya que añadir una capa de API explícita más adelante.
- Menos separación de responsabilidades que tener backend y frontend en repos
  distintos; aceptable en el tamaño actual del equipo (una sola persona
  desarrollando), pero sería una limitación real si el proyecto creciera a un equipo
  más grande con responsabilidades divididas.
