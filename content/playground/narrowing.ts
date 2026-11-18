// title: Uniones discriminadas y narrowing
// description: El compilador estrecha tipos con el discriminante. Probá agregar un caso sin manejarlo.

type CollectionEvent =
  | { type: "paid"; amountCents: number }
  | { type: "promised"; dueDate: string }
  | { type: "refused"; reason: string };

function describeEvent(event: CollectionEvent): string {
  switch (event.type) {
    case "paid":
      return `Pagó $${(event.amountCents / 100).toFixed(2)}`;
    case "promised":
      return `Prometió pagar el ${event.dueDate}`;
    case "refused":
      return `Rechazó: ${event.reason}`;
    default: {
      // Si agregás un tipo nuevo a la unión y no lo manejás, esta línea no compila.
      const unreachable: never = event;
      return unreachable;
    }
  }
}

const events: CollectionEvent[] = [
  { type: "promised", dueDate: "2026-03-15" },
  { type: "paid", amountCents: 150050 },
  { type: "refused", reason: "monto en disputa" },
];

events.map(describeEvent).forEach((line) => console.log(line));
