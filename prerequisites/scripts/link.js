/**
 * link.js
 * Usage: node link.js
 */

/**
 * @returns {boolean} True if successful, false otherwise
 */
export default function link() {
    console.log("Linking...");
}

if (process.argv[1].includes("link.js")) {
    link();
}