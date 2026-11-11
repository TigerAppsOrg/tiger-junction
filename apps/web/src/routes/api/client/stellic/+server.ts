import { callGateway, requireNetid } from "$lib/server/stellic";
import { json, type RequestHandler } from "@sveltejs/kit";

/**
 * Stellic connection status for the signed-in user.
 */
export const GET: RequestHandler = async ({ locals }) => {
    const auth = await requireNetid(locals);
    if ("error" in auth) return auth.error;

    const res = await callGateway(
        `/connect/${encodeURIComponent(auth.netid)}/status`,
        { method: "GET" }
    );
    // Never connected: report it as a status rather than an error.
    if (res.status === 404) {
        return json({ netid: auth.netid, status: "not_connected" });
    }
    return res;
};

/**
 * Disconnect the signed-in user's Stellic account.
 */
export const DELETE: RequestHandler = async ({ locals }) => {
    const auth = await requireNetid(locals);
    if ("error" in auth) return auth.error;

    return callGateway(`/connect/${encodeURIComponent(auth.netid)}`, {
        method: "DELETE"
    });
};
