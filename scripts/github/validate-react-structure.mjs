import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const contractPath = path.join(root, "scripts/contracts/frontend-dom-contract.json");
const contract = JSON.parse(await readFile(contractPath, "utf8"));

function loadComponentTree(source, globalName) {
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children };
    }
  };
  const context = { React, window: {}, Object, console };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: `${globalName}.js` });
  const App = context.window[globalName]?.App;
  if (typeof App !== "function") throw new Error(`${globalName}.App was not exported.`);

  function resolve(node) {
    if (node == null || typeof node === "boolean") return null;
    if (Array.isArray(node)) {
      return node.flatMap((child) => {
        const resolved = resolve(child);
        return resolved == null ? [] : Array.isArray(resolved) ? resolved : [resolved];
      });
    }
    if (typeof node === "string" || typeof node === "number") return node;
    if (typeof node.type === "function") {
      return resolve(node.type({ ...(node.props || {}), children: node.children }));
    }
    return {
      tag: String(node.type).toLowerCase(),
      props: node.props || {},
      children: node.children.flatMap((child) => {
        const resolved = resolve(child);
        return resolved == null ? [] : Array.isArray(resolved) ? resolved : [resolved];
      })
    };
  }

  return resolve(React.createElement(App, null));
}

function inspectTree(tree) {
  const tags = new Map();
  const ids = new Map();
  function visit(node, isRoot = false) {
    if (!node || typeof node !== "object") return;
    if (!isRoot) tags.set(node.tag, (tags.get(node.tag) || 0) + 1);
    if (node.props?.id) ids.set(String(node.props.id), node.tag);
    for (const child of node.children || []) visit(child, false);
  }
  visit(tree, true); // Exclude the React-only display:contents wrapper.
  return { tags, ids };
}

function mapDiff(expectedObject, actualMap) {
  const expected = new Map(Object.entries(expectedObject));
  const errors = [];
  for (const [key, value] of expected) {
    if (!actualMap.has(key)) errors.push(`missing ${key}`);
    else if (actualMap.get(key) !== value) {
      errors.push(`${key}: expected ${value}, received ${actualMap.get(key)}`);
    }
  }
  for (const key of actualMap.keys()) {
    if (!expected.has(key)) errors.push(`unexpected ${key}`);
  }
  return errors;
}

async function fileExists(relativePath) {
  try {
    await access(path.join(root, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const pages = [
  {
    name: "sidepanel",
    components: "src/frontend/sidepanel/sidepanel-components.js",
    app: "src/frontend/sidepanel/sidepanel-app.js",
    globalName: "IceBreakerSidepanel",
    controllers: ["src/frontend/sidepanel/sidepanel.js"],
    index: "src/frontend/sidepanel/index.html",
    styles: "src/frontend/sidepanel/sidepanel-theme.js"
  },
  {
    name: "options",
    components: "src/frontend/options/options-components.js",
    app: "src/frontend/options/options-app.js",
    globalName: "IceBreakerOptions",
    controllers: [
      "src/frontend/options/options.js",
      "src/frontend/options/autopilot-settings.js"
    ],
    index: "src/frontend/options/index.html",
    styles: "src/frontend/options/options-theme.js"
  }
];

let failed = false;
for (const page of pages) {
  const expected = contract.pages?.[page.name];
  if (!expected) throw new Error(`Missing DOM contract for ${page.name}.`);

  const [componentSource, appSource, indexHtml, ...controllerSources] = await Promise.all([
    readFile(path.join(root, page.components), "utf8"),
    readFile(path.join(root, page.app), "utf8"),
    readFile(path.join(root, page.index), "utf8"),
    ...page.controllers.map((controller) => readFile(path.join(root, controller), "utf8"))
  ]);

  const actual = inspectTree(loadComponentTree(componentSource, page.globalName));
  const idErrors = mapDiff(expected.ids, actual.ids);
  const tagErrors = mapDiff(expected.tags, actual.tags);

  const controllerIds = new Set();
  for (const source of controllerSources) {
    for (const match of source.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) {
      controllerIds.add(match[1]);
    }
  }
  const controllerErrors = [...controllerIds]
    .filter((id) => !actual.ids.has(id))
    .map((id) => `controller requires missing #${id}`);

  const architectureErrors = [];
  if (componentSource.includes("dangerouslySetInnerHTML")) {
    architectureErrors.push("component source uses dangerouslySetInnerHTML");
  }
  if (!indexHtml.includes(path.basename(page.components))) {
    architectureErrors.push(`index does not load ${path.basename(page.components)}`);
  }
  if (!indexHtml.includes(path.basename(page.app))) {
    architectureErrors.push(`index does not load ${path.basename(page.app)}`);
  }
  if (!indexHtml.includes(path.basename(page.styles))) {
    architectureErrors.push(`index does not load ${path.basename(page.styles)}`);
  }
  if (!indexHtml.includes("../vendor/bootstrap.min.css")) {
    architectureErrors.push("index does not load locally bundled Bootstrap");
  }
  if (/https?:\/\//i.test(indexHtml)) {
    architectureErrors.push("index must not load CDN assets");
  }
  if (!indexHtml.includes("../runtime/react-page-runtime.js")) {
    architectureErrors.push("index does not load the shared React runtime");
  }
  if (!indexHtml.includes("../vendor/react.production.min.js") ||
      !indexHtml.includes("../vendor/react-dom.production.min.js")) {
    architectureErrors.push("index does not load locally bundled React and ReactDOM");
  }
  if (!appSource.includes("controllerScripts")) {
    architectureErrors.push("app does not declare controller scripts");
  }
  if (await fileExists(`src/frontend/${page.name}/index.static-backup.html`)) {
    architectureErrors.push("obsolete static HTML backup still exists");
  }

  const errors = [...idErrors, ...tagErrors, ...controllerErrors, ...architectureErrors];
  if (errors.length) {
    failed = true;
    console.error(`\n${page.name} React structure mismatch:`);
    for (const error of errors) console.error(`- ${error}`);
  } else {
    const elementCount = [...actual.tags.values()].reduce((sum, count) => sum + count, 0);
    console.log(
      `${page.name}: preserved ${actual.ids.size} IDs across ${elementCount} elements; ` +
      `verified ${controllerIds.size} controller bindings.`
    );
  }
}

if (failed) process.exit(1);
