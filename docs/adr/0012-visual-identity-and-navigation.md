# ADR-0012: Identidad visual por área y navegación agrupada

- **Estado:** Aceptado — 2026-11-21

## Contexto

La interfaz era casi monocolor: fondo azul marino con un único acento azul para todo (enlaces, badges, progreso,
estados). Las áreas de conocimiento no se distinguían entre sí, la barra lateral listaba 17 secciones sin jerarquía y
en móvil todo pasaba por el menú lateral. El contenido (`content/`) no debía cambiar.

## Decisión

- **Paleta en tokens** (`src/app/globals.css`): neutros grafito, acento índigo, estados `success`, `warning`,
  `danger` e `info` diferenciados, y siete tonos de área (`--area-1` … `--area-7`) con variantes para claro y oscuro.
  Los componentes usan utilidades de Tailwind sobre esos tokens, nunca colores sueltos.
- **Tono de área por contexto:** un contenedor con `area-tone-N` define `--area`, y dentro se usan `text-area`,
  `bg-area/12` o `border-area/40`. Así una tarjeta, un curso o una lección completa (viñetas, títulos h3, barra de
  progreso, migas) heredan el color de su área sin pasar props. El mapa área → tono e ícono vive en
  `src/shared/ui/area-tone.ts`; un área nueva sin entrada recibe un tono estable derivado de su ID.
- **Contraste verificado:** `scripts/check-contrast.mjs` calcula WCAG 2.x para cada token de texto sobre `background`,
  `surface`, `surface-2` y sobre su propio fondo tintado al 12 %, en ambos modos, y falla por debajo de 4.5:1.
- **Dificultad con color:** básico (éxito), intermedio (info), avanzado (advertencia), además del texto.
- **Navegación:** la barra lateral se agrupa en Aprender, Practicar, Entrevistas y Tu progreso, con íconos del color
  del grupo; los cursos llevan el punto de color de su área y se pueden plegar. En móvil se suma una barra inferior
  (Inicio, Biblioteca, Labs, Buscar); el botón Buscar abre el buscador global con el evento `eal:open-search` para
  que el layout compartido no dependa del módulo de búsqueda.
- **Lección:** ancho de lectura acotado (~70 caracteres), barra de progreso de lectura bajo el encabezado (sólo
  visual, el progreso real se registra aparte), "Lección N de M", migas con el color del curso, separadores entre
  secciones h2, callouts con franja y color de estado, y anterior/siguiente como tarjetas.

## Consecuencias

- Cambiar la paleta es editar tokens en un solo archivo y volver a correr el script de contraste.
- Los colores de área se reutilizan para identificar grupos de navegación; no hay que tratarlos como estados.
- La barra inferior ocupa espacio en móvil: el `main` reserva `pb-24` debajo de `lg`.
