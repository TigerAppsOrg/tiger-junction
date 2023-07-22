import type { ParamMatcher } from "@sveltejs/kit";

export const match: ParamMatcher = (param: string) => {
    const VALID_PARAMS = ["courses", "certificates"];
    return VALID_PARAMS.includes(param);
}