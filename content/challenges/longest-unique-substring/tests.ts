import { lengthOfLongestSubstring } from "./solution";

test("encuentra la ventana al principio", () => {
  expect(lengthOfLongestSubstring("abcabcbb")).toBe(3);
});

test("todos iguales devuelve 1", () => {
  expect(lengthOfLongestSubstring("bbbbb")).toBe(1);
});

test("cuenta subcadenas contiguas, no subsecuencias", () => {
  expect(lengthOfLongestSubstring("pwwkew")).toBe(3);
});

test("el string vacío devuelve 0", () => {
  expect(lengthOfLongestSubstring("")).toBe(0);
});
