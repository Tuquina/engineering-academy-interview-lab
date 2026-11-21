import type { Metadata } from "next";
import Link from "next/link";
import { MemoryDemo } from "@/modules/agent-lab/presentation/memory-demo";
import { MermaidDiagram } from "@/modules/learning/presentation/mdx/mermaid-diagram";
import { StudyTimer } from "@/modules/progress/presentation/study-timer";

export const metadata: Metadata = { title: "Memoria de agentes" };

const SOURCES = [
  {
    name: "Memoria conversacional",
    what: "Hechos extraídos de lo que dijo la persona: preferencias, contexto, afirmaciones.",
    authority: "Baja: son afirmaciones. Personalizan el trato, no habilitan decisiones.",
    risk: "Desactualizarse o ser falsas; filtrar datos sensibles al prompt.",
  },
  {
    name: "Estado estructurado del negocio",
    what: "Pedidos, pagos, devoluciones, pedidos de no contacto: el sistema de registro.",
    authority: "Alta: es la verdad operativa. Las herramientas la leen y la modifican con reglas.",
    risk: "Leerlo tarde (caché vieja) o modificarlo sin validar.",
  },
  {
    name: "Historial de eventos",
    what: "Qué pasó y cuándo, en orden, sin borrar.",
    authority: "Alta para auditar y reconstruir; no se consulta para cada decisión.",
    risk: "Crecer sin límite; usarlo como si fuera el estado actual.",
  },
] as const;

export default function MemoryPage() {
  return (
    <div className="mx-auto max-w-[96rem]">
      <StudyTimer />
      <nav aria-label="Ruta de navegación" className="text-muted mb-2 text-sm">
        <Link href="/agents" className="hover:text-foreground">
          AI Agents Lab
        </Link>
      </nav>
      <header className="mb-5">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Memoria de agentes</h1>
        <p className="text-muted mt-1 max-w-3xl">
          Cómo un agente conserva contexto entre conversaciones sin confundir lo que alguien dijo con lo que
          realmente pasó. Avanzá día por día: el agente conversa con el proveedor local y el orquestador
          decide si contactar.
        </p>
      </header>

      <MemoryDemo />

      <section aria-labelledby="tres-fuentes" className="mt-10">
        <h2 id="tres-fuentes" className="text-foreground mb-3 text-xl font-semibold tracking-tight">
          Tres fuentes, tres niveles de autoridad
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Fuente</th>
                <th className="py-2 pr-3 font-medium">Qué guarda</th>
                <th className="py-2 pr-3 font-medium">Autoridad</th>
                <th className="py-2 font-medium">Riesgo típico</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.name} className="border-border border-t align-top">
                  <td className="text-foreground py-2 pr-3 font-medium">{s.name}</td>
                  <td className="text-muted py-2 pr-3">{s.what}</td>
                  <td className="text-muted py-2 pr-3">{s.authority}</td>
                  <td className="text-muted py-2">{s.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <MermaidDiagram
            caption="Resolución de conflictos: lo recordado nunca habilita algo que el sistema de registro prohíbe."
            chart={`
flowchart TD
  A[Hecho recordado] --> B{"¿Vencido o reemplazado?"}
  B -- Sí --> X[Se ignora para decidir]
  B -- No --> C{"¿Lo confirma el sistema de registro?"}
  C -- Sí --> D[Se usa]
  C -- No --> E{"¿Contradice el sistema?"}
  E -- Sí --> F[Gana el sistema; se marca la contradicción y se pide evidencia]
  E -- No --> G[Se usa sólo para personalizar el trato]
`}
          />
          <div className="text-muted space-y-3 text-sm">
            <h3 className="text-foreground font-semibold">Información contradictoria y desactualizada</h3>
            <p>
              <strong className="text-foreground">Cada hecho lleva fecha, fuente y vencimiento.</strong> Un
              retiro recordado vence con la fecha acordada; una afirmación de pago vence en días; una
              preferencia no vence, pero envejece y se marca como vieja.
            </p>
            <p>
              <strong className="text-foreground">
                Un hecho nuevo sobre el mismo tema reemplaza al anterior
              </strong>{" "}
              (se marca como reemplazado, no se borra: saber que cambió también es información).
            </p>
            <p>
              <strong className="text-foreground">Ante una contradicción gana el estado del negocio.</strong>{" "}
              Si la persona dice que pagó y no hay pago, no se despacha el pedido: se pide la referencia y se
              verifica con una herramienta.
            </p>
            <p>
              <strong className="text-foreground">
                La memoria va al prompt como contexto, no como instrucción
              </strong>
              , y sólo lo vigente: menos tokens y menos riesgo de que un dato viejo guíe la conversación.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
