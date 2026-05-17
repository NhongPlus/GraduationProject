const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../src/db/migrations");
const dest = path.join(__dirname, "../dist/db/migrations");

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[build] copied migrations -> ${dest}`);
