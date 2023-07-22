import type { ParamMatcher } from "@sveltejs/kit";
import { CATEGORIES } from "$lib/constants";

export const match: ParamMatcher = (param: string) => {
    return CATEGORIES.includes(param);
}