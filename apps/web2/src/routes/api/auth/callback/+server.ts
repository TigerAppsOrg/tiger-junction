/**
 * @file +server.ts (/api/auth/callback)
 * @author Joshua Lau '26
 *
 * Takes a CAS login ticket and validates it. If the ticket is valid, the user's session data is set.
 * Otherwise, the user is redirected to the CAS server.
 */

import { httpCodes } from "$lib/httpCodes";
import { CASClient } from "$lib/server/cas";
import {
    redirect,
    type RequestEvent,
    type RequestHandler
} from "@sveltejs/kit";

// Validate a CAS login ticket and set the user's session data
export const GET: RequestHandler = async (req: RequestEvent) => {
    const ticket = req.url.searchParams.get("ticket");
    if (!ticket) {
        CASClient.authenticate();
        return new Response("Redirecting to CAS server...", {
            status: httpCodes.redirection.seeOther
        });
    }

    const userInfo = await CASClient.validate(ticket);
    if (!userInfo) {
        console.error("CAS authentication failed");
        return new Response("CAS authentication failed", {
            status: httpCodes.error.unauthorized
        });
    }

    // const existingUser = db.getUser(userInfo.netid);
    // if (!existingUser) {
    //     await db.database.insert(schema.users).values(userInfo);
    // }

    await req.locals.session.set(userInfo);
    redirect(httpCodes.redirection.seeOther, "/home");
};
