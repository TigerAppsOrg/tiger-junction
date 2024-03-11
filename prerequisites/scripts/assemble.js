/**
 * assemble.js
 * Usage: node assemble.js
 */

/**
 * @returns {boolean} True if successful, false otherwise
 */
export default function assemble() {
    console.log("Assembling...");
}

if (process.argv[1].includes("assemble.js")) {
    assemble();
}