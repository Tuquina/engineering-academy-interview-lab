/**
 * Orden en el que se pueden cursar las `n` materias respetando las correlativas (`[a, b]`: `b` antes que `a`),
 * o `null` si hay un ciclo.
 */
export function findOrder(n: number, prerequisites: readonly (readonly [number, number])[]): number[] | null {
  const dependents: number[][] = Array.from({ length: n }, () => []);
  const inDegree = new Array<number>(n).fill(0);
  for (const [course, required] of prerequisites) {
    dependents[required]!.push(course); // arista required → course
    inDegree[course] = inDegree[course]! + 1;
  }

  // Algoritmo de Kahn: empezar por las materias sin correlativas pendientes.
  const queue: number[] = [];
  for (let course = 0; course < n; course++) if (inDegree[course] === 0) queue.push(course);

  const order: number[] = [];
  for (let head = 0; head < queue.length; head++) {
    const course = queue[head]!;
    order.push(course);
    for (const next of dependents[course]!) {
      inDegree[next] = inDegree[next]! - 1;
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  // Si faltan materias, quedaron atrapadas en un ciclo (nunca llegaron a grado de entrada 0).
  return order.length === n ? order : null;
}
