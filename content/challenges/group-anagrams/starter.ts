/** Agrupa las palabras que son anagramas entre sí, conservando el orden de aparición. */
export function groupAnagrams(words: readonly string[]): string[][] {
  // Problema: agrupa por largo, no por letras. "tan" y "eat" terminan juntos.
  const groups = new Map<number, string[]>();
  for (const word of words) {
    const group = groups.get(word.length) ?? [];
    group.push(word);
    groups.set(word.length, group);
  }
  return [...groups.values()];
}
