/**
 * @file Server-side client for the Stellic gateway service.
 * The gateway trusts whatever netid it is given, so the netid is always
 * derived here from the signed-in user's Princeton email, never from the client.
 */

import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";

// Stay under the site's 10 s request limit, so a slow gateway call returns a
// clear error instead of the request being cut off.
const GATEWAY_TIMEOUT_MS = 8000;

/**
 * Netid of the signed-in user, or an error response to return as-is.
 */
export const requireNetid = async (
    locals: App.Locals
): Promise<{ netid: string } | { error: Response }> => {
    // Local testing without Supabase: act as a fixed netid. `dev` is false in
    // every production build, so this can never apply on the live site.
    if (dev && env.STELLIC_DEV_NETID) {
        return { netid: env.STELLIC_DEV_NETID.trim().toLowerCase() };
    }

    const {
        data: { user }
    } = await locals.supabase.auth.getUser();
    if (!user) {
        return { error: json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const match = /^([a-z0-9]+)@princeton\.edu$/i.exec(
        user.email?.trim() ?? ""
    );
    if (!match) {
        return {
            error: json(
                { error: "A Princeton account is required to link Stellic" },
                { status: 403 }
            )
        };
    }
    return { netid: match[1].toLowerCase() };
};

/**
 * Call the gateway and pass its JSON response through with the same status.
 */
export const callGateway = async (
    path: string,
    init: { method: string; body?: unknown }
): Promise<Response> => {
    if (!env.STELLIC_GATEWAY_URL || !env.STELLIC_GATEWAY_TOKEN) {
        return json(
            { error: "Stellic gateway is not configured" },
            { status: 500 }
        );
    }

    let upstream: Response;
    try {
        upstream = await fetch(`${env.STELLIC_GATEWAY_URL}${path}`, {
            method: init.method,
            headers: {
                authorization: `Bearer ${env.STELLIC_GATEWAY_TOKEN}`,
                ...(init.body !== undefined
                    ? { "content-type": "application/json" }
                    : {})
            },
            body:
                init.body !== undefined ? JSON.stringify(init.body) : undefined,
            signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS)
        });
    } catch (err) {
        if (err instanceof DOMException && err.name === "TimeoutError") {
            return json(
                { error: "Stellic is taking too long to respond" },
                { status: 504 }
            );
        }
        console.error("Stellic gateway unreachable:", err);
        return json(
            { error: "Stellic gateway is unreachable" },
            { status: 502 }
        );
    }

    const body = await upstream.json().catch(() => ({}));
    return json(body, { status: upstream.status });
};
