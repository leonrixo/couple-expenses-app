# Definition of Done — Mini-proyecto 1 (Núcleo de la app)

## ¿Qué es este documento y para qué sirve?

El Definition of Done (DoD) es el checklist único que aplica a **todo** un
bloque de trabajo (aquí, el Mini-proyecto 1 completo) para decidir si de
verdad está terminado — a diferencia de los criterios de aceptación, que son
específicos de cada historia de usuario individual (ver
[`03-backlog-mini-proyecto-1.md`](03-backlog-mini-proyecto-1.md)). Una
historia puede cumplir sus criterios de aceptación uno por uno y, aun así, el
mini-proyecto completo no estar "hecho" si, por ejemplo, nadie probó que el
aislamiento de datos entre hogares funciona de verdad.

**Por qué se escribe esto ANTES de implementar, y no al final:** sin un DoD
por escrito, "¿ya está listo?" se vuelve una pregunta subjetiva — algo se
"ve" terminado (la pantalla carga, el formulario guarda) pero puede faltar
validar justo lo que más importa y no se nota a simple vista, como que el
cálculo del balance sea exacto o que un usuario de un hogar no pueda ver
datos de otro. Tenerlo escrito de antemano evita esa discusión al final del
mini-proyecto y, más importante, evita el sesgo de dar por cerrado algo que
"se ve bien" cuando en realidad tiene un fallo grave sin detectar — que en
este proyecto significaría dinero mal calculado entre la pareja o una fuga de
privacidad entre hogares.

Este checklist se revisa una vez antes de declarar cerrado el Mini-proyecto 1
y queda como evidencia en el reporte de fase correspondiente
(`docs/fases/`).

---

## Checklist

### Correctitud de la lógica de dinero
- [ ] Los tests de Vitest en `lib/split-logic.ts` cubren los tres tipos de
      reparto (`regular`, `big`, `custom`), montos con decimales y casos de
      redondeo, y **pasan en verde**.
- [ ] El balance mostrado en la app coincide con un cálculo manual de control
      hecho por fuera de la app, verificado en al menos 3 casos distintos.

### Seguridad y aislamiento de datos
- [ ] Las políticas de RLS de Supabase se probaron con dos usuarios de dos
      hogares distintos y se confirmó que ninguno puede leer ni escribir
      datos del otro hogar — probado de verdad (no solo revisado en el
      código de las políticas).

### Flujos funcionales completos
- [ ] El flujo de registro/login funciona de principio a fin.
- [ ] El flujo de crear hogar → generar invitación → unirse con el código
      funciona de principio a fin, incluyendo los casos de error (código
      inválido, expirado, ya usado).
- [ ] El flujo end-to-end de Playwright (login + registrar un gasto + ver el
      balance actualizado) pasa.
- [ ] Los casos de borde de manejo de errores de la spec están cubiertos y
      probados explícitamente: monto negativo o no numérico, código de
      invitación inválido, y error de red al guardar un gasto (mensaje claro
      al usuario, sin perder lo que estaba escribiendo, sin fallar en
      silencio).

### Experiencia y calidad visual
- [ ] La app se ve y funciona bien responsive en al menos un tamaño de
      escritorio y un tamaño de celular **real** (probado en el teléfono de
      Gustavo o de Esperanza, no solo en las herramientas de desarrollador
      del navegador).
- [ ] No hay errores en la consola del navegador durante los flujos
      principales (registro, login, crear/unirse a hogar, registrar gasto,
      ver balance).
- [ ] Los formularios muestran feedback claro de error (toast o mensaje en
      línea) tanto para errores de validación como de red.

### Despliegue
- [ ] La app está desplegada en Vercel y es accesible por una **URL real**
      (no solo `localhost`), y tanto Gustavo como Esperanza pueden entrar
      desde sus propios dispositivos.

### Documentación y cierre del ciclo
- [ ] El código está versionado en git con commits legibles.
- [ ] `PROYECTO.md` está actualizado reflejando el cierre del Mini-proyecto 1.
- [ ] Existe un reporte de fase en `docs/fases/` para el Mini-proyecto 1,
      documentando qué se construyó, qué decisiones se tomaron durante la
      implementación (si difirieron de la spec) y qué quedó pendiente.

### Validación con los usuarios reales
- [ ] Gustavo y Esperanza probaron la app cada uno al menos una vez de forma
      independiente (no solo Gustavo probando por los dos) y confirmaron que
      el balance calculado coincide con lo que ellos esperarían de un cálculo
      manual.
