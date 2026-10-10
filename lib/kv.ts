/**
 * Storage adapter supporting Vercel KV / Upstash Redis with In-Memory fallback.
 * Uses REST API directly via fetch to remain dependency-free and edge-friendly.
 */

interface StorageInterface {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  sadd(setKey: string, member: string): Promise<void>;
  sismember(setKey: string, member: string): Promise<boolean>;
  smembers(setKey: string): Promise<string[]>;
}

// In-Memory cache fallback for local development or when KV env vars are absent
class MemoryStorage implements StorageInterface {
  private cache = new Map<string, { val: any; expiresAt?: number }>();
  private sets = new Map<string, Set<string>>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.val as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.cache.set(key, { val: value, expiresAt });
  }

  async sadd(setKey: string, member: string): Promise<void> {
    if (!this.sets.has(setKey)) this.sets.set(setKey, new Set());
    this.sets.get(setKey)!.add(member);
  }

  async sismember(setKey: string, member: string): Promise<boolean> {
    return this.sets.get(setKey)?.has(member) || false;
  }

  async smembers(setKey: string): Promise<string[]> {
    return Array.from(this.sets.get(setKey) || []);
  }
}

// REST KV client for Vercel KV or Upstash Redis
class RestKVStorage implements StorageInterface {
  private url: string;
  private token: string;
  private fallback = new MemoryStorage();

  constructor(url: string, token: string) {
    this.url = (url || '').replace(/\/$/, '').trim();
    this.token = (token || '').replace(/^["']|["']$/g, '').trim();
  }

  private async execute(command: string, ...args: any[]): Promise<any> {
    try {
      const res = await fetch(`${this.url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([command, ...args]),
      });
      if (!res.ok) throw new Error(`KV Error ${res.status}`);
      const data = await res.json();
      return data.result;
    } catch (err) {
      console.warn(`[KV] REST call failed (${command}), falling back to memory:`, err);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const res = await this.execute('GET', key);
    if (res === null || res === undefined) {
      return this.fallback.get<T>(key);
    }
    try {
      return typeof res === 'string' ? JSON.parse(res) : res;
    } catch {
      return res as T;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (ttlSeconds) {
      await this.execute('SET', key, serialized, 'EX', ttlSeconds);
    } else {
      await this.execute('SET', key, serialized);
    }
    await this.fallback.set(key, value, ttlSeconds);
  }

  async sadd(setKey: string, member: string): Promise<void> {
    await this.execute('SADD', setKey, member);
    await this.fallback.sadd(setKey, member);
  }

  async sismember(setKey: string, member: string): Promise<boolean> {
    const res = await this.execute('SISMEMBER', setKey, member);
    if (res === null || res === undefined) {
      return this.fallback.sismember(setKey, member);
    }
    return res === 1;
  }

  async smembers(setKey: string): Promise<string[]> {
    const res = await this.execute('SMEMBERS', setKey);
    if (!res || !Array.isArray(res)) {
      return this.fallback.smembers(setKey);
    }
    return res;
  }
}

const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const kv: StorageInterface =
  kvUrl && kvToken ? new RestKVStorage(kvUrl, kvToken) : new MemoryStorage();
