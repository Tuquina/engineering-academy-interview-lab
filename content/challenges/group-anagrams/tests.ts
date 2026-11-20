import { groupAnagrams } from "./solution";

test("agrupa los anagramas en el orden de aparición", () => {
  expect(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])).toEqual([
    ["eat", "tea", "ate"],
    ["tan", "nat"],
    ["bat"],
  ]);
});

test("una palabra sola forma su propio grupo", () => {
  expect(groupAnagrams(["a"])).toEqual([["a"]]);
});

test("la lista vacía devuelve una lista vacía", () => {
  expect(groupAnagrams([])).toEqual([]);
});
