/** Indica si los paréntesis de `s` están balanceados y bien anidados. */
export function isValid(s: string): boolean {
  // Contar aperturas y cierres no alcanza: "([)]" tiene la misma cantidad de cada tipo y es inválido.
  let open = 0;
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") open++;
    else open--;
  }
  return open === 0;
}
