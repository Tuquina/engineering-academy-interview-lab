// title: Orden del event loop
// description: Código síncrono, microtasks y timers. Anotá el orden que esperás antes de ejecutar.

console.log("A: síncrono");

setTimeout(() => console.log("B: setTimeout 0"), 0);

Promise.resolve()
  .then(() => console.log("C: primer then"))
  .then(() => console.log("D: then encadenado"));

queueMicrotask(() => console.log("E: queueMicrotask"));

(async () => {
  console.log("F: async, antes del await");
  await null;
  console.log("G: async, después del await");
})();

console.log("H: síncrono, al final");

// Pista: un then encadenado se agenda recién cuando termina el anterior,
// así que queda detrás de las microtasks que ya estaban en la cola.
