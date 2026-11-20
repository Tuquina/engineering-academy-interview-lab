const PAIRS: Readonly<Record<string, string>> = { ")": "(", "]": "[", "}": "{" };

/** Indica si los paréntesis de `s` están balanceados y bien anidados. */
export function isValid(s: string): boolean {
  const stack: string[] = [];
  for (const ch of s) {
    const opening = PAIRS[ch];
    if (opening === undefined) {
      stack.push(ch); // es una apertura
    } else if (stack.pop() !== opening) {
      return false; // pila vacía o tipo distinto
    }
  }
  return stack.length === 0;
}
