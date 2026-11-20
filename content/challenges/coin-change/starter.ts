/** Mínima cantidad de monedas que suman exactamente `amount`, o -1 si no es posible. */
export function coinChange(coins: readonly number[], amount: number): number {
  // Greedy: tomar siempre la moneda más grande posible. No siempre da el óptimo.
  const sorted = [...coins].sort((a, b) => b - a);
  let remaining = amount;
  let count = 0;
  for (const coin of sorted) {
    const take = Math.floor(remaining / coin);
    count += take;
    remaining -= take * coin;
  }
  return remaining === 0 ? count : -1;
}
