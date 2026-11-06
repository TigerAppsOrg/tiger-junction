import { dev } from "$app/environment";
import { REDIS_PASSWORD } from "$env/static/private";
import type { Cookies } from "@sveltejs/kit";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "redis";
import type { LoginState } from "./auth";

/**
 * Keeps a half-finished Stellic login (push sent, not yet approved) between
 * the two requests of the login flow.
 *
 * The state holds live Princeton/Duo cookies, so it is encrypted with a key
 * that exists only in the student's httpOnly cookie: the stored blob alone
 * cannot be read. It expires after a few minutes.
 *
 * Production runs on Lambda, where memory does not survive between requests,
 * so it goes to Redis. `npm run dev` keeps it in memory instead, so local
 * testing never writes login state to the shared Redis.
 */

const COOKIE = "stellic_login";
const COOKIE_PATH = "/api/client/stellic/login";
const TTL_SECONDS = 180;

const memory = new Map<string, { blob: string; expires: number }>();

async function withRedis<T>(
    fn: (r: ReturnType<typeof createClient>) => Promise<T>
) {
    const redis = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: "redis-10705.c12.us-east-1-4.ec2.cloud.redislabs.com",
            port: 10705
        }
    });
    redis.on("error", err => console.error("Redis Client Error", err?.message));
    await redis.connect();
    try {
        return await fn(redis);
    } finally {
        await redis.disconnect();
    }
}

async function put(id: string, blob: string) {
    if (dev) {
        memory.set(id, { blob, expires: Date.now() + TTL_SECONDS * 1000 });
        return;
    }
    await withRedis(r =>
        r.set(`stellic-login:${id}`, blob, { EX: TTL_SECONDS })
    );
}

async function get(id: string): Promise<string | null> {
    if (dev) {
        const hit = memory.get(id);
        if (!hit || hit.expires < Date.now()) {
            memory.delete(id);
            return null;
        }
        return hit.blob;
    }
    return withRedis(r => r.get(`stellic-login:${id}`));
}

async function del(id: string) {
    if (dev) {
        memory.delete(id);
        return;
    }
    await withRedis(r => r.del(`stellic-login:${id}`));
}

function encrypt(state: LoginState, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const data = Buffer.concat([
        cipher.update(JSON.stringify(state), "utf8"),
        cipher.final()
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

function decrypt(blob: string, key: Buffer): LoginState {
    const raw = Buffer.from(blob, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = Buffer.concat([
        decipher.update(raw.subarray(28)),
        decipher.final()
    ]);
    return JSON.parse(data.toString("utf8"));
}

function readCookie(cookies: Cookies): { id: string; key: Buffer } | null {
    const [id, key] = (cookies.get(COOKIE) ?? "").split(".");
    if (!/^[0-9a-f]{32}$/.test(id ?? "") || !key) return null;
    const k = Buffer.from(key, "base64url");
    return k.length === 32 ? { id, key: k } : null;
}

/** Save (or replace) the in-progress login for this browser. */
export async function saveLogin(cookies: Cookies, state: LoginState) {
    const existing = readCookie(cookies);
    const id = existing?.id ?? randomBytes(16).toString("hex");
    const key = existing?.key ?? randomBytes(32);
    await put(id, encrypt(state, key));
    cookies.set(COOKIE, `${id}.${key.toString("base64url")}`, {
        path: COOKIE_PATH,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: TTL_SECONDS
    });
}

/** The in-progress login for this browser, or null if there is none / it expired. */
export async function loadLogin(cookies: Cookies): Promise<LoginState | null> {
    const c = readCookie(cookies);
    if (!c) return null;
    const blob = await get(c.id);
    if (!blob) return null;
    try {
        return decrypt(blob, c.key);
    } catch {
        return null;
    }
}

export async function clearLogin(cookies: Cookies) {
    const c = readCookie(cookies);
    if (c) await del(c.id);
    cookies.delete(COOKIE, { path: COOKIE_PATH });
}
