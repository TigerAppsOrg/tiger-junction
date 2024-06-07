/**
 * assemble.js
 * Usage: node assemble.js <options>
 */

/**
 * Assembles the data into a single JSON file according to options
 * @param {object} options (see README for details)
 * @returns {boolean} True if successful, false otherwise
 */
export default function assemble(options) {
    console.log("Assembling...");
}

if (process.argv[1].includes("assemble.js")) {
    assemble();
}
