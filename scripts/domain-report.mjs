// Reporte de distribución de dominios de los ejemplos en las lecciones (docs/plans/dominios-variados.md).
//
// Uso (en Docker):  docker compose run --rm --no-deps app node scripts/domain-report.mjs [curso...]
//
// Cuenta, por lección, términos característicos de cada dominio (sin contar bloques de referencias del frontmatter)
// y resume por curso: cuántos dominios aparecen y qué porcentaje de las menciones se lleva cada uno. Marca los cursos
// que no cumplen las reglas del plan: menos de 5 dominios o un dominio por encima del 30 %.
// Es una heurística para revisar la variedad, no una medida exacta.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Términos en español (texto) y en inglés (identificadores del código). En inglés se aceptan sufijos (CartItem,
// shipmentId) porque los identificadores suelen combinar palabras.
const DOMAINS = {
  "e-commerce":
    /\b(producto|productos|carrito|cat[aá]logo|cup[oó]n|devoluci[oó]n|checkout|sku|stock)\b|\b(cart|coupon|product|sku)\w*/gi,
  pagos:
    /\b(pago|pagos|reembolso|billetera|saldo|transferencia|ledger|cobro|cobros)\b|\b(payment|refund|wallet|ledger)\w*/gi,
  logística:
    /\b(env[ií]o|env[ií]os|transportista|seguimiento|dep[oó]sito|despacho)\b|\b(shipment|carrier|tracking)\w*/gi,
  reservas:
    /\b(reserva|reservas|habitaci[oó]n|estad[ií]a|asiento|asientos|hu[eé]sped)\b|\b(booking|room|guest|seat)\w*/gi,
  mensajería:
    /\b(mensaje|mensajes|chat|notificaci[oó]n|notificaciones|plantilla)\b|\b(notification|notifier|template)\w*/gi,
  contenido:
    /\b(post|posts|feed|seguidor|seguidores|comentario|comentarios|video|videos)\b|\b(follower|feed)\w*/gi,
  saas: /\b(tenant|tenants|organizaci[oó]n|suscripci[oó]n|suscripciones|factura|facturas)\b|\b(tenant|organization|subscription|invoice)\w*/gi,
  educación:
    /\b(inscripci[oó]n|inscripciones|alumno|alumnos|calificaci[oó]n|certificado|estudiante|estudiantes|materia|materias)\b|\b(student|enrollment|grade|assignment|exam)\w*/gi,
  salud:
    /\b(paciente|pacientes|historia cl[ií]nica|m[eé]dico|m[eé]dica|consultorio|turno m[eé]dico)\b|\b(patient|appointment|consultation)\w*/gi,
  movilidad:
    /\b(viaje|viajes|conductor|conductores|flota|pasajero|pasajeros)\b|\b(trip|driver|passenger|fare)\w*/gi,
  iot: /\b(sensor|sensores|dispositivo|dispositivos|telemetr[ií]a)\b|\b(sensor|telemetry|reading)\w*/gi,
  juegos:
    /\b(partida|partidas|ranking|matchmaking|jugador|jugadores)\b|\b(player|leaderboard|matchmaking)\w*/gi,
  soporte: /\b(ticket|tickets|sla|escalamiento|soporte al cliente)\b|\b(ticket)\w*/gi,
  cobranzas:
    /\b(deuda(?!\s+t[eé]cnica)|deudas|deudor|deudores|cobranza|cobranzas|promesa de pago|promesas de pago|mora)\b|\b(debt|debtor|promisedFor)\w*/gi,
};

const MIN_DOMAINS = 5;
const MAX_SHARE = 0.3;

function stripFrontmatterReferences(source) {
  // Las referencias y metadatos no son ejemplos: se cuenta sólo el cuerpo y las preguntas.
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return source;
  const front = match[1].replace(/references:[\s\S]*?(?=\n[a-zA-Z]+:)/, "");
  return `${front}\n${match[2]}`;
}

function countDomains(text) {
  const counts = {};
  for (const [domain, pattern] of Object.entries(DOMAINS)) {
    counts[domain] = (text.match(pattern) ?? []).length;
  }
  return counts;
}

const root = path.resolve(import.meta.dirname, "..", "content", "courses");
const only = process.argv.slice(2);
const courses = (await readdir(root)).filter((c) => only.length === 0 || only.includes(c)).sort();
let failing = 0;

for (const course of courses) {
  const dir = path.join(root, course, "lessons");
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".mdx")).sort();
  } catch {
    continue;
  }
  const total = {};
  console.log(`\n## ${course}`);
  for (const file of files) {
    const counts = countDomains(stripFrontmatterReferences(await readFile(path.join(dir, file), "utf8")));
    const top = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    for (const [d, n] of top) total[d] = (total[d] ?? 0) + n;
    const lead = top[0] ? `${top[0][0]} (${top[0][1]})` : "—";
    const rest = top
      .slice(1, 4)
      .map(([d, n]) => `${d} ${n}`)
      .join(", ");
    console.log(`- ${file}: conductor ${lead}${rest ? ` · también ${rest}` : ""}`);
  }
  const sum = Object.values(total).reduce((a, b) => a + b, 0);
  const shares = Object.entries(total)
    .map(([d, n]) => [d, n / (sum || 1)])
    .sort((a, b) => b[1] - a[1]);
  const present = shares.filter(([, s]) => s >= 0.02).length;
  const [maxDomain, maxShare] = shares[0] ?? ["—", 0];
  const ok = present >= MIN_DOMAINS && maxShare <= MAX_SHARE;
  if (!ok) failing++;
  console.log(
    `Resumen: ${present} dominios con presencia; el mayor es ${maxDomain} con ${(maxShare * 100).toFixed(0)} % · ${ok ? "OK" : "NO CUMPLE"}`,
  );
  console.log(
    `Distribución: ${shares
      .slice(0, 8)
      .map(([d, s]) => `${d} ${(s * 100).toFixed(0)} %`)
      .join(", ")}`,
  );
}

console.log(`\nCursos que no cumplen las reglas: ${failing}`);
