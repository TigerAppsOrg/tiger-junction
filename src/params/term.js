import { TERM_MAP } from "$lib/constants";

/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
    return Object.values(TERM_MAP).includes(parseInt(param)) 
    || param === "all";
}