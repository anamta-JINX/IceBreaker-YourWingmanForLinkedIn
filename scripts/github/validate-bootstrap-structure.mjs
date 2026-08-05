import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const required=["src/frontend/vendor/bootstrap.min.css","src/frontend/sidepanel/sidepanel-theme.js","src/frontend/options/options-theme.js"];
for(const file of required){if(!fs.existsSync(path.join(root,file)))throw new Error(`Missing Bootstrap frontend file: ${file}`)}
const bootstrap=fs.readFileSync(path.join(root,"src/frontend/vendor/bootstrap.min.css"),"utf8");
if(!bootstrap.includes("Bootstrap v5.1.1"))throw new Error("Local Bootstrap license/version header is missing");
for(const htmlFile of ["src/frontend/sidepanel/index.html","src/frontend/options/index.html"]){const html=fs.readFileSync(path.join(root,htmlFile),"utf8");if(!html.includes("../vendor/bootstrap.min.css"))throw new Error(`${htmlFile} does not load local Bootstrap`);if(/https?:\/\//i.test(html))throw new Error(`${htmlFile} must not load CDN assets`)}
for(const file of ["src/frontend/sidepanel/sidepanel-components.js","src/frontend/options/options-components.js"]){const source=fs.readFileSync(path.join(root,file),"utf8");if(!/\b(btn|card|form-control|form-select|d-flex|d-grid)\b/.test(source))throw new Error(`${file} is not using Bootstrap classes`)}
for(const removed of ["src/frontend/sidepanel/sidepanel-styles.js","src/frontend/options/options-styles.js"]){if(fs.existsSync(path.join(root,removed)))throw new Error(`Legacy style module still exists: ${removed}`)}
console.log("Bootstrap frontend validation passed.");
