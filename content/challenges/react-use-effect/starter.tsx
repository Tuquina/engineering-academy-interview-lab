import { useEffect, useState } from "react";

export interface Order {
  id: string;
  label: string;
}

export interface CustomerOrdersProps {
  customerId: string;
  fetchOrders: (customerId: string) => Promise<Order[]>;
}

/** Lista los pedidos de un cliente. */
export function CustomerOrders({ customerId, fetchOrders }: CustomerOrdersProps) {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    fetchOrders(customerId).then(setOrders);
  }, []);

  if (!orders) return <p>Cargando…</p>;
  return (
    <ul>
      {orders.map((order) => (
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
