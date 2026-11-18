import { InsufficientFundsError, PaymentService, type BalanceRepository } from "./solution";

/** Repositorio en memoria con latencia, como una base de datos. */
function repository(
  initial: Record<string, number>,
): BalanceRepository & { balances: Record<string, number> } {
  const balances = { ...initial };
  return {
    balances,
    async getBalance(accountId) {
      await sleep(10);
      return balances[accountId] ?? 0;
    },
    async setBalance(accountId, balance) {
      await sleep(10);
      balances[accountId] = balance;
    },
  };
}

test("un cobro con saldo suficiente descuenta y devuelve el saldo nuevo", async () => {
  const repo = repository({ acc_1: 100 });
  const service = new PaymentService(repo);
  expect(await service.charge("acc_1", 30)).toBe(70);
  expect(repo.balances.acc_1).toBe(70);
});

test("un cobro sin saldo rechaza y no modifica el saldo", async () => {
  const repo = repository({ acc_1: 50 });
  const service = new PaymentService(repo);
  await expect(service.charge("acc_1", 80)).rejects.toThrow("Saldo insuficiente");
  expect(repo.balances.acc_1).toBe(50);
});

test(
  "dos cobros simultáneos no dejan la cuenta en negativo",
  async () => {
    const repo = repository({ acc_1: 100 });
    const service = new PaymentService(repo);
    const results = await Promise.allSettled([service.charge("acc_1", 70), service.charge("acc_1", 70)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason instanceof InsufficientFundsError).toBe(true);
    expect(repo.balances.acc_1).toBe(30);
  },
  { category: "concurrency" },
);
