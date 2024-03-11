import fs from "fs";

const dir = "../coursedata";
const files = fs.readdirSync(dir);
console.log(files);