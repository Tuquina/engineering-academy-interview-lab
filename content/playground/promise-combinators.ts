// title: Combinadores de Promises
// description: Compará all, allSettled, race y any con operaciones que fallan.

const delay = <T>(ms: number, value: T, fail = false) =>
  new Promise<T>((resolve, reject) =>
    setTimeout(() => (fail ? reject(new Error(`falló ${String(value)}`)) : resolve(value)), ms),
  );

async function main() {
  const tasks = () => [delay(30, "reserva"), delay(10, "clima", true), delay(20, "tarifas")];

  try {
    console.log("all:", await Promise.all(tasks()));
  } catch (error) {
    console.log("all rechazó con:", (error as Error).message);
  }

  const settled = await Promise.allSettled(tasks());
  console.log(
    "allSettled:",
    settled.map((r) => r.status),
  );

  try {
    console.log("race:", await Promise.race(tasks()));
  } catch (error) {
    console.log("race rechazó con:", (error as Error).message);
  }

  console.log("any:", await Promise.any(tasks()));
}

main();
