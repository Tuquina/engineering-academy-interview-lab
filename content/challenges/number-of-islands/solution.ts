const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Cantidad de islas (grupos de "1" conectados en horizontal o vertical) en la grilla. */
export function numIslands(grid: readonly (readonly string[])[]): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const visited = new Uint8Array(rows * cols); // no se modifica la grilla
  let islands = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r]![c] !== "1" || visited[r * cols + c]) continue;
      islands++;
      // BFS con una cola sobre un array (índice de cabeza en lugar de shift, que es O(n)).
      const queue: number[] = [r * cols + c];
      visited[r * cols + c] = 1;
      for (let head = 0; head < queue.length; head++) {
        const cell = queue[head]!;
        const cr = Math.floor(cell / cols);
        const cc = cell % cols;
        for (const [dr, dc] of DIRECTIONS) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const index = nr * cols + nc;
          if (grid[nr]![nc] === "1" && !visited[index]) {
            visited[index] = 1; // marcar al encolar evita encolar dos veces
            queue.push(index);
          }
        }
      }
    }
  }
  return islands;
}
