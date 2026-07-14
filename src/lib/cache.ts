class MemoryCache {
  private cache = new Map<string, { value: unknown; expiry: number }>();

  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs: number = 60_000): void {
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Also clean up expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

export const cache = new MemoryCache();
