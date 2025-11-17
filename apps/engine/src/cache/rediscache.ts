import { createClient, RedisClientType } from "redis";

type RedisValue = string | Buffer | object | number | boolean | null;

/**
 * Simple OOP Redis cache wrapper using node-redis.
 * - Default TTLs are 24 hours (86400 seconds).
 * - Uses `REDIS_URL` environment variable by default.
 * - Stores values as JSON for objects; preserves strings/buffers.
 */
export default class RedisCache {
    private client?: RedisClientType;
    private url?: string;
    private defaultTtlSeconds: number;

    constructor(opts?: { url?: string; defaultTtlSeconds?: number }) {
        this.url = opts?.url || process.env.REDIS_URL;
        this.defaultTtlSeconds = opts?.defaultTtlSeconds ?? 6 * 60 * 60; // 6 hours
    }

    async connect(): Promise<void> {
        if (this.client) return;
        if (!this.url) {
            throw new Error("REDIS_URL not configured; cannot connect to Redis");
        }

        this.client = createClient({ url: this.url });
        this.client.on("error", (err) => {
            // Avoid throwing inside the event handler; log instead.
            // Consumers can hook up monitoring as needed.
            // eslint-disable-next-line no-console
            console.error("Redis Client Error:", err);
        });

        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.quit();
        } finally {
            this.client = undefined;
        }
    }

    private ensureClient(): RedisClientType {
        if (!this.client) throw new Error("Redis client is not connected");
        return this.client;
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        const c = this.ensureClient();
        const raw = await c.get(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw) as T;
        } catch (_e) {
            // Not JSON — return raw as unknown
            return (raw as unknown) as T;
        }
    }

    async set(key: string, value: RedisValue, ttlSeconds?: number): Promise<void> {
        const c = this.ensureClient();
        let stored: string | Buffer;
        if (typeof value === "string" || value instanceof Buffer) {
            stored = value as string | Buffer;
        } else {
            stored = JSON.stringify(value);
        }

        const ttl = ttlSeconds ?? this.defaultTtlSeconds;
        if (ttl > 0) {
            await c.set(key, stored as string, { EX: ttl });
        } else {
            await c.set(key, stored as string);
        }
    }

    async del(key: string): Promise<number> {
        const c = this.ensureClient();
        return c.del(key);
    }

    async expire(key: string, seconds: number): Promise<boolean> {
        const c = this.ensureClient();
        return c.expire(key, seconds);
    }

    /**
     * Helper to fetch JSON from cache or compute and store it.
     * loader should return a JSON-serializable value.
     */
    async getOrSetJson<T>(key: string, loader: () => Promise<T>, ttlSeconds?: number): Promise<T> {
        const existing = await this.get<T>(key);
        if (existing !== null) return existing;
        const data = await loader();
        await this.set(key, data as unknown as RedisValue, ttlSeconds);
        return data;
    }
}

/*
Usage notes:
- Key patterns: `courses:all`, `courses:term:{term}`, `course:{courseId}:sections`.
- TTL defaults to 24 hours; override in constructor or per-set call.
- Configure `REDIS_URL` in environment (or pass `url` to constructor).
*/
