import { json, type RequestHandler } from "@sveltejs/kit";
import { startLogin, StellicLoginError } from "$lib/server/stellic/auth";
import { clearLogin, saveLogin } from "$lib/server/stellic/loginStore";

/**
 * POST /api/client/stellic/login   { netid, password }
 * Signs in to Princeton CAS and sends a Duo Push.
 * 200 { device, code }   code = Duo's verification code to show, or null
 * 400 { error }          e.g. wrong password, no Duo Push device
 *
 * The password is used for this one request and never stored or logged.
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user)
        return json({ error: "Not signed in to Junction" }, { status: 401 });

    let body: { netid?: unknown; password?: unknown };
    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid request" }, { status: 400 });
    }
    const netid =
        typeof body.netid === "string" ? body.netid.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9]{2,16}$/.test(netid) || !password) {
        return json(
            { error: "Enter your NetID and password." },
            { status: 400 }
        );
    }

    try {
        await clearLogin(cookies);
        const { device, code, state } = await startLogin(netid, password);
        await saveLogin(cookies, state);
        return json({ device, code });
    } catch (e) {
        if (e instanceof StellicLoginError) {
            return json({ error: e.message }, { status: 400 });
        }
        console.error(
            "Stellic login start failed:",
            e instanceof Error ? e.name : e
        );
        return json(
            { error: "Could not reach Princeton login" },
            { status: 502 }
        );
    }
};
