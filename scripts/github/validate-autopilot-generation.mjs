import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  autopilotDraftIssue,
  buildAutopilotPrompt,
  buildSafeAutopilotDraft,
  countAutopilotWords,
  getAutopilotWordRange
} from "../../src/backend/background/autopilot-draft.js";

const fixtures = [
  { name: "Sarah Anwar", headline: "Chief Executive Officer at FlowState", company: "FlowState" },
  { name: "Renato Naumann Xidieh Costa", headline: "CTO | Building AI teams", company: "" },
  { name: "Zara Khan", headline: "Technical Recruiter", company: "" }
];

for (const profile of fixtures) {
  for (const length of ["short", "medium", "long"]) {
    for (const attachResume of [false, true]) {
      const input = {
        profile,
        targetRole: "AI Engineer, ML Engineer",
        skills: "Python, FastAPI, LLMs, React",
        length,
        attachResume
      };
      const draft = buildSafeAutopilotDraft(input);
      const range = getAutopilotWordRange(length);
      const words = countAutopilotWords(draft);
      assert(words >= range.min && words <= range.max, `${length} fallback must have ${range.min}-${range.max} words; got ${words}.`);
      assert.equal(autopilotDraftIssue(draft, input), "", `${length} fallback must pass every Autopilot validator.`);
      assert.match(draft, new RegExp(`^Hi ${profile.name.split(/\s+/)[0]},`));
      assert.match(draft, /AI Engineer/);
      assert.equal(/attach/i.test(draft), attachResume, "Attachment wording must match the enabled setting.");
    }
  }
}

const prompt = buildAutopilotPrompt({
  profile: fixtures[0],
  senderName: "Anamta",
  targetRole: "AI Engineer, ML Engineer",
  skills: "Python, FastAPI, LLMs",
  length: "long",
  attachResume: false
});
assert.match(prompt, /sender is seeking work/i);
assert.match(prompt, /never reverse those roles/i);
assert.match(prompt, /Do not say or imply.*attached/i);
assert.match(prompt, /aim for 70-100 words/i);
assert.doesNotMatch(prompt, /ML Engineer/, "Only the selected primary target role should reach the prompt.");

const wrongPerspective = "Hi Sarah, our team is currently hiring for an AI Engineer. Your application stood out, so please send your résumé and we would like to invite you to interview today. Thank you.";
assert.match(autopilotDraftIssue(wrongPerspective, { profile: fixtures[0], targetRole: "AI Engineer", length: "medium" }), /recruiter's perspective|attached/i);

const inventedRelationship = "Hi Sarah, I’m exploring AI Engineer opportunities and loved your recent post. My background includes Python and FastAPI. Could you tell me about a relevant opening, or point me to the right hiring contact? Thank you for your time.";
assert.match(autopilotDraftIssue(inventedRelationship, { profile: fixtures[0], targetRole: "AI Engineer", length: "medium" }), /invents profile activity/i);

const falseAttachment = "Hi Sarah, I’m exploring AI Engineer opportunities and noticed your work at FlowState. I’ve attached my résumé for context. Could you tell me about a relevant opening, or point me to the right hiring contact? Thank you.";
assert.match(autopilotDraftIssue(falseAttachment, { profile: fixtures[0], targetRole: "AI Engineer", length: "medium", attachResume: false }), /attached when attachment is disabled/i);

const noRecipientGrounding = "Hi Sarah, I’m exploring AI Engineer opportunities. My background includes Python, FastAPI, and LLMs. I’m looking for a thoughtful team where I can contribute. Could you point me to the right hiring contact for a relevant position? Thank you.";
assert.match(autopilotDraftIssue(noRecipientGrounding, { profile: fixtures[0], targetRole: "AI Engineer", length: "medium" }), /verified recipient.*context/i);

const inventedExperience = "Hi Sarah, I’m exploring AI Engineer opportunities and noticed your work at FlowState. I have 10 years of experience with Python and LLMs. Could you point me to the right hiring contact for a relevant position? Thank you.";
assert.match(autopilotDraftIssue(inventedExperience, { profile: fixtures[0], targetRole: "AI Engineer", length: "medium" }), /invents an experience duration/i);

const unfinished = "Hi Sarah, I’m exploring AI Engineer opportunities and noticed your work at FlowState. Could you tell me about a relevant opening or the right hiring contact because I would";
assert.match(autopilotDraftIssue(unfinished, { profile: fixtures[0], targetRole: "AI Engineer", length: "medium" }), /unfinished|words/);

const [background, content, sidepanel] = await Promise.all([
  readFile(new URL("../../src/backend/background/service-worker.js", import.meta.url), "utf8"),
  readFile(new URL("../../src/backend/content/linkedin-content.js", import.meta.url), "utf8"),
  readFile(new URL("../../src/frontend/sidepanel/sidepanel.js", import.meta.url), "utf8")
]);
const obsoleteGenericCode = new RegExp(["E", "AI"].join("-"));
assert.doesNotMatch(`${background}\n${content}\n${sidepanel}`, obsoleteGenericCode, "The obsolete generic generation code must not return.");
assert.match(background, /if \(isAutopilot && \(fallbackUsed \|\| autopilotValidation\)\)/);
assert.match(background, /filter\(shouldSkipRememberedAutopilotProfile\)/, "Technical failures must be retryable on later runs.");
assert.match(content, /attempt < 3/, "Composer opening must retain all three recovery methods.");
assert.match(content, /Open and verify the recipient first/);

console.log("Autopilot prompting, verified fallback drafts, retryable failures, and composer recovery contracts passed.");
