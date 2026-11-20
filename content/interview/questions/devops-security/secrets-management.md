---
id: iq.secrets-management
format: quick
question: "¿Cómo manejás secretos (claves de API, contraseñas de base) en una aplicación?"
expectedPoints:
  - id: not-in-code
    point: "Nunca en el código ni en el repositorio; usa un archivo de ejemplo sin valores reales."
  - id: store
    point: "Los guarda en un gestor de secretos o en las variables cifradas de la plataforma, inyectados en tiempo de ejecución."
  - id: least
    point: "Aplica mínimo privilegio: credenciales distintas por entorno y servicio, con los permisos justos."
  - id: rotation
    point: "Prevé rotación y revocación, y credenciales de corta duración cuando se puede."
  - id: leak
    point: "Sabe qué hacer ante una filtración: revocar primero, después limpiar el historial y auditar el uso."
followUps:
  - "Alguien subió una clave a un repositorio público. ¿Qué hacés?"
  - "¿Qué diferencia hay entre una variable de entorno pública y una secreta en Next.js?"
commonMistakes:
  - "Creer que borrar el commit alcanza después de una filtración."
  - "Compartir la misma credencial de producción entre servicios y personas."
relatedLessons: ["nodejs.auth-security"]
relatedPatterns: []
---

Los secretos **no van en el código ni en el repositorio**. El repo tiene un `.env.example` sin valores reales y el
`.env` está en `.gitignore`.

En producción se guardan en un **gestor de secretos** (AWS Secrets Manager, GCP Secret Manager, Vault) o en las
variables cifradas de la plataforma (Vercel, GitHub Actions), y se inyectan en tiempo de ejecución.

Principios:

- **Mínimo privilegio**: una credencial por servicio y entorno, con sólo los permisos que necesita (por ejemplo, un rol
  de base dueño únicamente de sus tablas).
- **Rotación**: poder cambiar una credencial sin downtime; mejor aún, credenciales de corta duración (OIDC entre CI y
  la nube, tokens temporales).
- **No exponerlos**: ni en logs ni en el bundle del cliente. En Next.js sólo las variables con prefijo `NEXT_PUBLIC_`
  llegan al navegador; el resto queda en el servidor.

Ante una **filtración** el orden es: **revocar o rotar inmediatamente** (asumir que ya fue usada), revisar los logs de uso
de esa credencial, y recién después limpiar el historial del repo. Borrar el commit no alcanza: puede estar clonado o
cacheado. Herramientas como el secret scanning de GitHub ayudan a detectarlo antes.
