# Diseño: Núcleo de la app de gastos en pareja (Mini-proyecto 1 / MVP)

**Fecha:** 2026-08-27 (actualizado el mismo día tras resolver 2 vacíos detectados tanto por el backlog de PM en `docs/pm/03-backlog-mini-proyecto-1.md`)
**Estado:** Aprobado por el usuario (Gustavo/Rizo), pendiente de plan de implementación.

## Contexto

Este proyecto reemplaza el flujo manual que Gustavo y Esperanza llevaban en un Excel
(`gastos  generales y cuentass.xlsx`, ver análisis histórico en
`C:\Users\leonr\Documents\2 CASA Y TRAMITES\`) por una app web que ambos puedan usar
desde su teléfono o computadora para registrar gastos, ver el reparto automático y
saber en cualquier momento quién le debe a quién.

Es el Mini-proyecto 1 de una hoja de ruta más grande (ver `docs/fases/`):

0. Fundación (esta carpeta, repo, docs) — en curso
1. **Núcleo de la app (este documento)**
2. Presupuestos y Dashboard
3. Deploy y pulido móvil (PWA)
4. (futuro) Notion API / multi-hogar real

El objetivo declarado del proyecto es doble: (a) una herramienta real que la pareja
use, y (b) una pieza de portafolio para el reposicionamiento de Gustavo hacia
Project Manager (ver `conseguir-jale` en el workspace) — por eso cada mini-proyecto
se documenta como si fuera un caso de estudio de PM, con su propio ciclo de
diseño → spec → plan → implementación → reporte de fase.

## Decisiones ya tomadas (con el usuario, vía brainstorming)

| Decisión | Elegida | Alternativas descartadas |
|---|---|---|
| Hosting | Nube gratuita (Vercel + Supabase) | Autohospedado en TrueNAS, solo local |
| Alcance de usuarios | Extensible pero enfocado: auth real con invitación, modelado por "hogares", pero probado solo para 1 hogar | Cuentas fijas hardcodeadas, multi-hogar completo tipo SaaS |
| Stack | Next.js (App Router) + TypeScript + Supabase | Frontend/backend separados; todo-en-Supabase con mínimo código propio |
| Notion | Tablero de PM del proyecto (fuera de la app) | Integración de datos dentro de la app; ambas cosas |
| Datos históricos | La app arranca vacía | Importar las 2,117 transacciones ya categorizadas |
| Método de login | Email + contraseña (con recuperación) | Magic link, o ambos disponibles |
| Editar/borrar gastos | Sí, en el alcance del Mini-proyecto 1 | Posponer a un mini-proyecto posterior |

## Arquitectura

- **Framework:** Next.js 14+ (App Router), TypeScript, desplegado en Vercel (capa
  gratuita/hobby).
- **Backend de datos:** Supabase — Postgres administrado + Auth (email + contraseña,
  con recuperación de contraseña por correo) + Row Level Security (RLS) para aislar
  los datos por hogar a nivel de base de datos, no solo con checks en el código de
  la app.
- **UI:** Tailwind CSS + shadcn/ui, diseño mobile-first, responsive en PC y celular.
- **PWA:** manifest + service worker para poder instalar la app en la pantalla de
  inicio del celular sin construir una app nativa aparte.
- **Datos/mutaciones:** Server Components para lectura, Server Actions para
  escritura — sin necesidad de una capa de API REST/GraphQL separada para el MVP.

No-objetivos explícitos de este mini-proyecto (quedan para mini-proyectos
posteriores o fuera de alcance):
- Presupuestos por categoría y dashboards visuales → Mini-proyecto 2.
- PWA instalable, pulido móvil final → Mini-proyecto 3.
- Integración de datos con Notion, soporte multi-hogar real → Mini-proyecto 4 (futuro).
- Notificaciones push/email, adjuntar fotos de recibos, multi-moneda: fuera de
  alcance salvo que el usuario lo pida explícitamente después.

## Modelo de datos

```
households
  id (uuid, pk)
  name (text)
  created_at

profiles                       -- extiende auth.users de Supabase
  id (uuid, pk, fk -> auth.users.id)
  display_name (text)

household_members
  household_id (fk -> households.id)
  user_id (fk -> profiles.id)
  role (enum: owner | member)
  default_split_percentage (numeric)  -- ej. 60 para Gustavo, 40 para Esperanza,
                                       -- en el reparto "regular" del hogar
  PRIMARY KEY (household_id, user_id)

household_invites
  id (uuid, pk)
  household_id (fk -> households.id)
  code (text, unique)             -- código/link de invitación
  created_by (fk -> profiles.id)
  expires_at (timestamp, nullable)
  used_at (timestamp, nullable)

categories
  id (uuid, pk)
  household_id (fk -> households.id)
  name (text)
  monthly_budget (numeric, nullable)   -- se usa a partir del Mini-proyecto 2
  is_default (boolean)                 -- true para las categorías sembradas

transactions
  id (uuid, pk)
  household_id (fk -> households.id)
  amount (numeric)
  concept (text)
  paid_by (fk -> profiles.id)
  category_id (fk -> categories.id)
  date (date)
  split_type (enum: regular | big | custom)
  custom_split_percentage (numeric, nullable)  -- solo si split_type = custom
  created_at
  updated_at (nullable)
  updated_by (fk -> profiles.id, nullable)  -- último miembro que editó o borró
```

**Editar y borrar transacciones:** cualquier miembro del hogar puede editar o
borrar cualquier transacción de su propio hogar (el registro es colaborativo, no
exclusivo de quien la creó). Borrado es definitivo (hard delete) para el MVP — no
hay papelera ni deshacer, eso queda fuera de alcance salvo que se pida
explícitamente después. `updated_at`/`updated_by` quedan como rastro mínimo de
auditoría. Editar o borrar una transacción no requiere lógica adicional para el
balance porque este se recalcula al vuelo (ver más abajo).

**Validación de porcentajes:** la suma de `default_split_percentage` de todos los
miembros de un hogar debe ser exactamente 100 — se valida al invitar/unirse a un
segundo miembro y al editar el reparto. `custom_split_percentage` en una transacción
se define como el porcentaje que corresponde al miembro con `role = owner`; el resto
se reparte el complemento. Este modelo asume hogares de 2 miembros (consistente con
la decisión de "extensible pero probado solo para 1 hogar de 2 personas"); soportar
más de 2 miembros con reparto personalizado por persona queda fuera de alcance de
este mini-proyecto.

**Categorías sembradas por defecto** al crear un hogar (basadas en el análisis
histórico real de Gustavo y Esperanza): Tienda/Súper, Comida, Otros/Varios, Cuidado
del hogar, Gasolina, Servicios, Entretenimiento, Salud, Auto, Mascotas, Transporte,
Renta.

**Cálculo del balance ("quién debe a quién"):** se calcula al vuelo con una consulta
agregada sobre `transactions` (no se guarda un balance duplicado en una tabla aparte,
para evitar que se desincronice). Por transacción:
- `split_type = regular` → se reparte según `default_split_percentage` de cada
  miembro del hogar.
- `split_type = big` → 50/50 entre los miembros del hogar.
- `split_type = custom` → usa `custom_split_percentage` de esa transacción.

Balance de un miembro = Σ(monto que le correspondía pagar) − Σ(monto que
efectivamente pagó, según `paid_by`).

## Flujo de autenticación / invitación

1. Un usuario nuevo se registra con email + contraseña vía Supabase Auth. Puede
   restablecer su contraseña por correo si la olvida (flujo estándar de Supabase
   Auth).
2. Si no pertenece a ningún hogar, se le ofrece: crear un hogar nuevo (se vuelve
   `owner`), o unirse a uno existente con un código de invitación.
3. El `owner` de un hogar puede generar un código/link de invitación desde la app
   para que su pareja se una.
4. RLS en Supabase garantiza que las consultas a `transactions`, `categories`, etc.
   solo devuelvan filas del `household_id` al que pertenece el usuario autenticado.

## Manejo de errores

- Validación de formularios con `zod`, tanto en cliente (feedback inmediato) como
  repetida en servidor dentro de la Server Action (nunca confiar solo en el cliente).
- Errores de red/Supabase se capturan y se muestran como un mensaje de error claro
  (toast), sin tumbar la app ni perder lo que el usuario estaba escribiendo.
- Casos de borde a cubrir explícitamente: registrar un gasto sin conexión (mostrar
  error claro, no fallar en silencio — la sincronización offline real queda fuera
  de alcance del MVP), código de invitación inválido o ya usado, montos negativos o
  no numéricos.

## Testing

- **Vitest** para la lógica de reparto y cálculo de balance (`lib/split-logic.ts`),
  aislada del resto de la app y con la cobertura más alta del proyecto — un error
  aquí significa "dinero mal calculado entre la pareja", así que es la parte que
  más vale la pena probar a fondo (casos: reparto regular, grande, custom, montos
  con decimales, redondeo).
- **Playwright** para 1-2 flujos end-to-end críticos: login + registrar un gasto +
  editar/borrar ese gasto + ver el balance actualizado en cada paso. No se
  construye una suite exhaustiva de E2E para el MVP — eso puede crecer en
  mini-proyectos posteriores si hace falta.

## Estructura del repo

```
gastos-pareja/
  app/                    # Next.js App Router
  components/
  lib/
    supabase/
    split-logic.ts
  supabase/
    migrations/
  docs/
    superpowers/specs/    # specs de diseño (este archivo)
    fases/                # reportes de fase para portafolio
  tests/
  PROYECTO.md             # estado vivo del proyecto (convención del workspace)
```

## Próximo paso

Invocar la skill `writing-plans` para convertir este diseño en un plan de
implementación paso a paso (tareas concretas, orden, criterios de aceptación por
tarea) antes de escribir cualquier código.
