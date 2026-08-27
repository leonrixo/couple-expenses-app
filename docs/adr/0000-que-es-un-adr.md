# ADR 0000: Qué es un ADR y por qué este proyecto los usa

**Estado:** Aceptado (2026-08-27)

## ¿Qué es un ADR?

Un ADR (Architecture Decision Record, "registro de decisión de arquitectura") es un
documento corto que captura **una** decisión técnica importante: qué se decidió, qué
otras opciones se consideraron, por qué se descartaron, y qué consecuencias trae esa
decisión hacia adelante.

La idea no es documentar todo el diseño del sistema (para eso está la spec técnica
en `docs/superpowers/specs/`), sino dejar un rastro de **por qué** se tomó cada
decisión relevante. El valor de un ADR no se nota el día que se escribe — se nota
seis meses después, cuando alguien (incluido el propio autor) se pregunta "¿por qué
NO usamos X?" y la respuesta ya está escrita, en vez de tener que reconstruirla de
memoria o peor, repetir una discusión ya cerrada.

## Por qué este proyecto usa ADRs

Este proyecto (`gastos-pareja`) tiene un objetivo doble: ser una herramienta real
para Gustavo y Esperanza, y ser una pieza de portafolio de gestión de proyectos para
el reposicionamiento profesional de Gustavo hacia Project Manager (ver
`PROYECTO.md`). Los ADRs cumplen ambos propósitos a la vez:

- **Como práctica de ingeniería:** evitan que decisiones ya discutidas y cerradas se
  vuelvan a abrir sin motivo, y le dan a cualquier colaborador futuro (o al propio
  Gustavo, retomando el proyecto después de semanas sin tocarlo) el contexto completo
  sin tener que releer todo el historial de conversaciones.
- **Como pieza de portafolio:** demuestran, con evidencia escrita, la capacidad de
  tomar decisiones de arquitectura de forma estructurada — evaluando alternativas,
  documentando trade-offs y dejando registro trazable — que es exactamente lo que se
  espera de un PM técnico.

## Convenciones usadas en este repo

- Un archivo por decisión, en `docs/adr/`, numerado secuencialmente:
  `0001-titulo-corto.md`, `0002-...md`, etc.
- Cada ADR sigue el mismo template ligero: Estado, Contexto, Decisión, Alternativas
  consideradas, Consecuencias.
- Los ADRs documentan decisiones **ya tomadas** (no son un espacio de debate abierto);
  la discusión y el brainstorming previos viven en la spec técnica correspondiente.
- Si una decisión documentada aquí cambia más adelante, se crea un ADR nuevo que la
  reemplaza (referenciando al anterior como "Reemplazado por ADR-NNNN"), en vez de
  editar el ADR original — así se conserva el historial de qué se pensaba en cada
  momento.
