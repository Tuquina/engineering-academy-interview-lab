interface Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}

/**
 * Caché de capacidad fija que descarta la clave usada hace más tiempo.
 * Hash map (clave → nodo) + lista doblemente enlazada (orden de uso): `get` y `put` en O(1).
 */
export class LRUCache<K, V> {
  private readonly nodes = new Map<K, Node<K, V>>();
  /** Más reciente. */
  private head: Node<K, V> | null = null;
  /** Menos reciente (la próxima en descartarse). */
  private tail: Node<K, V> | null = null;

  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const node = this.nodes.get(key);
    if (!node) return undefined;
    this.moveToFront(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.nodes.get(key);
    if (existing) {
      existing.value = value;
      this.moveToFront(existing);
      return;
    }
    const node: Node<K, V> = { key, value, prev: null, next: null };
    this.nodes.set(key, node);
    this.addToFront(node);
    if (this.nodes.size > this.capacity && this.tail) {
      const evicted = this.tail;
      this.unlink(evicted);
      this.nodes.delete(evicted.key);
    }
  }

  get size(): number {
    return this.nodes.size;
  }

  private addToFront(node: Node<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private unlink(node: Node<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  private moveToFront(node: Node<K, V>): void {
    if (this.head === node) return;
    this.unlink(node);
    this.addToFront(node);
  }
}
