# Backlog priorizado — Mini-proyecto 1 (Núcleo de la app)

## ¿Qué es este documento y para qué sirve?

El backlog es la lista de trabajo concreta dentro de un bloque del roadmap
(aquí, el Mini-proyecto 1), escrita como historias de usuario y ordenada por
prioridad. Es el puente entre "qué vamos a construir en este mini-proyecto"
(el roadmap) y "qué tareas técnicas concretas hay que hacer, en qué orden"
(el plan de implementación, que se genera después con la skill
`writing-plans`).

Cada historia sigue el formato **"Como [rol], quiero [acción], para
[beneficio]"** — obliga a explicar por qué algo importa antes de construirlo,
no solo qué construir. Cada una trae criterios de aceptación: la lista
concreta que dice cuándo esa historia individual está resuelta (distinto del
Definition of Done, que aplica a todo el mini-proyecto — ver
[`04-definition-of-done.md`](04-definition-of-done.md)).

## Cómo se priorizó

Se usó un criterio de tres factores, en este orden:

1. **¿Bloquea a otras historias?** (dependencia técnica) — por ejemplo, no se
   puede registrar un gasto sin que exista antes un hogar al que pertenezca.
2. **¿Es indispensable para que la app reemplace el Excel desde el día 1?**
   (valor de uso diario) — lo que la pareja necesita para dejar de usar el
   Excel va primero; lo que solo mejora la experiencia va después.
3. **¿El costo de un error aquí es alto?** (riesgo) — todo lo relacionado con
   el cálculo correcto del dinero y el aislamiento de datos entre hogares se
   trata como Must have, sin excepción, aunque en teoría "ya funcione" en el
   caso feliz.

Con eso se agrupan las historias en **Must have (P0)** — sin esto el
Mini-proyecto 1 no cumple su objetivo —, **Should have (P1)** — importante,
mejora el uso real, pero no bloquea el reemplazo del Excel — y **Could have
(P2)** — deseable, se puede dejar para después sin costo real.

---

## Must have (P0)

**1. Registro de cuenta**
Como usuario nuevo, quiero registrarme con correo y contraseña (o magic link),
para tener acceso a la app.
- Acepta correo válido y contraseña con requisitos mínimos razonables (o
  flujo de magic link, según lo que defina el plan de implementación).
- Muestra error claro si el correo ya está registrado.
- Al completar el registro, el usuario queda autenticado y entra a la app.

**2. Inicio de sesión**
Como usuario registrado, quiero iniciar sesión, para entrar a mis datos.
- Login exitoso con credenciales correctas redirige al estado correspondiente
  (sin hogar → onboarding; con hogar → vista principal).
- Login fallido muestra un mensaje de error claro sin revelar si el correo
  existe o no (buena práctica de seguridad básica).

**3. Crear un hogar nuevo**
Como usuario sin hogar, quiero crear un hogar nuevo, para empezar a usar la
app y convertirme en su `owner`.
- Al crear el hogar, el usuario queda registrado como `owner` en
  `household_members`.
- Se sembran automáticamente las categorías por defecto (ver historia 6).
- El `default_split_percentage` inicial del owner se define de forma
  explícita (ver nota de vacío al final de este documento).

**4. Generar código de invitación**
Como owner de un hogar, quiero generar un código de invitación, para que mi
pareja se una al mismo hogar.
- El código es único, se puede compartir como texto o link.
- Se puede definir una expiración opcional (`expires_at`).

**5. Unirse a un hogar existente**
Como usuario invitado, quiero unirme a un hogar existente con un código de
invitación, para compartir los gastos con mi pareja.
- Código válido y no usado: el usuario queda agregado a
  `household_members` como `member`.
- Al unirse el segundo miembro, se valida que la suma de
  `default_split_percentage` de todos los miembros sea exactamente 100.
- Código inválido, expirado o ya usado: mensaje de error claro, específico
  para cada caso, sin tumbar la app.

**6. Categorías sembradas por defecto**
Como miembro de un hogar, quiero que se creen automáticamente las categorías
por defecto al crear el hogar, para no tener que configurarlas manualmente
antes de registrar mi primer gasto.
- Al crear un hogar se insertan las 12 categorías por defecto de la spec
  (Tienda/Súper, Comida, Otros/Varios, Cuidado del hogar, Gasolina,
  Servicios, Entretenimiento, Salud, Auto, Mascotas, Transporte, Renta), con
  `is_default = true`.

**7. Registrar un gasto**
Como miembro de un hogar, quiero registrar un gasto con monto, concepto,
categoría, quién pagó y tipo de reparto (regular, grande o personalizado),
para llevar el registro real de lo que gastamos.
- Formulario válido guarda una fila en `transactions` asociada al
  `household_id` correcto.
- Si `split_type = custom`, se captura `custom_split_percentage`.
- Validación con `zod` en cliente y repetida en servidor dentro de la Server
  Action.

