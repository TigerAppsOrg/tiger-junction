/**
 * @file cas.ts
 * @author Joshua Lau '26
 *
 * Provides a SvelteKit client for the CAS authentication system.
 * Based loosely on https://git.io/JRNLp
 * originally by Alex Halderman, Scott Karlin, Brian Kernighan, and Bob Dondero.
 */

import { redirect } from "@sveltejs/kit";
import type { SessionData } from "../../app";

export class CASClient {
    // URL of the service that the CAS server will redirect to
    private static APP_URL = "http://localhost:5173/auth/";

    // CAS server URL
    private static CAS_URL = "https://fed.princeton.edu/cas/";

    // URL-encode a string
    private static urlEncode(str: string): string {
        return encodeURIComponent(str).replace(/%20/g, "+");
    }

    // Check if an object has a key
    private static hasKey(obj: object, key: string): boolean {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    /**
     * Validate a login ticket by contacting the CAS server.
     * @param ticket The login ticket to validate
     * @returns The user's session data, or null if the ticket is invalid
     */
    static async validate(ticket: string): Promise<SessionData | null> {
        const valUrl =
            this.CAS_URL +
            "p3/serviceValidate?service=" +
            this.APP_URL +
            "&ticket=" +
            ticket +
            "&format=json";

        const response = await fetch(valUrl, {
            method: "GET",
            headers: {
                Accept: "text/plain"
            }
        });

        const resObj = await response.json();
        if (!resObj || !this.hasKey(resObj, "serviceResponse")) return null;
        const serviceResponse = resObj.serviceResponse;

        if (this.hasKey(serviceResponse, "authenticationSuccess")) {
            const userInfo = serviceResponse.authenticationSuccess;

            return {
                netid: userInfo.user,
                name: userInfo.attributes.displayname[0] || "Student",
                mail: userInfo.attributes.mail[0] || ""
            };
        } else if (this.hasKey(serviceResponse, "authenticationFailure")) {
            console.error("CAS authentication failure:", serviceResponse);
            return null;
        } else {
            console.error("Unexpected CAS response:", serviceResponse);
            return null;
        }
    }

    /**
     * Redirect the user to the CAS server for authentication.
     * @param req The request event
     * @returns The user's session data, or null if the user is not logged in
     */
    static authenticate() {
        throw redirect(
            302,
            this.CAS_URL + "login?service=" + this.urlEncode(this.APP_URL)
        );
    }

    /**
     * Log the user out and redirect to the landing page.
     * @param locals The request locals
     */
    static async logout(locals: App.Locals) {
        await locals.session.destroy();
        throw redirect(302, "/");
    }
}
