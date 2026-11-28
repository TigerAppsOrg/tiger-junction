import { callGateway, requireNetid } from "$lib/server/stellic";
import { json, type RequestHandler } from "@sveltejs/kit";

/**
 * Sign in to CAS as the signed-in user and send their Duo push.
 * The password is forwarded once and never stored.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    const auth = await requireNetid(locals);
    if ("error" in auth) return auth.error;

    const { password } = await request.json().catch(() => ({}));
    if (typeof password !== "string" || password.length === 0) {
        return json({ error: "Password is required" }, { status: 400 });
    }

    return callGateway("/connect/start", {
        method: "POST",
        body: { netid: auth.netid, password }
    });
};
