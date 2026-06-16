import { readFileSync, writeFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;
const minAppVersion = "1.0.0";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
manifest.version = version;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[version] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(`Bumped to ${version}`);
