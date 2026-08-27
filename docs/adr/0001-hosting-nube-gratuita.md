# ADR 0001: Hosting en nube gratuita (Vercel + Supabase)

**Estado:** Aceptado (2026-08-27)

## Contexto

El proyecto necesita un lugar donde correr la app web (Next.js) y donde vivir la
base de datos (Postgres) para que Gustavo y Esperanza puedan usarla desde el celular
o la PC, desde cualquier red, sin depender de que un equipo específico esté
encendido. El usuario ya tiene infraestructura propia en casa: un servidor TrueNAS
(ver el proyecto paralelo de migración TrueNAS → Nextcloud), por lo que autohospedar
era una opción real y no solo teórica. También existía la opción, más simple aún, de
correr la app solo en local (sin exponerla a internet).

Restricciones relevantes:
- El proyecto es de uso personal/doméstico (una pareja), sin presupuesto asignado
  para infraestructura — cualquier costo recurrente debe justificarse.
- Es además una pieza de portafolio: debe poder mostrarse a terceros (reclutadores,
  entrevistas) sin pedirles que se conecten a una red doméstica o VPN.
- El tiempo de Gustavo es limitado; cualquier carga operativa de mantener
  infraestructura (parches, backups, exposición segura a internet) compite con el
  tiempo de construir la app en sí.

## Decisión

Desplegar en la capa gratuita de servicios administrados en la nube: **Vercel** para
el hosting de la app Next.js y **Supabase** para Postgres + Auth + almacenamiento,
en vez de autohospedar en el TrueNAS del usuario o correr la app solo en local.

## Alternativas consideradas

- **Autohospedado en el TrueNAS del usuario.** Se descartó porque implica exponer un
  servicio a internet (o mantener una VPN) para que la app sea usable fuera de casa,
  además de responsabilidad propia de backups, actualizaciones de seguridad y
  disponibilidad — carga operativa que no aporta al objetivo del proyecto (aprender
  y practicar gestión de producto/PM, no administración de servidores). El TrueNAS ya
  tiene su propio proyecto de migración en curso; mezclar ambos añade riesgo a los
  dos.
- **Solo local (sin desplegar a internet).** Se descartó porque no cumple el
  requisito básico de uso: Esperanza y Gustavo necesitan registrar gastos desde el
  celular en el momento en que ocurren (en el súper, en el coche), no solo desde una
  computadora en casa. Tampoco sirve como pieza de portafolio demostrable a terceros.

## Consecuencias

**Positivas:**
- Cero costo mientras el uso se mantenga dentro de los límites de la capa gratuita
  (esperable para un hogar de 2 personas).
- Cero carga operativa de infraestructura: sin servidores que parchar, sin backups
  manuales de la base de datos, sin certificados TLS que renovar — todo administrado
  por Vercel/Supabase.
- Despliegue continuo casi gratis de configurar (push a `main` → deploy automático),
  lo que acelera el ciclo diseño → implementación → validación de cada mini-proyecto.
- URL pública estable, fácil de compartir como evidencia de portafolio.

**Trade-offs aceptados:**
- Dependencia de terceros: si Vercel o Supabase cambian sus políticas de capa
  gratuita, suben precios, o el proyecto crece más de lo esperado, puede aparecer un
  costo recurrente a futuro (riesgo bajo dado el tamaño de uso proyectado: un hogar).
- Los datos de la pareja (montos, hábitos de gasto) quedan en infraestructura de un
  tercero en vez de en un servidor propio — aceptable para este caso de uso, pero es
  una decisión consciente de dónde vive la privacidad de esos datos.
- Menor control técnico de bajo nivel comparado con autohospedar (no se puede ajustar
  configuración del servidor o de Postgres más allá de lo que exponen los paneles de
  Vercel/Supabase) — trade-off aceptado a cambio de velocidad y cero mantenimiento.
