---
id: iq.auth-sessions-jwt
format: deep-dive
question: "¿Sesiones en servidor o JWT para autenticar una aplicación web? Explicá los compromisos."
expectedPoints:
  - id: session
    point: "Sesión en servidor: token opaco en cookie y estado en una base o Redis; revocación inmediata, requiere almacenamiento compartido."
  - id: jwt
    point: "JWT: token firmado autocontenido que se valida sin consultar la base; no se puede revocar antes de expirar sin una lista negra."
  - id: storage
    point: "En navegador, cookie HttpOnly + Secure + SameSite en ambos casos; evitar localStorage por XSS."
  - id: refresh
    point: "Con JWT: access token corto y refresh token rotado y revocable."
  - id: csrf
    point: "Con cookies hay que considerar CSRF (SameSite, verificación de origen o tokens)."
followUps:
  - "¿Cómo cerrás la sesión de un usuario en todos sus dispositivos?"
  - "¿Qué datos pondrías dentro de un JWT?"
commonMistakes:
  - "Guardar el JWT en localStorage."
  - 'Elegir JWT "porque escala" sin necesitar autenticación entre varios servicios.'
relatedLessons: ["nodejs.auth-security"]
relatedPatterns: []
---

**Sesiones en servidor**: al iniciar sesión genero un token aleatorio, lo guardo (hasheado) en la base o Redis con el
usuario y la expiración, y lo envío en una cookie `HttpOnly; Secure; SameSite=Lax`. En cada request busco la sesión.
Ventajas: **revocación inmediata** (cerrar sesión, cambio de contraseña, cerrar en todos los dispositivos), token
opaco sin datos. Costo: una consulta por request (barata con índice o caché) y almacenamiento compartido entre
instancias.

**JWT**: un token firmado que contiene los claims; cualquier servicio con la clave pública lo valida **sin consultar la
base**. Útil entre varios servicios o con proveedores de identidad. El problema es la **revocación**: un JWT robado vale
hasta que expira. Por eso se usan access tokens cortos (5–15 min) y **refresh tokens** guardados en servidor, rotados y
revocables, con lo cual se vuelve a tener estado.

En ambos casos, en un navegador el token va en una **cookie `HttpOnly`** (no accesible desde JavaScript) y no en
`localStorage`, que cualquier XSS puede leer. Con cookies hay que cubrir **CSRF**: `SameSite`, verificar `Origin` en
métodos que modifican y, si hace falta, tokens anti-CSRF.

Para una aplicación web con un backend propio, sesiones en servidor son lo más simple y seguro. JWT tiene sentido cuando
varios servicios o terceros necesitan validar identidad sin una consulta central.
