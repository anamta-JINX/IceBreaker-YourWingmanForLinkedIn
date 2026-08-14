export const AUTOPILOT_WORD_RANGES = Object.freeze({
  short: Object.freeze({ min: 15, max: 20, target: "16-20" }),
  medium: Object.freeze({ min: 30, max: 40, target: "32-40" }),
  long: Object.freeze({ min: 60, max: 200, target: "70-100" })
});

export function getAutopilotWordRange(length) {
  return AUTOPILOT_WORD_RANGES[length] || AUTOPILOT_WORD_RANGES.medium;
}

export function countAutopilotWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

export function compactAutopilotRole(value) {
  const firstRole = String(value || "")
    .split(/[,;|\n]+/)[0]
    .replace(/[\[\]{}<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return compactWords(firstRole || "AI Engineer", 4);
}

export function buildAutopilotPrompt({
  profile,
  senderName = "",
  targetRole = "AI Engineer",
  skills = "",
  tone = "professional",
  length = "medium",
  attachResume = false
}) {
  const range = getAutopilotWordRange(length);
  const firstName = recipientFirstName(profile?.name);
  const role = compactAutopilotRole(targetRole);
  const headline = safeFact(profile?.headline || profile?.description, 18) || "Not provided";
  const company = safeFact(profile?.company, 6) || "Not provided";
  const safeSkills = safeSkillList(skills, 4) || "Not provided";
  const sender = safeFact(senderName, 5) || "Not provided";

  return [
    "TASK: Write the job seeker's outbound LinkedIn message to a hiring contact.",
    "PERSPECTIVE: The sender is seeking work. The recipient is the person being contacted. Never reverse those roles.",
    "VERIFIED FACTS:",
    `- Recipient first name: ${firstName}`,
    `- Recipient headline: ${headline}`,
    `- Recipient company: ${company}`,
    `- Sender name: ${sender}`,
    `- Sender target role: ${role}`,
    `- Sender skills: ${safeSkills}`,
    `- Tone: ${autopilotTone(tone)}`,
    "REQUIRED OUTPUT:",
    `- Return only one DM of ${range.min}-${range.max} words; aim for ${range.target} words.`,
    `- Begin exactly with \"Hi ${firstName},\" and include the target role exactly as \"${role}\".`,
    "- Personalise only from the verified recipient headline or company above.",
    "- Ask whether a relevant opening exists or who the right hiring contact is. Do not claim that an opening exists.",
    "- Write as the job seeker, never as a recruiter. Do not mention reviewing the recipient's application or résumé.",
    "- Never invent a relationship, vacancy, company fact, achievement, skill, or prior conversation.",
    attachResume
      ? "- Mention the attached résumé once."
      : "- Do not say or imply that a résumé, file, portfolio, or document is attached.",
    "- Finish the final sentence with punctuation. No labels, analysis, signature, markdown, or quotation marks."
  ].join("\n");
}

export function buildSafeAutopilotDraft({
  profile,
  targetRole = "AI Engineer",
  skills = "",
  length = "medium",
  attachResume = false
}) {
  const firstName = recipientFirstName(profile?.name);
  const role = compactAutopilotRole(targetRole);
  const context = recipientContext(profile);
  const skillSummary = naturalList(safeSkillList(skills, length === "long" ? 3 : 2));

  if (length === "short") {
    return attachResume
      ? `Hi ${firstName}, I’m exploring ${role} roles. My résumé is attached; could you consider me for an opportunity?`
      : `Hi ${firstName}, I’m exploring ${role} roles. Do you know of an opening or the right hiring contact?`;
  }

  if (length === "long") {
    const background = skillSummary
      ? `My background includes ${skillSummary}. I hope to apply those skills in my next role.`
      : "I’m looking for a role where I can contribute, keep learning, and take ownership of meaningful work.";
    const attachment = attachResume ? "I’ve attached my résumé for additional context." : "";
    return joinSentences([
      `Hi ${firstName}, I’m currently exploring ${role} opportunities.`,
      `I noticed ${context}.`,
      background,
      attachment,
      "I’m reaching out to ask whether your team may have a relevant opening, or whether you could point me to the right hiring contact.",
      "I’d be glad to share more context about my experience and learn which priorities matter most for the role.",
      "Thank you for your time."
    ]);
  }

  const greeting = `Hi ${firstName}, I’m exploring ${role} opportunities.`;
  const contextSentence = `I noticed ${context}.`;
  const background = skillSummary ? `My background includes ${skillSummary}.` : "";
  const attachment = attachResume ? "I’ve attached my résumé for context." : "";
  const ask = attachResume
    ? "Could you consider me for a relevant opening, or point me to the right hiring contact?"
    : "Could you tell me about a relevant opening, or point me to the right hiring contact?";
  const optional = attachResume ? [background] : [background, "I’d appreciate your guidance."];
  return fitMediumDraft([greeting, contextSentence, attachment, ask], optional);
}

export function autopilotDraftIssue(value, {
  profile,
  targetRole = "AI Engineer",
  length = "medium",
  attachResume = false
} = {}) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const range = getAutopilotWordRange(length);
  const words = countAutopilotWords(text);
  if (!text) return "the model returned no message";
  if (words < range.min) return `it has ${words} words instead of at least ${range.min}`;
  if (words > range.max) return `it has ${words} words instead of at most ${range.max}`;
  if (/(?:\.{2,}|…)(?:[\"'”’\)\]]*)$/.test(text) || !/[.!?](?:[\"'”’\)\]]*)$/.test(text)) {
    return "its final sentence is unfinished";
  }

  const firstName = recipientFirstName(profile?.name);
  const normalized = normalizeForMatch(text);
  const expectedGreeting = normalizeForMatch(`Hi ${firstName},`);
  const greetingAlternatives = ["hi", "hello", "hey"].map((word) => normalizeForMatch(`${word} ${firstName}`));
  if (!greetingAlternatives.some((greeting) => normalized.startsWith(greeting))) {
    return `it is not addressed to ${firstName}`;
  }

  const role = compactAutopilotRole(targetRole);
  if (!normalized.includes(normalizeForMatch(role))) return `it does not mention the target role “${role}”`;

  const reversedPerspective = [
    /\b(?:we|our team|our company)\s+(?:are|is|'re)\s+(?:currently\s+)?hiring\b/i,
    /\bI(?:'m| am)\s+(?:currently\s+)?hiring\b/i,
    /\b(?:your application|your résumé|your resume)\s+(?:stood out|was|has been|looks)\b/i,
    /\bplease\s+(?:apply|send|share)\b[^.!?]{0,80}\b(?:résumé|resume|application)\b/i,
    /\bwe(?:'d| would)\s+like\s+to\s+(?:invite|interview|consider|hire)\b/i
  ].some((pattern) => pattern.test(text));
  if (reversedPerspective) return "it writes from the recruiter's perspective instead of the job seeker's";

  const attachmentMentioned = /\battach(?:ed|ment)?\b|\benclos(?:ed|ure)\b/i.test(text);
  if (attachResume && !attachmentMentioned) return "it does not mention the enabled résumé attachment";
  if (!attachResume && attachmentMentioned) return "it claims a file is attached when attachment is disabled";

  const unsupportedContextClaim = [
    /\b(?:loved|enjoyed|read|saw)\s+your\s+(?:recent\s+)?(?:post|article|announcement)\b/i,
    /\b(?:great|nice|good)\s+(?:meeting|speaking|connecting|chatting)\s+with\s+you\b/i,
    /\b(?:following|admiring)\s+your\s+work\b/i,
    /\bour\s+(?:previous|recent|last)\s+(?:conversation|meeting|call|chat)\b/i
  ].some((pattern) => pattern.test(text));
  if (unsupportedContextClaim) return "it invents profile activity or a prior relationship that was not provided";

  const profileText = `${profile?.headline || ""} ${profile?.description || ""} ${profile?.rawText || ""}`;
  const hasHiringSignal = /\b(?:we are hiring|we're hiring|currently hiring|hiring now|open roles?|open positions?|join my team)\b/i.test(profileText);
  if (!hasHiringSignal && /\b(?:noticed|saw|understand|read)\b[^.!?]{0,70}\b(?:hiring|vacancy|open(?:ing)? role|open position)\b/i.test(text)) {
    return "it claims the recipient is hiring without a verified hiring signal";
  }
  if (/\b\d+\+?\s+years?\s+(?:of\s+)?experience\b/i.test(text)) {
    return "it invents an experience duration that was not supplied to Autopilot";
  }

  if (!/\b(?:opening|openings|opportunity|opportunities|position|positions|hiring contact|recruiter)\b/i.test(text)) {
    return "it does not ask about an opportunity or the right hiring contact";
  }

  if (length !== "short" && !usesVerifiedRecipientContext(text, profile)) {
    return "it does not use any verified recipient headline or company context";
  }

  // Keep this exact variable useful while making the expected greeting explicit
  // to future maintainers and validation tooling.
  void expectedGreeting;
  return "";
}

function fitMediumDraft(requiredSentences, optionalSentences) {
  const range = AUTOPILOT_WORD_RANGES.medium;
  const sentences = requiredSentences.filter(Boolean);
  for (const sentence of optionalSentences.filter(Boolean)) {
    const candidate = joinSentences([...sentences.slice(0, -1), sentence, sentences.at(-1)]);
    if (countAutopilotWords(candidate) <= range.max) sentences.splice(Math.max(0, sentences.length - 1), 0, sentence);
  }

  let draft = joinSentences(sentences);
  const fillers = ["I’d appreciate your guidance.", "Thank you for your time.", "Thank you."];
  for (const filler of fillers) {
    if (countAutopilotWords(draft) >= range.min) break;
    const candidate = joinSentences([...sentences, filler]);
    if (countAutopilotWords(candidate) <= range.max) {
      sentences.push(filler);
      draft = candidate;
    }
  }
  return draft;
}

function recipientFirstName(value) {
  const first = String(value || "").trim().split(/\s+/)[0] || "there";
  return first.replace(/[^\p{L}\p{N}'’\-]/gu, "") || "there";
}

function recipientContext(profile) {
  const company = safeFact(profile?.company, 3);
  if (company) return `your work at ${company}`;
  const title = safeFact(String(profile?.headline || "").split(/\s+(?:at|@)\s+|[|•·]/i)[0], 4);
  if (title) return `your role as ${title}`;
  return "your hiring-related background";
}

function safeSkillList(value, limit) {
  return String(value || "")
    .split(/[,;|\n]+/)
    .map((item) => safeFact(item, 3))
    .filter(Boolean)
    .slice(0, Math.max(1, limit))
    .join(", ");
}

function safeFact(value, maxWords) {
  return compactWords(
    String(value || "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[<>\[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    maxWords
  );
}

function naturalList(value) {
  const items = String(value || "").split(/\s*,\s*/).filter(Boolean);
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function usesVerifiedRecipientContext(text, profile) {
  const normalizedText = normalizeForMatch(text);
  const company = normalizeForMatch(profile?.company || "");
  if (company && normalizedText.includes(company)) return true;

  const ignored = new Set(["and", "the", "with", "from", "for", "chief", "senior", "officer"]);
  const headlineTokens = normalizeForMatch(profile?.headline || profile?.description || "")
    .split(" ")
    .filter((token) => token.length >= 3 && !ignored.has(token));
  return headlineTokens.some((token) => normalizedText.includes(token));
}

function compactWords(value, maxWords) {
  return String(value || "").split(/\s+/).filter(Boolean).slice(0, Math.max(1, maxWords)).join(" ");
}

function joinSentences(sentences) {
  return sentences.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function autopilotTone(value) {
  const tone = String(value || "professional").toLowerCase();
  if (tone === "engaging") return "warm, conversational, specific, and concise";
  if (tone === "neutral") return "clear, calm, direct, and respectful";
  return "professional, human, confident, and respectful";
}
