import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "manifest.json");

async function exists(relativePath) {
  const cleanPath = relativePath.replace(/^\//, "");
  try {
    await access(path.join(root, cleanPath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function addPath(target, value) {
  if (typeof value === "string" && value.trim()) target.add(value.trim());
}

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  console.error(`Unable to read a valid manifest.json: ${error.message}`);
  process.exit(1);
}

const errors = [];
if (manifest.manifest_version !== 3) errors.push("manifest_version must be 3.");
if (!/^\d+(\.\d+){0,3}$/.test(String(manifest.version ?? ""))) {
  errors.push("version must contain one to four dot-separated numeric components.");
}
for (const field of ["name", "description", "version"]) {
  if (!manifest[field]) errors.push(`Required manifest field is missing: ${field}`);
}

const referencedPaths = new Set();
addPath(referencedPaths, manifest.background?.service_worker);
addPath(referencedPaths, manifest.side_panel?.default_path);
addPath(referencedPaths, manifest.options_page);
for (const value of Object.values(manifest.icons ?? {})) addPath(referencedPaths, value);
for (const value of Object.values(manifest.action?.default_icon ?? {})) addPath(referencedPaths, value);
for (const script of manifest.content_scripts ?? []) {
  for (const value of script.js ?? []) addPath(referencedPaths, value);
  for (const value of script.css ?? []) addPath(referencedPaths, value);
}
for (const group of manifest.web_accessible_resources ?? []) {
  for (const value of group.resources ?? []) if (!value.includes("*")) addPath(referencedPaths, value);
}
for (const relativePath of [...referencedPaths].sort()) {
  if (!(await exists(relativePath))) errors.push(`Manifest references a missing file: ${relativePath}`);
}

const requiredRuntimeFiles = [
  "src/backend/config/official-api-keys.js",
  "src/frontend/shared/resume-parsers.js"
];
for (const relativePath of requiredRuntimeFiles) {
  if (!(await exists(relativePath))) errors.push(`Required runtime file is missing: ${relativePath}`);
}

if (errors.length) {
  console.error("\nIceBreaker validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Manifest ${manifest.version} is valid.`);
console.log(`Verified ${referencedPaths.size} manifest paths and ${requiredRuntimeFiles.length} runtime files.`);
