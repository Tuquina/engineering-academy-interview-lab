---
id: iq.server-components
format: deep-dive
question: "¿Cuándo usarías Server Components y cuándo Client Components en Next.js?"
expectedPoints:
  - id: default-server
    point: "En el App Router los componentes son de servidor por defecto: se renderizan en el servidor y no envían su JavaScript al cliente."
  - id: server-use
    point: "Server Components para leer datos directamente (base, APIs con secretos), contenido estático y reducir el bundle."
  - id: client-use
    point: "Client Components ('use client') para estado, efectos, eventos, APIs del navegador e interactividad."
  - id: boundary
    point: "Mantener los Client Components en las hojas y pasar datos serializables como props; un Server Component puede ir como children de uno de cliente."
  - id: security
    point: "Los secretos y la lógica sensible quedan en el servidor; lo que se pasa como props a un Client Component llega al navegador."
followUps:
  - "¿Qué se puede y qué no se puede pasar como props de un Server Component a uno de cliente?"
  - "¿Qué diferencia hay entre un Server Component y una Server Action?"
commonMistakes:
  - "Marcar un layout entero con 'use client' por un solo botón interactivo."
  - "Pasar objetos con datos sensibles completos como props a un Client Component."
relatedLessons: []
---

En el App Router, los componentes son **Server Components por defecto**: se ejecutan en el servidor (en build o por
request), pueden leer datos directamente con `await` y su código **no se envía** al navegador. Son ideales para
páginas de contenido, listados, lectura de la base o de APIs con credenciales, y para reducir el JavaScript del
cliente.

Un **Client Component** (`"use client"`) se necesita cuando hay estado (`useState`), efectos, manejadores de
eventos, APIs del navegador (`localStorage`, geolocalización) o librerías que dependen de ellas. También se
renderiza en el servidor para el HTML inicial, pero se hidrata y envía su código.

La práctica recomendada es **empujar los Client Components hacia las hojas**: la página y el layout en el servidor,
y sólo el botón, el formulario o el gráfico interactivo en el cliente. Las props que cruzan la frontera deben ser
serializables, y todo lo que se pasa **llega al navegador**: hay que enviar sólo lo necesario, nunca secretos.
