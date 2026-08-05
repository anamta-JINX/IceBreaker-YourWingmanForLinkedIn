import assert from "node:assert/strict";
import {
  conversationCaptureCode,
  isRecoverableConversationShortcutCapture,
  isStructuredConversationProfile,
  selectConversationShortcutFallback
} from "../../src/backend/background/conversation-shortcut.mjs";

const now = Date.parse("2026-08-04T12:00:00.000Z");
const structuredProfile = {
  mode: "conversation",
  tabId: 42,
  name: "Sarah Jenkins",
  url: "https://www.linkedin.com/messaging/thread/sarah-thread/",
  source: "conversation-hover",
  capturedAtMs: now - 1_000,
  latestDirection: "contact",
  description: "[YOU]: Are we still on for Tuesday?\n\n[CONTACT - Sarah Jenkins]: Yes, Tuesday works.",
  conversationMessages: [
    { direction: "self", text: "Are we still on for Tuesday?" },
    { direction: "contact", text: "Yes, Tuesday works." }
  ]
};

assert.equal(conversationCaptureCode("[E-RPL-16] no shell"), "E-RPL-16");
assert.equal(isRecoverableConversationShortcutCapture({ errorCode: "E-RPL-08" }), true);
assert.equal(isRecoverableConversationShortcutCapture({ code: "E-RPL-03" }), false);
assert.equal(isStructuredConversationProfile(structuredProfile), true);
assert.equal(isStructuredConversationProfile({ ...structuredProfile, previewOnly: true }), false);
assert.equal(isStructuredConversationProfile({ ...structuredProfile, latestDirection: "unknown", conversationMessages: [{ direction: "unknown", text: "Maybe" }] }), false);

const live = selectConversationShortcutFallback({
  livePanelDraft: { profile: structuredProfile, updatedAt: new Date(now).toISOString() },
  activeProfile: { ...structuredProfile, name: "Older candidate" },
  tabId: 42,
  tabUrl: structuredProfile.url,
  now
});
assert.equal(live?.source, "live-panel");
assert.equal(live?.profile?.name, "Sarah Jenkins");

const cached = selectConversationShortcutFallback({
  storedPanelDraft: { profile: structuredProfile, updatedAt: new Date(now - 10_000).toISOString() },
  tabId: 42,
  tabUrl: structuredProfile.url,
  now
});
assert.equal(cached?.source, "stored-panel");

assert.equal(selectConversationShortcutFallback({
  livePanelDraft: { profile: structuredProfile },
  tabId: 99,
  tabUrl: structuredProfile.url,
  now
}), null, "a draft from another tab must never be reused");

assert.equal(selectConversationShortcutFallback({
  livePanelDraft: { profile: structuredProfile },
  tabId: 42,
  tabUrl: "https://www.linkedin.com/messaging/thread/alice-thread/",
  now
}), null, "a different full-page thread must never be reused");

assert.equal(selectConversationShortcutFallback({
  storedPanelDraft: { profile: structuredProfile, updatedAt: new Date(now - 31 * 60 * 1000).toISOString() },
  tabId: 42,
  tabUrl: structuredProfile.url,
  now
}), null, "expired session context must never be reused");

console.log("Conversation Alt+G fallback validation passed.");
