export default function link() {
    console.log("Linking...");
}

if (process.argv[1].includes("link.js")) {
    link();
}