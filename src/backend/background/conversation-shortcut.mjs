const RECOVERABLE_CAPTURE_CODES = new Set(["E-RPL-08", "E-RPL-16"]);
const DEFAULT_CACHED_CONTEXT_MAX_AGE_MS = 30 * 60 * 1000;

export function conversationCaptureCode(value) {
  const message = [value?.code, value?.errorCode, value?.message, typeof value === "string" ? value : ""]
    .filter(Boolean)
    .join(" ");
  return message.match(/\b(E-RPL-\d{2})\b/i)?.[1]?.toUpperCase() || "";
}

export function isRecoverableConversationShortcutCapture(value) {
  return RECOVERABLE_CAPTURE_CODES.has(conversationCaptureCode(value));
}

export function isStructuredConversationProfile(profile) {
  if (!profile || String(profile.mode || "").toLowerCase() !== "conversation") return false;
  if (profile.previewOnly === true || /preview/i.test(String(profile.source || ""))) return false;

  const messages = Array.isArray(profile.conversationMessages)
    ? profile.conversationMessages.filter((message) => String(message?.text || "").trim())
    : [];
  if (!messages.length) return false;

  const newestDirection = String(messages.at(-1)?.direction || profile.latestDirection || "").toLowerCase();
  if (!["self", "contact"].includes(newestDirection)) return false;
  return Boolean(String(profile.description || profile.rawText || "").trim());
}

function conversationIdentity(value) {
  try {
    const url = new URL(String(value || ""), "https://www.linkedin.com");
    return decodeURIComponent(url.pathname.match(/\/messaging\/(?:thread|in)\/([^/?#]+)/i)?.[1] || "")
      .trim()
      .toLowerCase();
  } catch (_) {
    return "";
  }
}

function timestampMs(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function candidateTimestamp(candidate) {
  return timestampMs(
    candidate.updatedAt ||
    candidate.profile?.capturedAtMs ||
    candidate.profile?.capturedAt ||
    candidate.createdAt
  );
}

function candidateMatchesActiveTab(candidate, { tabId, tabUrl }) {
  const profile = candidate.profile;
  if (Number.isInteger(tabId) && Number(profile?.tabId) !== tabId) return false;

  const activeThread = conversationIdentity(tabUrl);
  const profileThread = conversationIdentity(profile?.url);
  return !activeThread || !profileThread || activeThread === profileThread;
}

/**
 * Select the structured Conversation context that already backs the visible
 * side-panel draft. Cached candidates are accepted only for the same tab and
 * while recent; a live panel response is the authoritative displayed state.
 */
export function selectConversationShortcutFallback({
  livePanelDraft = null,
  storedPanelDraft = null,
  activeProfile = null,
  latestGeneration = null,
  tabId = null,
  tabUrl = "",
  now = Date.now(),
  cachedMaxAgeMs = DEFAULT_CACHED_CONTEXT_MAX_AGE_MS
} = {}) {
  const candidates = [
    { source: "live-panel", profile: livePanelDraft?.profile, updatedAt: livePanelDraft?.updatedAt },
    { source: "stored-panel", profile: storedPanelDraft?.profile, updatedAt: storedPanelDraft?.updatedAt },
    { source: "active-profile", profile: activeProfile, updatedAt: activeProfile?.capturedAt },
    { source: "latest-generation", profile: latestGeneration?.profile, createdAt: latestGeneration?.createdAt }
  ];

  for (const candidate of candidates) {
    if (!isStructuredConversationProfile(candidate.profile)) continue;
    if (!candidateMatchesActiveTab(candidate, { tabId, tabUrl })) continue;
    if (candidate.source !== "live-panel") {
      const capturedAt = candidateTimestamp(candidate);
      if (!capturedAt || now - capturedAt > cachedMaxAgeMs || capturedAt - now > 60_000) continue;
    }
    return { profile: candidate.profile, source: candidate.source };
  }
  return null;
}
