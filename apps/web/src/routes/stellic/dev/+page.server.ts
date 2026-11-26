import { dev } from "$app/environment";
import { error, fail, redirect } from "@sveltejs/kit";
import { setStellicSession } from "$lib/server/stellic/session";
import type { Actions, PageServerLoad } from "./$types";

/**
 * DEV ONLY: paste a Stellic session copied from Proxyman, so the export can be
 * tested before the real login flow is merged. 404s outside `npm run dev`.
 */
export const load: PageServerLoad = async () => {
    if (!dev) error(404, "Not found");
};

/** Only send people back to pages on this site. */
const safeReturnTo = (value: FormDataEntryValue | null) =>
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
        ? value
        : "/recalplus";

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        if (!dev) error(404, "Not found");

        const form = await request.formData();
        // People often copy "Cookie: ..." including the header name.
        const cookieHeader = String(form.get("cookieHeader") ?? "")
            .trim()
            .replace(/^cookie:\s*/i, "");
        const csrfToken = String(form.get("csrfToken") ?? "")
            .trim()
            .replace(/^x-csrftoken:\s*/i, "");

        if (!cookieHeader.includes("=") || csrfToken.length < 8) {
            return fail(400, {
                message:
                    "Paste both the Cookie header and the X-CSRFToken value."
            });
        }

        setStellicSession(cookies, { cookieHeader, csrfToken });
        redirect(303, safeReturnTo(form.get("returnTo")));
    }
};
