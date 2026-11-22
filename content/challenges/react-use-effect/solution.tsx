import { useEffect, useState } from "react";

export interface Order {
  id: string;
  label: string;
}

export interface CustomerOrdersProps {
  customerId: string;
  fetchOrders: (customerId: string) => Promise<Order[]>;
}

/** Lista los pedidos de un cliente. Ignora respuestas de clientes anteriores. */
export function CustomerOrders({ customerId, fetchOrders }: CustomerOrdersProps) {
  // Se guarda junto a los datos el cliente al que pertenecen: así el "cargando" se deriva sin un estado extra.
  const [state, setState] = useState<{ customerId: string; orders: Order[] } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchOrders(customerId).then((orders) => {
      if (!ignore) setState({ customerId, orders });
    });
    // La limpieza corre antes del próximo efecto (o al desmontar): la respuesta en vuelo queda obsoleta.
    return () => {
      ignore = true;
    };
  }, [customerId, fetchOrders]);

  if (!state || state.customerId !== customerId) return <p>Cargando…</p>;
  return (
    <ul>
      {state.orders.map((order) => (
        <li key={order.id}>{order.label}</li>
      ))}
    </ul>
  );
}

const DELAYS: Record<string, number> = { ana: 1500, bruno: 300 };

/** API falsa para el preview: Ana responde lento y Bruno rápido. */
function fakeFetchOrders(customerId: string): Promise<Order[]> {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve([{ id: `${customerId}-1`, label: `Pedido de ${customerId}` }]),
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
      <CustomerOrders customerId={customerId} fetchOrders={fakeFetchOrders} />
    </main>
  );
}
