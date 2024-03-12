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
                crossDump.push({
                    code: crosslisting,
                    id: data[j].course_id,
                    term: parseInt(data[j].term),
                });
            }
        } else {
            console.error("No crosslisting found for", data[j].course);
        }
    }
}
crossDump.sort((a, b) => a.code.localeCompare(b.code));
fs.writeFileSync("resolve/cross_dump.json", JSON.stringify(crossDump, null, 2));

//----------------------------------------------------------------------
// Reduce
//----------------------------------------------------------------------

// Add space in 1000-level courses
for (let i = 0; i < crossDump.length; i++) {
    if (crossDump[i].code[3] !== " ") {
        crossDump[i].code = crossDump[i].code.slice(0, 3) 
            + " " + crossDump[i].code.slice(3);
    }
}

// Reduce each primary listing into 1 entry with all crosslistings
const crossReduced = [];
for (let i = 0; i < crossDump.length; i++) {
    const primary = crossDump[i].code.split(" / ")[0];
    let crosslistings = [];
    crosslistings.push(crossDump[i].code.split(" / ").slice(1));

    while (crossDump[i + 1] && crossDump[i + 1].code.startsWith(primary)) {
        const next = crossDump[i + 1].code;
        if (next.includes("/")) {
            crosslistings.push(next.split(" / ").slice(1));
        } else if (next.includes(",")) {
            crosslistings.push(next.split(",").slice(1));
        }
        i++;
    }

    if (crosslistings.length > 1) {
        crosslistings = [...new Set(crosslistings.flat())]
        crosslistings.sort();
        crossReduced.push({
            code: primary,
            prev_code: [],
            id: crossDump[i].id,
            term: crossDump[i].term,
            cross: [...crosslistings],
        });
    } else {
        crossReduced.push({
            code: primary,
            prev_code: [],
            id: crossDump[i].id,
            term: crossDump[i].term,
            cross: [],
        });
    }
}

// Test for duplicates
const crossSet = new Set(crossReduced);
if (crossSet.size !== crossReduced.length) {
    console.error("Duplicates found in full_cross.json");
}

// Reduce crossReduced to unique id entries
crossReduced.sort((a, b) => a.id.localeCompare(b.id));
for (let i = 0; i < crossReduced.length - 1; i++) {
    while (crossReduced[i].id === crossReduced[i + 1].id) {
        if (crossReduced[i].term > crossReduced[i + 1].term) {
            crossReduced[i].prev_code.push({
                code: crossReduced[i + 1].code,
                term: crossReduced[i + 1].term,
            });
            crossReduced.splice(i + 1, 1);
        } else if (crossReduced[i].term < crossReduced[i + 1].term) {
            crossReduced[i + 1].prev_code.push({
                code: crossReduced[i].code,
                term: crossReduced[i].term,
            });
            crossReduced.splice(i, 1);
        } else {
            console.error("Duplicate id and term found");
        }
    }
}

fs.writeFileSync("resolve/cross_reduced.json", JSON.stringify(crossReduced, null, 4));
process.exit(0);

//----------------------------------------------------------------------
// Create Linking Table
//----------------------------------------------------------------------

// fs.writeFileSync("resolve/cross_table.json", JSON.stringify(crossMap, null, 4));


// const crossMap = {};
// for (let i = 0; i < crossReduced.length; i++) {
//     const split = crossReduced[i].split(" / ");
//     if (split.length > 1) {
//         for (let cross of split.slice(1)) {
//             crossMap[cross] = split[0];
//         }
//     }
//     crossMap[split[0]] = split[0];
// }

// const listingDump = JSON.parse(fs.readFileSync("resolve/listings_dump.json"));
// listingDump.sort((a, b) => a.code.localeCompare(b.code));

// const linkingMap = {};
// for (let i = 0; i < crossReduced.length; i++) {
//     const codes = crossReduced[i].split(" / ");
//     for (let j = 0; j < codes.length; j++) {
//         const primary = crossMap[codes[j]];
//         if (!primary) {
//             console.error("No primary found for", codes[j]);
//         }

//         let listingIndex = listingDump.findIndex(x => x.code === primary);
//         if (listingIndex === -1) {
//             console.error("No listing found for", primary);
//         }

//         let listingIds = [];
//         while (listingDump[listingIndex] && listingDump[listingIndex].code === primary) {
//             listingIds.push(listingDump[listingIndex].id);
//             listingIndex++;
//         }

//         linkingMap[codes[j]] = listingIds;
//     }
// }

// fs.writeFileSync("resolve/linking_map.json", JSON.stringify(linkingMap, null, 4));