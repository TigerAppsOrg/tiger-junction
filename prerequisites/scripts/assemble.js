export default function assemble() {
    console.log("Assembling...");
}

if (process.argv[1].includes("assemble.js")) {
    assemble();
}