import { env } from "$env/dynamic/private";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, locals }) => {
    const {
        data: { user }
    } = await locals.supabase.auth.getUser();
    if (!user) {
        return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            { status: 401, headers: { "content-type": "application/json" } }
        );
    }

    const askGatewayUrl = env.ASK_GATEWAY_URL;
    const askGatewayToken = env.ASK_GATEWAY_TOKEN;

    if (!askGatewayUrl) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Ask gateway is not configured"
            }),
            { status: 500, headers: { "content-type": "application/json" } }
        );
    }

    const body = await request.json();
    const upstream = await fetch(`${askGatewayUrl}/ask/stream`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            accept: "text/event-stream",
            authorization: askGatewayToken
                ? `Bearer ${askGatewayToken}`
                : "",
            "x-external-user-id": user.id
        },
        body: JSON.stringify(body)
    });

    if (!upstream.ok || !upstream.body) {
        const fallback = await upstream.text();
        return new Response(
            JSON.stringify({
                success: false,
                error: fallback || "Ask gateway upstream request failed"
            }),
            { status: upstream.status || 502, headers: { "content-type": "application/json" } }
        );
    }

    return new Response(upstream.body, {
        status: upstream.status,
        headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache"
        }
    });
};
