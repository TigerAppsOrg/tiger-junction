import { httpCodes } from "$lib/httpCodes";
import { redirect } from "@sveltejs/kit";

export const load = async () => {
    redirect(httpCodes.redirection.temporaryRedirect, "/");
};
