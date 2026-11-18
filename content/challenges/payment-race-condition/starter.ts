export interface BalanceRepository {
  getBalance(accountId: string): Promise<number>;
  setBalance(accountId: string, balance: number): Promise<void>;
}

export class InsufficientFundsError extends Error {
  constructor(readonly accountId: string) {
    super(`Saldo insuficiente en ${accountId}`);
    this.name = "InsufficientFundsError";
  }
}

export class PaymentService {
  constructor(private readonly repo: BalanceRepository) {}

  /**
   * Descuenta `amount` del saldo de la cuenta.
   * @returns el saldo resultante.
   * @throws {InsufficientFundsError} si el saldo no alcanza.
   */
  async charge(accountId: string, amount: number): Promise<number> {
    const balance = await this.repo.getBalance(accountId);
    if (balance < amount) throw new InsufficientFundsError(accountId);
    const next = balance - amount;
    await this.repo.setBalance(accountId, next);
    return next;
  }
}
