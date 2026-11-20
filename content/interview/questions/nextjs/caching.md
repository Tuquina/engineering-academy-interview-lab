---
id: iq.nextjs-caching
format: deep-dive
question: "Publicás un producto nuevo desde el panel de administración pero la página pública sigue mostrando el catálogo viejo. ¿Por qué y cómo lo resolvés?"
expectedPoints:
  - id: static
    point: "La página se prerenderizó en el build (o está cacheada) y no se volvió a generar después del cambio."
  - id: revalidate
    point: "Después de la mutación se invalida con revalidatePath o revalidateTag desde la Server Action o el Route Handler."
  - id: time
    point: "Alternativa: revalidación por tiempo (ISR) aceptando cierto retraso."
  - id: dynamic
    point: "Si los datos deben estar siempre frescos, la ruta puede ser dinámica, con el costo de renderizar por request."
  - id: layers
    point: "Distingue capas de caché: datos, página completa en el servidor/CDN y caché del router del cliente."
followUps:
  - "¿Cómo invalidarías la caché si el cambio lo hace otro servicio, no Next.js?"
  - "¿Qué ventaja tiene invalidar por tag en lugar de por ruta?"
commonMistakes:
  - "Hacer toda la aplicación dinámica para evitar el problema."
  - "No saber qué partes de la página están cacheadas y cuáles no."
relatedLessons: ["nextjs.data-mutations", "nextjs.production"]
relatedPatterns: []
---

Lo más probable es que la página del catálogo sea **estática**: se generó en el build (o en la primera visita) y se sirve
desde la caché. La escritura en la base no le avisa a Next.js que el HTML quedó viejo.

Soluciones, de la más precisa a la más general:

1. **Invalidación bajo demanda**: después de guardar, la Server Action llama a `revalidateTag("products")` (si las
   lecturas se etiquetaron con ese tag) o a `revalidatePath("/catalogo")`. La siguiente visita regenera la página.
   Invalidar por **tag** es mejor cuando el mismo dato aparece en varias rutas.
2. **Revalidación por tiempo** (ISR): `export const revalidate = 300`. Simple, pero acepta hasta 5 minutos de datos
   viejos.
3. **Ruta dinámica**: renderizar por request. Siempre fresco, pero más lento y caro; reservarlo para datos por usuario.

Si el cambio lo hace **otro servicio**, ese servicio llama a un Route Handler protegido (con un secreto) que ejecuta
`revalidateTag`. También hay que tener en cuenta la caché del **router del cliente**: después de una mutación,
`router.refresh()` o la revalidación desde la acción actualizan la vista actual.
