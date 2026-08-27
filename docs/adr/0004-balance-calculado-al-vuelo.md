# ADR 0004: Balance de "quién debe a quién" calculado al vuelo

**Estado:** Aceptado (2026-08-27)

## Contexto

La funcionalidad central de la app es responder, en cualquier momento, "¿quién le
debe a quién y cuánto?", a partir de las transacciones registradas y su tipo de
reparto (`regular`, `big` o `custom`, cada uno con su propia regla de porcentajes —
ver spec, sección "Modelo de datos"). Había que decidir dónde vive ese número: si se
guarda como un valor ya calculado (por ejemplo, un campo `balance` por miembro en una
tabla de hogar, actualizado cada vez que se crea, edita o borra una transacción), o
si se recalcula cada vez que se consulta.

Restricciones relevantes:
- El balance depende de **todas** las transacciones del hogar y de su tipo de
  reparto — no es un valor independiente, es una agregación derivada.
- Las transacciones se pueden crear y (razonablemente, aunque no está detallado en
  la spec) editar o borrar; cualquier valor cacheado necesitaría actualizarse en cada
  una de esas operaciones, en todos los puntos del código donde ocurren.
- Es un cálculo de dinero entre dos personas de la misma pareja: un balance
  incorrecto o desincronizado no es un bug cosmético, es un problema de confianza
  real entre los usuarios de la app.
- El volumen de datos esperado es bajo (los gastos de un hogar de 2 personas, no
  miles de transacciones por segundo), lo que hace que el costo de recalcular en cada
  consulta sea, en la práctica, insignificante.

## Decisión

Calcular el balance con una **consulta agregada sobre `transactions` en cada
consulta** (al vuelo), en vez de guardar un balance duplicado/cacheado en una tabla
aparte.

## Alternativas consideradas

- **Guardar el balance como valor cacheado** (por ejemplo, un campo agregado por
  miembro, actualizado vía trigger de base de datos o lógica de aplicación cada vez
  que cambia una transacción). Se descartó porque introduce una fuente de verdad
  duplicada: el balance real siempre es una función de las transacciones, así que
  cachearlo obliga a mantener esa copia sincronizada en **todos** los caminos que
  tocan una transacción (crear, editar, borrar, y cualquier corrección manual futura
  en la base de datos). Basta con que un solo camino olvide actualizar el cache —
  hoy o en un cambio futuro del código — para que el balance mostrado deje de
  coincidir con la realidad, con el agravante de que ese tipo de bug es silencioso
  (no truena la app, simplemente muestra un número de dinero equivocado entre la
  pareja, que es exactamente el dato que menos margen de error tolera en este
  proyecto).

## Consecuencias

**Positivas:**
- Una sola fuente de verdad: el balance siempre refleja exactamente el estado actual
  de `transactions`, sin riesgo de desincronización estructural.
- Menos código que mantener y menos casos de borde que probar: no hace falta lógica
  de invalidación de cache ni triggers de sincronización, solo la función de cálculo
  en sí (`lib/split-logic.ts`), que además ya está identificada en la spec como la
  pieza con más cobertura de pruebas (Vitest) de todo el proyecto.
- Editar o borrar una transacción pasada (funcionalidad razonable de esperar, aunque
  no esté detallada en el MVP) no requiere ningún trabajo adicional para mantener el
  balance correcto — el recálculo ya lo resuelve automáticamente.

**Trade-offs aceptados:**
- Costo de cómputo repetido en cada consulta del balance, en vez de una simple
  lectura de un valor ya guardado. Aceptable ahora dado el volumen de datos de un
  hogar de 2 personas; si en el futuro (por ejemplo, con historial de años de
  transacciones o con el escenario multi-hogar del ADR 0003) el costo de recalcular
  se vuelve relevante, esta decisión tendría que revisarse — probablemente con un
  cache invalidado correctamente en vez de descartar el cálculo al vuelo por
  completo.
- Requiere que la consulta agregada esté bien indexada (por `household_id` como
  mínimo) para mantenerse rápida a medida que crece el historial de transacciones;
  es una responsabilidad de implementación a vigilar, no solo de diseño.
