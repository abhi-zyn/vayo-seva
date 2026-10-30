// Tiny in-memory cache to save free-tier quota. It lives per server instance
// (each Vercel function instance has its own) and is lost on restart: fine here.

export function createCache<V>(maxEntries: number) {
  const map = new Map<string, V>();
  return {
    get(key: string): V | undefined {
      const v = map.get(key);
      if (v !== undefined) {
        // Re-insert so Map order tracks recency (oldest first).
        map.delete(key);
        map.set(key, v);
      }
      return v;
    },
    set(key: string, value: V): void {
      map.set(key, value);
      if (map.size > maxEntries) map.delete(map.keys().next().value as string);
    },
  };
}

/** Lowercase, drop punctuation, collapse spaces, so trivially different questions share a cache entry. */
export function normalizeQuestion(q: string): string {
  return q
    .normalize("NFC")
    .toLowerCase()
    .replace(/[?!.,;:'"()\-।]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
