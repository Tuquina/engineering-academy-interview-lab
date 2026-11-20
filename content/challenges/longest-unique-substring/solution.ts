/** Longitud de la subcadena contigua más larga de `s` sin caracteres repetidos. */
export function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>(); // carácter → última posición
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right]!;
    const previous = lastSeen.get(ch);
    // Sólo importa si la aparición anterior está dentro de la ventana actual.
    if (previous !== undefined && previous >= left) left = previous + 1;
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
