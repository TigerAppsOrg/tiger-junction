import { json, type RequestHandler } from "@sveltejs/kit";
import { finishLogin, StellicLoginError } from "$lib/server/stellic/auth";
import {
    clearLogin,
    loadLogin,
    saveLogin
} from "$lib/server/stellic/loginStore";
import { setStellicSession } from "$lib/server/stellic/session";

/**
 * POST /api/client/stellic/login/finish
 * Waits (up to ~20 s) for the Duo Push to be approved. The page calls it in a loop.
 * 200 { status: "pending" }   not approved yet: call again
 * 200 { status: "done" }      signed in; the Stellic session is now saved
 * 400 { error }               denied, expired, or no login in progress
 */
export const POST: RequestHandler = async ({ cookies, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user)
        return json({ error: "Not signed in to Junction" }, { status: 401 });

    const state = await loadLogin(cookies);
    if (!state) {
        return json(
            { error: "Your login timed out. Please start again." },
            { status: 400 }
        );
    }

    try {
        const result = await finishLogin(state);
        if (result.status === "pending") {
            await saveLogin(cookies, result.state);
            return json({ status: "pending" });
        }
        await clearLogin(cookies);
        setStellicSession(cookies, result.session);
        return json({ status: "done" });
    } catch (e) {
        await clearLogin(cookies);
        if (e instanceof StellicLoginError) {
            return json({ error: e.message }, { status: 400 });
        }
        console.error(
            "Stellic login finish failed:",
            e instanceof Error ? e.name : e
        );
        return json({ error: "Could not finish the login" }, { status: 502 });
    }
};
