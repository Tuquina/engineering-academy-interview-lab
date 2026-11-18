import { act, render } from "@testing-library/react";
import { CustomerDebts, type Debt } from "./App";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** API falsa con demoras por cliente; registra las llamadas. */
function fakeApi(delays: Record<string, number>) {
  const calls: string[] = [];
  const fetchDebts = (customerId: string) => {
    calls.push(customerId);
    return new Promise<Debt[]>((resolve) =>
      setTimeout(
        () => resolve([{ id: `${customerId}-1`, label: `Deuda de ${customerId}` }]),
        delays[customerId] ?? 10,
      ),
    );
  };
  return { calls, fetchDebts };
}

test("muestra las deudas del cliente", async () => {
  const api = fakeApi({ ana: 10 });
  const view = render(<CustomerDebts customerId="ana" fetchDebts={api.fetchDebts} />);
  await act(() => wait(40));
  expect(view.getByText("Deuda de ana").textContent).toBe("Deuda de ana");
  view.unmount();
});

test("vuelve a cargar cuando cambia el cliente", async () => {
  const api = fakeApi({ ana: 10, bruno: 10 });
  const view = render(<CustomerDebts customerId="ana" fetchDebts={api.fetchDebts} />);
  await act(() => wait(40));
  view.rerender(<CustomerDebts customerId="bruno" fetchDebts={api.fetchDebts} />);
  await act(() => wait(40));
  expect(api.calls).toEqual(["ana", "bruno"]);
  expect(view.getByText("Deuda de bruno").textContent).toBe("Deuda de bruno");
  view.unmount();
});

test("una respuesta lenta del cliente anterior no reemplaza a la actual", async () => {
  const api = fakeApi({ ana: 80, bruno: 10 });
  const view = render(<CustomerDebts customerId="ana" fetchDebts={api.fetchDebts} />);
  view.rerender(<CustomerDebts customerId="bruno" fetchDebts={api.fetchDebts} />);
  await act(() => wait(150));
  expect(view.queryByText("Deuda de ana")).toBe(null);
  expect(view.getByText("Deuda de bruno").textContent).toBe("Deuda de bruno");
  view.unmount();
});

test("muestra «Cargando…» mientras espera al cliente nuevo", async () => {
  const api = fakeApi({ ana: 10, bruno: 60 });
  const view = render(<CustomerDebts customerId="ana" fetchDebts={api.fetchDebts} />);
  await act(() => wait(40));
  view.rerender(<CustomerDebts customerId="bruno" fetchDebts={api.fetchDebts} />);
  await act(() => wait(10));
  expect(view.getByText("Cargando…").textContent).toBe("Cargando…");
  view.unmount();
});
