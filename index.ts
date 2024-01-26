import { readFileSync, existsSync } from "fs";
import { parseFile } from "./src/parser";

const path = process.argv.pop();
if (path && existsSync(path)) {
    const bytes = readFileSync(path);
    const file = parseFile(bytes);
    console.log("done!", file.header);
}
else {
    console.error("You need to provide a valid filepath");
}
