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

/**
 * Lock por clave: ejecuta las secciones críticas de una misma clave de a una, en orden de llegada,
 * y las de claves distintas en paralelo.
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<unknown>>();

  async runExclusive<T>(key: string, criticalSection: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    // Se espera a la anterior aunque haya fallado: un error no debe bloquear la cola.
    const current = previous.catch(() => undefined).then(criticalSection);
    const tail = current.catch(() => undefined);
    this.tails.set(key, tail);
    try {
      return await current;
    } finally {
      // Si nadie se encoló detrás, se libera la entrada para no acumular memoria.
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}

export class PaymentService {
  private readonly mutex = new KeyedMutex();

  constructor(private readonly repo: BalanceRepository) {}

  /**
   * Descuenta `amount` del saldo de la cuenta. Los cobros de una misma cuenta se serializan.
   * @returns el saldo resultante.
   * @throws {InsufficientFundsError} si el saldo no alcanza.
   */
  charge(accountId: string, amount: number): Promise<number> {
    return this.mutex.runExclusive(accountId, async () => {
      const balance = await this.repo.getBalance(accountId);
      if (balance < amount) throw new InsufficientFundsError(accountId);
      const next = balance - amount;
      await this.repo.setBalance(accountId, next);
      return next;
    });
  }
}
