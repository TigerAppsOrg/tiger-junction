import { CURRENT_TERM_NAME, CURRENT_TERM_ID, TERM_MAP } from "../constants";

/**
 * Converts a term id to a term name, or returns the current term name
 * @param id 
 */
const convertIdToTerm = (id: string | null) => {
    if (id) return Object.keys(TERM_MAP).find(key => 
        TERM_MAP[key as keyof typeof TERM_MAP] === id) 
        ?? CURRENT_TERM_NAME;
    else return CURRENT_TERM_NAME;
}

/**
 * Converts a term name to a term id, or returns the current term id
 * @param term 
 */
const convertTermToId = (term: string | null) => {
    if (term) return TERM_MAP[term as keyof typeof TERM_MAP] 
    ?? CURRENT_TERM_ID;
    else return CURRENT_TERM_ID;
}

export { convertIdToTerm, convertTermToId };