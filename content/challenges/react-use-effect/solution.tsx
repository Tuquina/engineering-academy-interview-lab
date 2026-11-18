import { useEffect, useState } from "react";

export interface Debt {
  id: string;
  label: string;
}

export interface CustomerDebtsProps {
  customerId: string;
  fetchDebts: (customerId: string) => Promise<Debt[]>;
}

/** Lista las deudas de un cliente. Ignora respuestas de clientes anteriores. */
export function CustomerDebts({ customerId, fetchDebts }: CustomerDebtsProps) {
  // Se guarda junto a los datos el cliente al que pertenecen: así el "cargando" se deriva sin un estado extra.
  const [state, setState] = useState<{ customerId: string; debts: Debt[] } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchDebts(customerId).then((debts) => {
      if (!ignore) setState({ customerId, debts });
    });
    // La limpieza corre antes del próximo efecto (o al desmontar): la respuesta en vuelo queda obsoleta.
    return () => {
      ignore = true;
    };
  }, [customerId, fetchDebts]);

  if (!state || state.customerId !== customerId) return <p>Cargando…</p>;
  return (
    <ul>
      {state.debts.map((debt) => (
        <li key={debt.id}>{debt.label}</li>
      ))}
    </ul>
  );
}

const DELAYS: Record<string, number> = { ana: 1500, bruno: 300 };

/** API falsa para el preview: Ana responde lento y Bruno rápido. */
function fakeFetchDebts(customerId: string): Promise<Debt[]> {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve([{ id: `${customerId}-1`, label: `Deuda de ${customerId}` }]),
      DELAYS[customerId] ?? 500,
    ),
  );
}

export default function App() {
  const [customerId, setCustomerId] = useState("ana");
  return (
    <main style={{ fontFamily: "system-ui", padding: 16 }}>
      <p>Cliente seleccionado: {customerId}</p>
      <button onClick={() => setCustomerId("ana")}>Ana (lenta)</button>{" "}
      <button onClick={() => setCustomerId("bruno")}>Bruno (rápido)</button>
      <CustomerDebts customerId={customerId} fetchDebts={fakeFetchDebts} />
    </main>
  );
}
