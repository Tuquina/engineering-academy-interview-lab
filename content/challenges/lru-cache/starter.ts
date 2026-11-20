/** Caché de capacidad fija que descarta la clave usada hace más tiempo. */
export class LRUCache<K, V> {
  private readonly entries = new Map<K, V>();

  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    // Problema: leer no actualiza el orden de uso.
    return this.entries.get(key);
  }

  put(key: K, value: V): void {
    // Problema: descarta la clave insertada primero, no la usada hace más tiempo.
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value as K;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
