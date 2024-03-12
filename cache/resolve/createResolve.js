/**
 * createResolve.js
 * A dump of the listings table (listings_dump.json) must be present
 * Generates linking_map.json, which maps crosslistings to their primary 
 * listing ids
 * Usage: node createResolve.js
 */

import fs from "fs";

const dir = "coursedata";
const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
fs.writeFileSync("resolve/full_cross.json", "");
fs.writeFileSync("resolve/linking_map.json", "");

//----------------------------------------------------------------------
// Map
//----------------------------------------------------------------------

const crossDump = [];
for (let i = 0; i < files.length; i++) {
    const data = JSON.parse(fs.readFileSync(`${dir}/${files[i]}`));
    for (let j = 0; j < data.length; j++) {
        const crosslisting = data[j].crosslistings;
        if (crosslisting.length > 0) {
            if (!crosslisting.includes("NFO")) {
                crossDump.push(crosslisting);
            }
        } else {
            console.error("No crosslisting found for", data[j].course);
        }
    }
}
crossDump.sort((a, b) => a.localeCompare(b));
fs.writeFileSync("resolve/cross_dump.json", JSON.stringify(crossDump, null, 4));

//----------------------------------------------------------------------
// Reduce
//----------------------------------------------------------------------

// Add space in 1000-level courses
for (let i = 0; i < crossDump.length; i++) {
    if (crossDump[i][3] !== " ") {
        crossDump[i] = crossDump[i].slice(0, 3) + " " + crossDump[i].slice(3);
    }
}

// Reduce each primary listing into 1 entry with all crosslistings
const crossReduced = [];
for (let i = 0; i < crossDump.length; i++) {
    const primary = crossDump[i].split(" / ")[0];
    let crosslistings = [];
    crosslistings.push(crossDump[i].split(" / ").slice(1));

    while (crossDump[i + 1] && crossDump[i + 1].startsWith(primary)) {
        const next = crossDump[i + 1];
        if (next.includes("/")) {
            crosslistings.push(next.split(" / ").slice(1));
        } else if (next.includes(",")) {
            crosslistings.push(next.split(",").slice(1));
        }
        i++;
    }

    if (crosslistings.length > 1) {
        crosslistings = [...new Set(crosslistings.flat())]
        crosslistings.sort().join(" / ");
        crossReduced.push(primary + " / " + crosslistings.join(" / "));
    } else {
        crossReduced.push(primary);
    }
}

// Test for duplicates
const crossSet = new Set(crossReduced);
if (crossSet.size !== crossReduced.length) {
    console.error("Duplicates found in full_cross.json");
}

const crossMap = {};
for (let i = 0; i < crossReduced.length; i++) {
    const split = crossReduced[i].split(" / ");
    if (split.length > 1) {
        for (let cross of split.slice(1)) {
            crossMap[cross] = split[0];
        }
    }
    crossMap[split[0]] = split[0];
}

fs.writeFileSync("resolve/cross_map.json", JSON.stringify(crossMap, null, 4));
fs.writeFileSync("resolve/full_cross.json", JSON.stringify(crossReduced, null, 4));

//----------------------------------------------------------------------
// Create Linking Table
//----------------------------------------------------------------------

const listingDump = JSON.parse(fs.readFileSync("resolve/listings_dump.json"));
listingDump.sort((a, b) => a.code.localeCompare(b.code));

const linkingMap = {};
for (let i = 0; i < crossReduced.length; i++) {
    const codes = crossReduced[i].split(" / ");
    for (let j = 0; j < codes.length; j++) {
        const primary = crossMap[codes[j]];
        if (!primary) {
            console.error("No primary found for", codes[j]);
        }

        let listingIndex = listingDump.findIndex(x => x.code === primary);
        if (listingIndex === -1) {
            console.error("No listing found for", primary);
        }

        let listingIds = [];
        while (listingDump[listingIndex] && listingDump[listingIndex].code === primary) {
            listingIds.push(listingDump[listingIndex].id);
            listingIndex++;
        }

        linkingMap[codes[j]] = listingIds;
    }
}

fs.writeFileSync("resolve/linking_map.json", JSON.stringify(linkingMap, null, 4));