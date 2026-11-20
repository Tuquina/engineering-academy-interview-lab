import { lengthOfLongestSubstring } from "./solution";

test(
  "no retrocede el borde izquierdo con una repetición vieja fuera de la ventana",
  () => {
    // Al llegar a la segunda "a", la "b" ya movió la ventana: la "a" anterior está fuera.
    expect(lengthOfLongestSubstring("abba")).toBe(2);
    expect(lengthOfLongestSubstring("tmmzuxt")).toBe(5);
  },
  { category: "edge-cases" },
);

test(
  "considera espacios y símbolos como caracteres",
  () => {
    expect(lengthOfLongestSubstring(" ")).toBe(1);
    expect(lengthOfLongestSubstring("a b!a")).toBe(4);
  },
  { category: "edge-cases" },
);

test(
  "el string completo sin repetidos",
  () => {
    expect(lengthOfLongestSubstring("abcdef")).toBe(6);
  },
  { category: "edge-cases" },
);

test(
  "resuelve 100.000 caracteres en tiempo lineal",
  () => {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const s = alphabet.repeat(Math.ceil(100_000 / alphabet.length)).slice(0, 100_000);
    expect(lengthOfLongestSubstring(s)).toBe(alphabet.length);
  },
  { category: "robustness", timeoutMs: 1_500 },
);
