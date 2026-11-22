import { act, render } from "@testing-library/react";
import { CustomerOrders, type Order } from "./App";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** API falsa con demoras por cliente; registra las llamadas. */
function fakeApi(delays: Record<string, number>) {
  const calls: string[] = [];
  const fetchOrders = (customerId: string) => {
    calls.push(customerId);
    return new Promise<Order[]>((resolve) =>
      setTimeout(
        () => resolve([{ id: `${customerId}-1`, label: `Pedido de ${customerId}` }]),
        delays[customerId] ?? 10,
      ),
    );
  };
  return { calls, fetchOrders };
}

test("muestra los pedidos del cliente", async () => {
  const api = fakeApi({ ana: 10 });
  const view = render(<CustomerOrders customerId="ana" fetchOrders={api.fetchOrders} />);
  await act(() => wait(40));
  expect(view.getByText("Pedido de ana").textContent).toBe("Pedido de ana");
  view.unmount();
});

test("vuelve a cargar cuando cambia el cliente", async () => {
  const api = fakeApi({ ana: 10, bruno: 10 });
  const view = render(<CustomerOrders customerId="ana" fetchOrders={api.fetchOrders} />);
  await act(() => wait(40));
  view.rerender(<CustomerOrders customerId="bruno" fetchOrders={api.fetchOrders} />);
  await act(() => wait(40));
  expect(api.calls).toEqual(["ana", "bruno"]);
  expect(view.getByText("Pedido de bruno").textContent).toBe("Pedido de bruno");
  view.unmount();
});

test("una respuesta lenta del cliente anterior no reemplaza a la actual", async () => {
  const api = fakeApi({ ana: 80, bruno: 10 });
  const view = render(<CustomerOrders customerId="ana" fetchOrders={api.fetchOrders} />);
  view.rerender(<CustomerOrders customerId="bruno" fetchOrders={api.fetchOrders} />);
  await act(() => wait(150));
  expect(view.queryByText("Pedido de ana")).toBe(null);
  expect(view.getByText("Pedido de bruno").textContent).toBe("Pedido de bruno");
  view.unmount();
});

test("muestra «Cargando…» mientras espera al cliente nuevo", async () => {
  const api = fakeApi({ ana: 10, bruno: 60 });
  const view = render(<CustomerOrders customerId="ana" fetchOrders={api.fetchOrders} />);
  await act(() => wait(40));
  view.rerender(<CustomerOrders customerId="bruno" fetchOrders={api.fetchOrders} />);
  await act(() => wait(10));
  expect(view.getByText("Cargando…").textContent).toBe("Cargando…");
  view.unmount();
});
