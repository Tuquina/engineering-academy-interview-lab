---
id: iq.server-actions-security
format: quick
question: "¿Qué hay que tener en cuenta en seguridad al escribir una Server Action en Next.js?"
expectedPoints:
  - id: public
    point: "Una Server Action es un endpoint POST público: cualquiera puede invocarla, aunque el botón no se muestre."
  - id: authz
    point: "Hay que verificar autenticación y autorización dentro de la acción, sobre el recurso concreto."
  - id: validate
    point: "Hay que validar los argumentos con un esquema; los tipos de TypeScript no protegen en runtime."
  - id: data
    point: "Hay que cuidar qué datos devuelve y no filtrar información sensible al cliente."
  - id: limits
    point: "Considera rate limiting e idempotencia para acciones costosas o que crean recursos."
followUps:
  - "¿Next.js protege las Server Actions contra CSRF?"
  - "¿Cómo compartís la lógica de autorización entre acciones y Route Handlers?"
commonMistakes:
  - "Confiar en que ocultar el botón impide ejecutar la acción."
  - "Recibir el userId como argumento en lugar de leerlo de la sesión."
relatedLessons: ["nextjs.data-mutations", "nodejs.auth-security"]
relatedPatterns: []
---

Una Server Action se expone como un **endpoint POST** con un ID. Que el botón no aparezca para cierto usuario no impide
que alguien la invoque con otra request. Por eso cada acción se trata como una API pública:

```ts
"use server";
export async function deleteProject(projectId: unknown) {
  const user = await requireUser(); // 1. autenticación (desde la sesión, nunca un argumento)
  const id = z.string().uuid().parse(projectId); // 2. validación
  const project = await projects.findById(id);
  if (!project || project.ownerId !== user.id) throw new Error("No encontrado"); // 3. autorización
  await projects.delete(id);
  revalidatePath("/projects");
}
```

- La identidad sale de la **sesión**, nunca de un parámetro.
- Los argumentos se **validan**: TypeScript no valida en runtime.
- Lo que devuelve la acción viaja al cliente: no devolver objetos completos con datos internos.
- Next.js compara el `Origin` con el host para mitigar **CSRF** en Server Actions, pero eso no reemplaza la autorización.
- Para acciones costosas, **rate limiting**; para acciones que crean recursos, **idempotencia**.

Lo ideal es que la acción sea delgada y delegue en un caso de uso que ya aplica autorización, el mismo que usaría un
Route Handler.
