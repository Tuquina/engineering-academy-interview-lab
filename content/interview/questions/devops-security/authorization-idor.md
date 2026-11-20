---
id: iq.authorization-idor
format: deep-dive
question: "Un usuario cambia el ID en la URL y ve facturas de otro cliente. ¿Qué falló y cómo lo prevenís en todo el sistema?"
expectedPoints:
  - id: idor
    point: "Identifica un IDOR (control de acceso roto): se autenticó al usuario pero no se autorizó el acceso al recurso."
  - id: server-check
    point: "La verificación de pertenencia debe hacerse en el servidor en cada acceso, filtrando por el usuario o tenant de la sesión."
  - id: central
    point: "Centraliza la autorización (políticas o la capa de acceso a datos siempre filtra por tenant) en lugar de repetirla a mano en cada endpoint."
  - id: defense
    point: "Suma defensas en profundidad: RLS en la base, IDs no secuenciales y 404 en lugar de 403 para no revelar existencia."
  - id: tests
    point: "Agrega tests automáticos de autorización por endpoint (usuario A no puede leer recursos de B)."
followUps:
  - "¿Los IDs aleatorios (UUID) resuelven el problema?"
  - "¿Cómo auditarías el resto de los endpoints?"
commonMistakes:
  - "Confiar en que el frontend no muestra el enlace."
  - "Creer que usar UUIDs alcanza como control de acceso."
relatedLessons: ["nodejs.auth-security", "system-design.multi-tenant"]
relatedPatterns: []
---

Es un **IDOR** (Insecure Direct Object Reference), la forma más común de **control de acceso roto**, que encabeza el
OWASP Top 10. El sistema verificó **quién** es el usuario (autenticación) pero no **si puede ver ese recurso**
(autorización).

La corrección inmediata es que la consulta filtre por el dueño:

```sql
SELECT * FROM invoices WHERE id = $1 AND customer_id = $2; -- $2 sale de la sesión, nunca del request
```

Para que no vuelva a pasar en otro endpoint:

- **Centralizar**: un repositorio que siempre recibe el contexto del usuario/tenant y filtra, o una capa de políticas
  (`can(user, "read", invoice)`) obligatoria en los casos de uso.
- **Defensa en profundidad**: Row Level Security en PostgreSQL por tenant, para que un olvido en el código no exponga
  datos.
- Responder **404** en lugar de 403 cuando no corresponde revelar que el recurso existe.
- **IDs no secuenciales** dificultan enumerar, pero no son un control: un UUID filtrado en un log o un email sigue
  dando acceso si no se autoriza.
- **Tests de autorización** por endpoint y revisión de los existentes buscando parámetros de ID que lleguen a consultas
  sin filtro de dueño.