**8. Ver el balance actual**
Como miembro de un hogar, quiero ver el balance actual (quién le debe a
quién y cuánto), para saber si tengo que transferir dinero o me deben a mí.
- El balance se calcula al vuelo a partir de `transactions` (sin tabla
  duplicada de balance).
- Refleja correctamente los tres tipos de reparto: `regular` (según
  `default_split_percentage`), `big` (50/50), `custom`
  (`custom_split_percentage`).
- El monto y el sentido (quién debe a quién) son correctos frente a un
  cálculo manual de control.

**9. Validación de porcentajes de reparto**
Como miembro de un hogar, quiero que el sistema valide que la suma de
`default_split_percentage` de todos los miembros sea 100%, para que el
balance nunca esté mal calculado por un error de configuración.
- Se valida al invitar/unirse a un segundo miembro y al editar el reparto.
- Si la suma no da 100, se bloquea la acción con un mensaje de error claro.

**10. Manejo de código de invitación inválido**
Como usuario, quiero ver un mensaje de error claro si mi código de
invitación es inválido, expiró o ya fue usado, para saber qué corregir en vez
de quedarme sin explicación.
- Tres mensajes distintos y claros según el caso (inválido / expirado /
  usado), no un error genérico.

**11. Validación de montos**
Como usuario, quiero que la app valide montos al registrar un gasto (no
negativos, numéricos), para evitar datos corruptos que rompan el cálculo del
balance.
- Monto negativo, cero, vacío o no numérico: la app rechaza el envío y
  muestra el error sin perder lo demás que el usuario ya había escrito en el
  formulario.

**12. Aislamiento de datos entre hogares (RLS)**
Como miembro de un hogar, quiero que ningún usuario de otro hogar pueda ver
ni modificar mis datos, para que mi información financiera esté aislada y
privada, aunque hoy solo se pruebe con 1 hogar.
- Las políticas de RLS en Supabase impiden leer o escribir `transactions`,
  `categories`, `household_members`, etc. fuera del `household_id` del
  usuario autenticado, verificado con una prueba real (dos usuarios, dos
  hogares), no solo revisado en el código.

---

## Should have (P1)

**13. Editar el porcentaje de reparto regular**
Como miembro de un hogar, quiero poder editar mi `default_split_percentage`,
para ajustar el reparto 60/40 si nuestra situación cambia (por ejemplo, un
cambio de ingresos).
- Al editar, se revalida que la suma total siga siendo 100.

**14. Historial de gastos**
Como miembro de un hogar, quiero ver un listado histórico de los gastos
registrados, para revisar en qué se ha ido el dinero.
- Lista ordenada por fecha, muestra monto, concepto, categoría, quién pagó
  y tipo de reparto de cada transacción.

**15. Reparto personalizado (custom)**
Como miembro de un hogar, quiero registrar un gasto con reparto
"personalizado" y un porcentaje específico, para casos que no encajan ni en
60/40 ni en 50/50.
- Ya cubierto en el formulario de la historia 7; aquí se prueba
  específicamente el caso `custom` con distintos porcentajes, incluyendo
  decimales.

---

## Could have (P2)

**16. Confirmación visual al registrar un gasto**
Como usuario, quiero recibir una confirmación visual (toast) al registrar un
gasto exitosamente, para saber que se guardó sin tener que revisar el
historial.

---

## Supuestos y vacíos detectados en la spec

Al derivar este backlog de la spec técnica aprobada, quedaron algunos puntos
que la spec no resuelve de forma explícita. Se documentan aquí para
transparencia (buena práctica de PM: dejar constancia de supuestos, no
esconderlos) y deberían confirmarse con el usuario antes o durante el plan de
implementación:

- **Editar o borrar un gasto ya registrado no está contemplado en la spec.**
  No se incluyó como historia de este backlog porque no hay decisión de
  producto tomada al respecto — vale la pena decidir explícitamente si entra
  al Mini-proyecto 1 (es un caso de uso común: "me equivoqué al capturar") o
  se pospone a propósito.
- **`default_split_percentage` del owner antes de que se una el segundo
  miembro:** la spec valida la suma de 100% "al invitar/unirse a un segundo
  miembro", pero no dice explícitamente qué valor tiene el owner mientras el
  hogar tiene un solo miembro (¿100% por defecto? ¿sin definir hasta que se
  una el segundo?). Se asumió, para la historia 3, que debe quedar un valor
  explícito desde la creación del hogar, ajustable después.
- **Método de autenticación por defecto:** la spec deja abierto
  "email/password o magic link" sin indicar cuál es el flujo principal. Se
  escribió la historia 1 cubriendo ambos como alternativas, pero conviene que
  el usuario decida cuál es el flujo primario antes del plan de
  implementación, ya que afecta el diseño de las pantallas de onboarding.
