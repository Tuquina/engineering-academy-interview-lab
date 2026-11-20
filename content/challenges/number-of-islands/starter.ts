/** Cantidad de islas (grupos de "1" conectados en horizontal o vertical) en la grilla. */
export function numIslands(grid: readonly (readonly string[])[]): number {
  // Problema: cuenta celdas de tierra, no grupos conectados.
  let count = 0;
  for (const row of grid) for (const cell of row) if (cell === "1") count++;
  return count;
}
