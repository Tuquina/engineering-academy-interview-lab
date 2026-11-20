/** Los `k` valores más frecuentes de `nums` (mayor frecuencia primero; empate: menor valor primero). */
export function topKFrequent(nums: readonly number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);

  // Bucket sort: buckets[f] = valores que aparecen exactamente f veces (f va de 1 a n).
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, frequency] of counts) buckets[frequency]!.push(value);

  const result: number[] = [];
  for (let f = buckets.length - 1; f > 0 && result.length < k; f--) {
    const bucket = buckets[f]!;
    if (bucket.length === 0) continue;
    bucket.sort((a, b) => a - b); // desempate: menor valor primero
    for (const value of bucket) {
      if (result.length === k) break;
      result.push(value);
    }
  }
  return result;
}
