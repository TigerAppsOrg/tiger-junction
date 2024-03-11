import fs from "fs";

const dir = "coursedata";
const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
fs.writeFileSync("resolve/full_cross.json", "");

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

fs.writeFileSync("resolve/full_cross.json", JSON.stringify(crossReduced, null, 4));