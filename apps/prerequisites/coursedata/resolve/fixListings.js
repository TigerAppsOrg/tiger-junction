import fs from "fs";

const listingsDump = JSON.parse(fs.readFileSync("resolve/listings_dump.json"));

for (let i = 0; i < listingsDump.length; i++) {
    listingsDump[i].prev_code = null;
}
fs.writeFileSync(
    "resolve/listings_dump.json",
    JSON.stringify(listingsDump, null, 2)
);
