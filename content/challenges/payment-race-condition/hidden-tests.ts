import { PaymentService, type BalanceRepository } from "./solution";

function repository(initial: Record<string, number>, options: { failOnce?: boolean } = {}) {
  const balances: Record<string, number> = { ...initial };
  let failed = false;
  const repo: BalanceRepository = {
    async getBalance(accountId) {
      await sleep(10);
      return balances[accountId] ?? 0;
    },
    async setBalance(accountId, balance) {
      await sleep(10);
      if (options.failOnce && !failed) {
        failed = true;
        throw new Error("conexión perdida");
      }
      balances[accountId] = balance;
    },
  };
  return { repo, balances };
}

test(
  "muchos cobros concurrentes dejan el saldo exacto",
  async () => {
    const { repo, balances } = repository({ acc: 1000 });
    const service = new PaymentService(repo);
    await Promise.all(Array.from({ length: 10 }, () => service.charge("acc", 25)));
    expect(balances.acc).toBe(750);
  },
  { category: "concurrency" },
);

test(
  "cobros sobre cuentas distintas corren en paralelo",
  async () => {
    const { repo } = repository({ a: 100, b: 100, c: 100, d: 100 });
    const service = new PaymentService(repo);
    const start = Date.now();
    await Promise.all(["a", "b", "c", "d"].map((id) => service.charge(id, 10)));
    // Cada cobro tarda ~20 ms; en serie serían ~80 ms.
    expect(Date.now() - start).toBeLessThan(55);
  },
  { category: "concurrency" },
);

test(
  "un error inesperado no deja la cuenta bloqueada",
  async () => {
    const { repo, balances } = repository({ acc: 100 }, { failOnce: true });
    const service = new PaymentService(repo);
    await expect(service.charge("acc", 10)).rejects.toThrow("conexión perdida");
    expect(await service.charge("acc", 10)).toBe(90);
    expect(balances.acc).toBe(90);
  },
  { category: "robustness" },
);

test(
  "después de un cobro rechazado, los siguientes siguen funcionando",
  async () => {
    const { repo, balances } = repository({ acc: 50 });
    const service = new PaymentService(repo);
    const results = await Promise.allSettled([
      service.charge("acc", 40),
      service.charge("acc", 40),
      service.charge("acc", 10),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
    expect(balances.acc).toBe(0);
  },
  { category: "edge-cases" },
);
