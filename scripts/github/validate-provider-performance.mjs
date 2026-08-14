import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  OLLAMA_HEADER_TIMEOUT_MS,
  OLLAMA_IDLE_TIMEOUT_MS,
  OLLAMA_OVERALL_TIMEOUT_MS,
  OPENROUTER_COMPLETION_TIMEOUT_MS,
  OPENROUTER_FALLBACK_TIMEOUT_MS,
  OPENROUTER_MODEL_DISCOVERY_TIMEOUT_MS,
  PROVIDER_TRANSIENT_RETRY_LIMIT,
  isTransientProviderFailure,
  ollamaContextWindow,
  ollamaPredictionBudget,
  ollamaThinkMode,
  openRouterOutputBudget,
  providerFailureStatus,
  providerPromptLimits,
  providerRetryDelayMs
} from "../../src/backend/background/provider-performance.js";

assert.equal(openRouterOutputBudget(160), 160);
assert.equal(openRouterOutputBudget(256), 256);
assert.equal(openRouterOutputBudget(768), 512);
assert.equal(ollamaContextWindow(160), 2048);
assert.equal(ollamaContextWindow(768), 3072);
assert.equal(ollamaContextWindow(160, 6000), 3072);
assert.equal(ollamaPredictionBudget(160), 160);
assert.equal(ollamaPredictionBudget(256), 256);
assert.equal(ollamaPredictionBudget(768), 512);
assert.equal(ollamaThinkMode("gpt-oss:20b"), "low");
assert.equal(ollamaThinkMode("qwen3:1.7b"), false);
assert.deepEqual(providerPromptLimits(), {
  systemMaxChars: 560,
  userMaxChars: 6000,
  assistantMaxChars: 1000
});
assert.equal(providerPromptLimits({ mode: "conversation" }).userMaxChars, 6000);
assert(OPENROUTER_COMPLETION_TIMEOUT_MS <= 18_000);
assert(OPENROUTER_FALLBACK_TIMEOUT_MS <= 14_000);
assert(OPENROUTER_MODEL_DISCOVERY_TIMEOUT_MS <= 6_000);
assert(OLLAMA_HEADER_TIMEOUT_MS <= 60_000);
assert(OLLAMA_IDLE_TIMEOUT_MS <= 60_000);
assert(OLLAMA_OVERALL_TIMEOUT_MS <= 180_000);
assert.equal(PROVIDER_TRANSIENT_RETRY_LIMIT, 1);
assert.equal(providerFailureStatus({ status: 429 }), 429);
assert.equal(providerFailureStatus(new Error("OpenRouter request failed (503)")), 503);
assert.equal(isTransientProviderFailure({ status: 429 }), true);
assert.equal(isTransientProviderFailure(new Error("connection reset by peer")), true);
assert.equal(isTransientProviderFailure({ status: 401 }), false);
assert.equal(providerRetryDelayMs({ retryAfterMs: 2_000 }, 0, "groq"), 2_250);
assert(providerRetryDelayMs(new Error("temporary"), 0, "ollama") < providerRetryDelayMs(new Error("temporary"), 0, "groq"));

const background = await readFile(
  new URL("../../src/backend/background/service-worker.js", import.meta.url),
  "utf8"
);
const openRouterStart = background.indexOf("async function callOpenRouter");
const openRouterEnd = background.indexOf("function buildOpenRouterCandidates", openRouterStart);
const openRouterCall = background.slice(openRouterStart, openRouterEnd);
assert(openRouterStart >= 0 && openRouterEnd > openRouterStart, "OpenRouter implementation must be present.");
assert(
  openRouterCall.indexOf("api/v1/chat/completions") < openRouterCall.indexOf("getOpenRouterFreeTextFallbacks"),
  "OpenRouter must start generation before optional fallback-model discovery."
);
assert.match(openRouterCall, /sort:\s*"latency"/);
assert.match(openRouterCall, /maxOfficialAttempts:\s*2/);
assert.doesNotMatch(openRouterCall, /maxOutputTokens[^\n]*\*\s*2/);
assert.match(background, /return candidates\.slice\(0, 2\)/);
assert.match(background, /messages:\s*providerMessages[\s\S]*num_ctx:\s*ollamaContextWindow/);
assert.match(background, /num_predict:\s*ollamaPredictionBudget/);
assert.doesNotMatch(background, /controller\.abort\("overall-timeout"\);\s*\n\s*},\s*600000/);
assert.match(background, /reader\.cancel\("icebreaker-request-complete"\)/);
assert.match(background, /reader\.releaseLock\(\)/);
assert.match(background, /waitForGenerationRequestToSettle/);
assert.match(background, /status:\s*"cancelled"[\s\S]*errorCode:\s*"E-RECOVERED"/);
assert.match(background, /waitForProviderRecovery\("openrouter"/);
assert.match(background, /waitForProviderRecovery\("groq"/);
assert.match(background, /waitForProviderRecovery\("ollama"/);

const normalizeIndex = background.indexOf("message = normalizeCompleteDraftWithinRange(message, range)");
const repairCheckIndex = background.indexOf("const initialConstraintIssue", normalizeIndex);
assert(normalizeIndex >= 0 && repairCheckIndex > normalizeIndex, "Safe local draft cleanup must happen before an AI repair call.");

console.log("OpenRouter and Ollama low-latency generation contracts passed.");
