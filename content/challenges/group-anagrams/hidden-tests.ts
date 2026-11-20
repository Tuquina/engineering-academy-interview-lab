import { groupAnagrams } from "./solution";

test(
  "el string vacío es un anagrama válido",
  () => {
    expect(groupAnagrams(["", ""])).toEqual([["", ""]]);
  },
  { category: "edge-cases" },
);

test(
  "conserva palabras repetidas en el mismo grupo",
  () => {
    expect(groupAnagrams(["ab", "ba", "ab"])).toEqual([["ab", "ba", "ab"]]);
  },
  { category: "edge-cases" },
);

test(
  "mismas letras con distinta frecuencia no son anagramas",
  () => {
    expect(groupAnagrams(["aab", "abb", "bab"])).toEqual([["aab"], ["abb", "bab"]]);
  },
  { category: "edge-cases" },
);

test(
  "agrupa 10.000 palabras rápido",
  () => {
    const words = Array.from({ length: 10_000 }, (_, i) => (i % 2 ? "listen" : "silent"));
    const groups = groupAnagrams(words);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(10_000);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
