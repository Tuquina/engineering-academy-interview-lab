---
id: iq.runtime-validation
format: deep-dive
question: "Tu API recibe un JSON tipado como CreateOrder y en producción llega un campo con otro tipo. ¿Por qué el compilador no lo evitó y cómo lo resolvés?"
expectedPoints:
  - id: erasure
    point: "Los tipos se borran al compilar: TypeScript no valida datos que llegan en runtime."
  - id: boundary
    point: "Los datos externos (requests, colas, archivos, respuestas de APIs, LLMs) deben validarse en el borde."
  - id: schema
    point: "Usa un esquema (Zod, Valibot) como fuente única y deriva el tipo con z.infer."
  - id: unknown
    point: "Tipa la entrada como unknown hasta validarla, en lugar de usar any o as."
  - id: errors
    point: "Devuelve errores de validación útiles (400/422) y no deja pasar datos parcialmente válidos."
followUps:
  - "¿Validarías también las respuestas de un servicio externo? ¿Por qué?"
  - "¿Qué costo de performance tiene validar todo?"
commonMistakes:
  - "Usar req.body as CreateOrder y confiar en el tipo."
  - "Mantener por separado una interfaz y un esquema que se desincronizan."
relatedLessons: ["typescript.runtime-vs-type-system", "typescript.type-safe-apis"]
relatedPatterns: []
---

El compilador no lo evitó porque **los tipos no existen en runtime**: `req.body as CreateOrder` es una afirmación del
programador, no una verificación. Si el cliente manda `"amount": "100"`, el código sigue como si fuera un número.

La solución es **validar en el borde** del sistema, todo lo que viene de afuera: requests HTTP, mensajes de colas,
archivos, variables de entorno, respuestas de APIs externas y salidas de un LLM.

```ts
const CreateOrder = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })).min(1),
});
type CreateOrder = z.infer<typeof CreateOrder>; // un solo origen de verdad

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = CreateOrder.safeParse(body);
  if (!parsed.success) return Response.json({ errors: parsed.error.issues }, { status: 422 });
  return createOrder(parsed.data); // desde acá el tipo es real
}
```

Derivar el tipo del esquema evita que la interfaz y la validación se desincronicen. Dentro del sistema, una vez
validado, confío en los tipos. El costo de validar es mínimo comparado con la latencia de red y evita corromper datos.
