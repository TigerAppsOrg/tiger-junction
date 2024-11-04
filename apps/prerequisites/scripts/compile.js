/**
 * compile.js
 * Compiles the prerequisites data.
 * Usage: node compile.js <earliest-term>
 */

import reformat from "./reformat.js";
import add from "./add.js";
import link from "./link.js";
import assemble from "./assemble.js";
import { TERM_MAP } from "./shared.js";

const args = process.argv.slice(2);

if (!reformat()) {
    console.error("Reformat failed");
    process.exit(1);
}

Object.keys(TERM_MAP)
    .sort((a, b) => b.localeCompare(a))
    .forEach(term => {
        if (!add(term)) {
            console.error("Add failed for term: " + term);
            process.exit(1);
        }
    });

// link();
// assemble();
