/**
 * createResolve.js
 * A dump of the listings table (listings_dump.json) must be present
 * Generates linking_map.json, which maps crosslistings to their primary
 * listing ids
 * Usage: node createResolve.js
 */

import fs from "fs";

const dir = "coursedata";
const files = fs.readdirSync(dir).filter(file => file.endsWith(".json"));

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
                    term: parseInt(data[j].term)
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
        crossDump[i].code =
            crossDump[i].code.slice(0, 3) + " " + crossDump[i].code.slice(3);
    }
}

// Reduce each primary listing into 1 entry with all crosslistings
const crossReduced = [];
for (let i = 0; i < crossDump.length; i++) {
    const primary = crossDump[i].code.split(" / ")[0];
    let crosslistings = [];
    crosslistings.push(crossDump[i].code.split(" / ").slice(1));

    while (
        crossDump[i + 1] &&
        crossDump[i + 1].code.split(" / ")[0] === primary
    ) {
        const next = crossDump[i + 1].code;
        if (next.includes("/")) {
            crosslistings.push(next.split(" / ").slice(1));
        } else if (next.includes(",")) {
            crosslistings.push(next.split(",").slice(1));
        }
        i++;
    }

    if (crosslistings.length > 1) {
        crosslistings = [...new Set(crosslistings.flat())];
        crosslistings.sort();
        crossReduced.push({
            code: primary,
            prev_code: [],
            id: crossDump[i].id,
            term: crossDump[i].term,
            cross: [...crosslistings]
        });
    } else {
        crossReduced.push({
            code: primary,
            prev_code: [],
            id: crossDump[i].id,
            term: crossDump[i].term,
            cross: []
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
                term: crossReduced[i + 1].term
            });
            crossReduced[i].cross.push(...crossReduced[i + 1].cross);
            crossReduced.splice(i + 1, 1);
        } else if (crossReduced[i].term < crossReduced[i + 1].term) {
            crossReduced[i + 1].prev_code.push({
                code: crossReduced[i].code,
                term: crossReduced[i].term
            });
            crossReduced[i + 1].cross.push(...crossReduced[i].cross);
            crossReduced.splice(i, 1);
        } else {
            console.error("Duplicate id and term found");
        }
    }
    crossReduced[i].cross = [...new Set(crossReduced[i].cross)].sort();
}

crossReduced.sort((a, b) => a.code.localeCompare(b.code));
fs.writeFileSync(
    "resolve/cross_reduced.json",
    JSON.stringify(crossReduced, null, 2)
);

//----------------------------------------------------------------------
// Create Cross Table
//----------------------------------------------------------------------

const crossTable = {};
for (let i = 0; i < crossReduced.length; i++) {
    const answer = {
        code: crossReduced[i].code,
        id: crossReduced[i].id
    };

    crossTable[crossReduced[i].code] = answer;
    for (let j = 0; j < crossReduced[i].cross.length; j++) {
        crossTable[crossReduced[i].cross[j]] = answer;
    }
    for (let j = 0; j < crossReduced[i].prev_code.length; j++) {
        crossTable[crossReduced[i].prev_code[j].code] = answer;
    }
}

// Test for duplicate keys
const crosstableSet = new Set(Object.keys(crossTable));
if (crosstableSet.size !== Object.keys(crossTable).length) {
    console.error("Duplicates found in cross table");
}

fs.writeFileSync(
    "resolve/cross_table.json",
    JSON.stringify(crossTable, null, 2)
);
