import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../../${file}`, import.meta.url), "utf8");

const [sideComponents, sideController, optionsComponents, optionsController, background, content] = await Promise.all([
  read("src/frontend/sidepanel/sidepanel-components.js"),
  read("src/frontend/sidepanel/sidepanel.js"),
  read("src/frontend/options/options-components.js"),
  read("src/frontend/options/autopilot-settings.js"),
  read("src/backend/background/service-worker.js"),
  read("src/backend/content/linkedin-content.js")
]);

const readyIndex = sideComponents.indexOf('id: "statusText"');
const autopilotIndex = sideComponents.indexOf('id: "autopilotHeaderButton"');
const settingsIndex = sideComponents.indexOf('id: "settingsButton"');
assert(readyIndex >= 0 && readyIndex < autopilotIndex && autopilotIndex < settingsIndex, "Autopilot must sit between Ready and Settings.");
assert.match(sideController, /autopilotHeaderButton\.addEventListener\("click", handleAutopilotHeaderClick\)/);
assert.match(sideController, /type: "START_AUTOPILOT"/);

for (const tab of ["targeting", "filters", "safety", "message"]) {
  assert(optionsComponents.includes(`"data-ap-tab": "${tab}"`), `Missing ${tab} Autopilot settings tab.`);
}
assert.match(optionsComponents, /id": "apRunControlButton"/);
assert.match(optionsComponents, /id": "apDailyActionLimit"/);
assert.match(optionsComponents, /id": "apAttachResume"/);
assert.match(optionsController, /selectionMode: "hiring_contacts"/);
assert.match(optionsController, /dailyActionLimit: 45/);
assert.match(optionsController, /attachResume: false/);

assert.match(background, /selectionMode: "hiring_contacts"/);
assert.match(background, /dailyActionLimit: 45/);
assert.match(background, /recordAutopilotDailyDraft\(event\.draft\.profileId\)/);
assert.match(background, /dailyRemaining = Math\.max\(0, settings\.dailyActionLimit - dailyUsage\.prepared\)/);
assert.match(background, /resumeFile: runSettings\.attachResume && aiResume\?\.base64/);
assert.match(content, /: 'hiring_contacts'/);
assert.match(content, /attachResume: source\.attachResume === true/);
assert.match(content, /unsent draft\. Review it before sending/);

console.log("Autopilot navbar, hiring targeting, optional résumé, draft-only behavior, and daily safety contracts passed.");
