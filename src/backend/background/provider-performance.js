const finiteNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max, fallback) => Math.min(
  max,
  Math.max(min, Math.round(finiteNumber(value, fallback)))
);

// Keep cloud requests bounded. Provider/model fallback is handled inside the
// same OpenRouter request whenever possible, so a slow endpoint cannot hold the
// LinkedIn composer for several minutes.
export const OPENROUTER_COMPLETION_TIMEOUT_MS = 18_000;
export const OPENROUTER_FALLBACK_TIMEOUT_MS = 14_000;
export const OPENROUTER_MODEL_DISCOVERY_TIMEOUT_MS = 6_000;

// Streaming begins quickly on a healthy local server. These limits still leave
// room for a cold model load while surfacing an overloaded or unsuitable local
// model much sooner than the previous ten-minute ceiling.
export const OLLAMA_HEADER_TIMEOUT_MS = 60_000;
export const OLLAMA_IDLE_TIMEOUT_MS = 60_000;
export const OLLAMA_OVERALL_TIMEOUT_MS = 180_000;

// A failed request must not poison the extension until it is reloaded. These
// statuses are temporary according to the cloud providers and are safe to
// retry after a bounded, cancellable delay. Authentication/payment failures
// are deliberately excluded because repeating them cannot make them succeed.
export const PROVIDER_TRANSIENT_RETRY_LIMIT = 1;
export const PROVIDER_RETRY_MAX_DELAY_MS = 65_000;
const TRANSIENT_PROVIDER_STATUSES = new Set([408, 409, 425, 429, 498, 500, 502, 503, 504, 524, 529]);

export function openRouterOutputBudget(requestedTokens = 256) {
  return clamp(requestedTokens, 96, 512, 256);
}

export function ollamaContextWindow(requestedTokens = 256, promptCharacters = 0) {
  return finiteNumber(requestedTokens, 256) > 320 || finiteNumber(promptCharacters, 0) > 5200
    ? 3072
    : 2048;
}

export function ollamaPredictionBudget(requestedTokens = 256) {
  const requested = finiteNumber(requestedTokens, 256);
  if (requested <= 160) return clamp(requested, 96, 192, 160);
  if (requested <= 256) return clamp(requested, 128, 320, 256);
  return clamp(Math.ceil(requested * 0.67), 256, 512, 384);
}

export function ollamaThinkMode(model = "") {
  // Ollama's GPT-OSS models require a reasoning level instead of accepting a
  // disabled flag. Use their lightest supported mode; other supported models
  // can skip hidden reasoning entirely for these short writing tasks.
  return /(?:^|[/:_-])gpt-oss(?:$|[/:_-])/i.test(String(model)) ? "low" : false;
}

export function providerPromptLimits({ compactInput = false, repair = false, mode = "" } = {}) {
  if (compactInput) {
    return { systemMaxChars: 320, userMaxChars: 2200, assistantMaxChars: 700 };
  }
  if (repair) {
    return { systemMaxChars: 480, userMaxChars: 3600, assistantMaxChars: 700 };
  }
  if (mode === "conversation") {
    return { systemMaxChars: 560, userMaxChars: 6000, assistantMaxChars: 1000 };
  }
  return { systemMaxChars: 560, userMaxChars: 6000, assistantMaxChars: 1000 };
}

export function providerFailureStatus(error) {
  const direct = Number(error?.status || error?.providerStatus || error?.providerCode || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = String(error?.message || error || "").match(/(?:^|\D)(408|409|425|429|498|500|502|503|504|524|529)(?:\D|$)/);
  return match ? Number(match[1]) : 0;
}

export function isTransientProviderFailure(error) {
  if (TRANSIENT_PROVIDER_STATUSES.has(providerFailureStatus(error))) return true;
  return /temporar|timed? out|timeout|network|failed to fetch|load failed|connection reset|socket|overloaded|capacity|service unavailable|rate.?limit|too many requests|stopped responding|empty response|no final text/i.test(
    String(error?.message || error || "")
  );
}

export function providerRetryDelayMs(error, attempt = 0, provider = "") {
  const explicit = Number(error?.retryAfterMs || 0);
  if (Number.isFinite(explicit) && explicit > 0) {
    return clamp(explicit + 250, 500, PROVIDER_RETRY_MAX_DELAY_MS, 1_250);
  }

  const base = String(provider).toLowerCase() === "ollama" ? 450 : 1_250;
  return clamp(base * (2 ** Math.max(0, Number(attempt || 0))), 350, PROVIDER_RETRY_MAX_DELAY_MS, base);
}
