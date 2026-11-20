/** Mínima cantidad de monedas que suman exactamente `amount`, o -1 si no es posible. */
export function coinChange(coins: readonly number[], amount: number): number {
  // dp[a] = mínima cantidad de monedas para sumar exactamente a (Infinity si no se puede).
  const dp = new Array<number>(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin]! + 1 < dp[a]!) dp[a] = dp[a - coin]! + 1;
    }
  }
  return Number.isFinite(dp[amount]) ? dp[amount]! : -1;
}
