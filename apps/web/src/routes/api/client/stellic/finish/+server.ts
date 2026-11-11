import { callGateway, requireNetid } from "$lib/server/stellic";
import { json, type RequestHandler } from "@sveltejs/kit";

/**
 * Finish linking after the Duo push is approved. Responds 202 while the push
 * is still pending; the client calls again with the same token.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    const auth = await requireNetid(locals);
    if ("error" in auth) return auth.error;

    const { connectionToken } = await request.json().catch(() => ({}));
    if (typeof connectionToken !== "string" || connectionToken.length === 0) {
        return json({ error: "connectionToken is required" }, { status: 400 });
    }

    return callGateway("/connect/finish", {
        method: "POST",
        body: { connectionToken, netid: auth.netid }
    });
};
