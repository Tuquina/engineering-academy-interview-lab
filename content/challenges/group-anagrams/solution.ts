/** Clave canónica: la frecuencia de cada letra (O(k), sin ordenar). */
function signature(word: string): string {
  const counts = new Array<number>(26).fill(0);
  for (let i = 0; i < word.length; i++) {
    const letter = word.charCodeAt(i) - 97;
    counts[letter] = (counts[letter] ?? 0) + 1;
  }
  return counts.join(",");
}

/** Agrupa las palabras que son anagramas entre sí, conservando el orden de aparición. */
export function groupAnagrams(words: readonly string[]): string[][] {
  const groups = new Map<string, string[]>(); // Map conserva el orden de inserción de las claves
  for (const word of words) {
    const key = signature(word);
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
}
