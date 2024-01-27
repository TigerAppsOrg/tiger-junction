import { TERM_MAP } from '$lib/changeme';

/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
    return Object.keys(TERM_MAP).map(x => parseInt(x)).includes(parseInt(param)) 
    || param === "all";
}