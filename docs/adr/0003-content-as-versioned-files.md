# ADR-0003: Contenido académico como archivos versionados y catálogo validado

- **Estado:** Aceptado — 2026-11-18

## Contexto

El contenido debe crecer sin modificar el núcleo, pasar por revisión de código y desplegarse en Vercel, donde el
filesystem del deployment es de sólo lectura.

## Decisión

- El contenido oficial vive en `content/` (JSON + MDX con frontmatter) y se valida con Zod al cargarse.
- El dominio (`Catalog`) es independiente del formato: el adaptador `FileSystemContentSource` traduce archivos a datos
  de dominio. Un adaptador de base de datos (contenido personalizado, Fase 6) implementará el mismo puerto.
- Las páginas de cursos y lecciones se pre-generan (`generateStaticParams`); el catálogo se cachea por proceso.
- La integridad (IDs únicos, referencias, ciclos) se valida en el dominio y se cubre con un test sobre el contenido real.

## Alternativas descartadas

- **CMS externo:** agrega infraestructura y dependencia de red para un uso inicialmente personal.
- **`@next/mdx` con imports estáticos:** obliga a registrar cada lección en código; contradice la extensibilidad.
