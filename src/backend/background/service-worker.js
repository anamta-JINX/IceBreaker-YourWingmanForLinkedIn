import { OFFICIAL_API_KEYS } from "../config/official-api-keys.js";

const CONTENT_SCRIPT_VERSION = "1.4.90";

let embeddedEnvPromise = null;

function parseEmbeddedEnv(text) {
  const values = {};
  for (const rawLine of String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    line = line.replace(/^export\s+/i, "");
    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) continue;

    const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[name] = value;
  }
  return values;
}

async function loadEmbeddedEnv() {
  if (!embeddedEnvPromise) {
    embeddedEnvPromise = (async () => {
      for (const filename of ["config/.env", "config/.env.local"]) {
        try {
          const response = await fetch(chrome.runtime.getURL(filename), { cache: "no-store" });
          if (!response.ok) continue;
          const values = parseEmbeddedEnv(await response.text());
          if (Object.keys(values).length) return values;
        } catch (_) {
          // Keep checking supported local configuration files.
        }
      }
      return {};
    })();
  }
  return embeddedEnvPromise;
}

const DEFAULT_SETTINGS = {
  schemaVersion: 24,
  generationMode: "dms",
  provider: "ollama",
  defaultTone: "professional",
  defaultLength: "medium",
  autoGenerate: true,
  hoverDelay: 850,
  matchThreshold: 45,
  senderName: "",
  professionalHeadline: "",
  targetRoles: "",
  profileLocation: "",
  contactEmail: "",
  contactPhone: "",
  experienceLevel: "",
  workPreference: "",
  availability: "",
  coreSkills: "",
  preferredIndustries: "",
  outreachGoal: "opportunities",
  customBio: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  ollamaEndpoint: "http://127.0.0.1:11434",
  ollamaModel: "",
  ollamaKeepAlive: "-1",
  apiAccessMode: "official",
  manualApiKey: "",
  manualApiProvider: "",
  openRouterApiKey: "",
  openRouterModel: "openrouter/free",
  groqApiKey: "",
  groqModel: "llama-3.1-8b-instant"
};

const AUTOPILOT_FIXED_CONTACT_CATEGORIES = [
  "Recruiter",
  "Technical Recruiter",
  "Talent Acquisition",
  "HR / People",
  "Hiring Manager",
  "Founder / CEO / CTO",
  "Engineering Manager",
  "Team / Technical Lead"
];

const DEFAULT_AUTOPILOT_SETTINGS = {
  selectionMode: "all_connections",
  targetTags: [...AUTOPILOT_FIXED_CONTACT_CATEGORIES],
  targetTitles: [],
  includeTitleKeywords: [],
  excludeKeywords: [],
  companyKeywords: [],
  locationKeywords: [],
  desiredRoles: ["AI Engineer"],
  exactTitleOnly: false,
  draftLimit: 5,
  timeSpanMinutes: 5,
  minMatchScore: 65,
  maxDraftsPerCompany: 2,
  consecutiveErrorLimit: 3,
  connectionsOnly: true,
  skipPreviouslyDrafted: true,
  skipPreviouslyChecked: true,
  skipExistingDraft: true,
  skipExistingConversation: false,
  safeAssistMode: false,
  attachResume: true,
  skipDuplicates: true,
  stopOnProviderFailure: false,
  stopOnRecipientFailure: true,
  minimiseComposer: true,
  fastMode: true,
  highlightCurrentCard: true,
  vibe: "professional",
  length: "medium"
};

const DEFAULT_AUTOPILOT_STATE = {
  runId: "",
  status: "stopped",
  tabId: null,
  startedAt: null,
  finishedAt: null,
  nextDraftAt: null,
  lastDraftAt: null,
  queueSize: 0,
  current: { profileId: "", profileName: "", detectedTitle: "", action: "Ready" },
  progress: { checked: 0, matched: 0, skipped: 0, draftsPrepared: 0, errors: 0 },
  processedProfiles: [],
  failedProfiles: [],
  activityLog: [],
  diagnosticCounts: {},
  lastDiagnostic: "",
  lastDiagnosticCode: "",
  lastError: "",
  lastErrorCode: "",
  rootCauseCode: "",
  rootCauseMessage: ""
};

const AUTOPILOT_ALARM = "icebreaker-autopilot-process";
const AUTOPILOT_MAX_DRAFTS = 200;
const AUTOPILOT_MAX_LOGS = 150;
const AUTOPILOT_MAX_PROFILE_MEMORY = 5000;
let autopilotQueueProcessing = false;

const COPY_SHORTCUT_COMMAND = "force-generate-and-copy";
const REGENERATE_SHORTCUT_COMMAND = "regenerate-current-text";
const AUTOPILOT_SHORTCUT_COMMAND = "start-autopilot-from-hover";
let autopilotMemoryWriteChain = Promise.resolve();
const generationJobs = new Map();
let latestHoveredSignature = "";
let activeGenerationRequest = null;
const sidePanelLifecyclePorts = new Set();
const sidePanelDraftRequests = new Map();
let sidePanelActive = false;

chrome.runtime.onConnect.addListener((port) => {
  if (port?.name !== "ICEBREAKER_SIDEPANEL_LIFECYCLE") return;

  sidePanelLifecyclePorts.add(port);
  port.onMessage.addListener((message) => {
    if (message?.type !== "ICEBREAKER_CURRENT_DRAFT" || !message.requestId) return;
    const pending = sidePanelDraftRequests.get(message.requestId);
    if (!pending) return;
    sidePanelDraftRequests.delete(message.requestId);
    clearTimeout(pending.timeoutId);
    pending.resolve(message.draft && typeof message.draft === "object" ? message.draft : null);
  });

  if (!sidePanelActive) {
    sidePanelActive = true;
    void broadcastToLinkedInTabs({ type: "ICEBREAKER_PANEL_ACTIVE", active: true });
  }

  port.onDisconnect.addListener(() => {
    sidePanelLifecyclePorts.delete(port);
    if (sidePanelLifecyclePorts.size === 0) void stopIceBreakerForClosedPanel();
  });
});

async function requestCurrentSidePanelDraft() {
  if (!sidePanelLifecyclePorts.size) return null;
  const requestId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      sidePanelDraftRequests.delete(requestId);
      resolve(null);
    }, 350);
    sidePanelDraftRequests.set(requestId, { resolve, timeoutId });

    let delivered = false;
    for (const port of sidePanelLifecyclePorts) {
      try {
        port.postMessage({ type: "ICEBREAKER_GET_CURRENT_DRAFT", requestId });
        delivered = true;
      } catch (_) {}
    }
    if (!delivered) {
      clearTimeout(timeoutId);
      sidePanelDraftRequests.delete(requestId);
      resolve(null);
    }
  });
}

async function stopIceBreakerForClosedPanel() {
  if (sidePanelLifecyclePorts.size > 0) return;
  sidePanelActive = false;
  latestHoveredSignature = "";

  const request = activeGenerationRequest;
  if (request) {
    request.cancelledByUser = true;
    try { request.controller.abort("side-panel-closed"); } catch (_) {}
  }

  await broadcastToLinkedInTabs({ type: "ICEBREAKER_PANEL_ACTIVE", active: false });
  if (sidePanelLifecyclePorts.size > 0) return;

  try {
    const { autopilotState } = await chrome.storage.local.get("autopilotState");
    const status = String(autopilotState?.status || "").toLowerCase();
    if (["starting", "running", "paused"].includes(status)) {
      await controlAutopilot("STOP_AUTOPILOT");
    }
  } catch (_) {
    // Closing the panel must remain silent even if LinkedIn has already navigated away.
  }
}
const OLLAMA_MODEL_CACHE_TTL_MS = 30000;
const ollamaModelCache = new Map();
const ollamaWarmups = new Map();
const OPENROUTER_FREE_MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
let openRouterFreeModelCache = { expiresAt: 0, models: [] };
const PROJECT_SELECTION_HISTORY_KEY = "projectSelectionHistory";
const PROJECT_SELECTION_RECENT_LIMIT = 120;
const WORD_RANGES = Object.freeze({
  short: Object.freeze({ min: 12, max: 20 }),
  medium: Object.freeze({ min: 24, max: 40 }),
  long: Object.freeze({ min: 50, max: 90 })
});

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get("settings");
  const existing = stored.settings || {};
  const migrated = {
    ...DEFAULT_SETTINGS,
    ...existing,
    schemaVersion: 24,
    generationMode: normalizeMode(existing.generationMode),
    autoGenerate: Number(existing.schemaVersion || 0) >= 4 ? existing.autoGenerate !== false : true,
    hoverDelay: Number(existing.hoverDelay || DEFAULT_SETTINGS.hoverDelay),
    ollamaEndpoint: normalizeOllamaEndpoint(existing.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint),
    apiAccessMode: normalizeApiAccessMode(existing.apiAccessMode),
    manualApiKey: migrateManualApiKey(existing),
    manualApiProvider: detectApiProvider(migrateManualApiKey(existing)),
    ollamaKeepAlive: String(existing.ollamaKeepAlive || DEFAULT_SETTINGS.ollamaKeepAlive) === "30m" ? "-1" : String(existing.ollamaKeepAlive || DEFAULT_SETTINGS.ollamaKeepAlive),
    openRouterModel: !existing.openRouterModel || existing.openRouterModel === "openrouter/auto" ? "openrouter/free" : existing.openRouterModel,
    groqModel: !existing.groqModel || existing.groqModel === "openai/gpt-oss-20b" ? "llama-3.1-8b-instant" : existing.groqModel
  };

  const autopilotStored = await chrome.storage.local.get(["autopilotSettings", "autopilotState", "autopilotProfileMemory", "autopilotDrafts"]);
  const autopilotSettings = { ...normalizeAutopilotSettings(autopilotStored.autopilotSettings), minimiseComposer: true, fastMode: true };
  const legacyDirectDrafts = (Array.isArray(autopilotStored.autopilotDrafts) ? autopilotStored.autopilotDrafts : [])
    .filter((draft) => draft?.composeMethod === "direct-compose-tab");
  const invalidDirectProfileIds = new Set(legacyDirectDrafts.map((draft) => String(draft?.profileId || "").trim().toLowerCase()).filter(Boolean));
  const autopilotDrafts = (Array.isArray(autopilotStored.autopilotDrafts) ? autopilotStored.autopilotDrafts : [])
    .filter((draft) => draft?.composeMethod !== "direct-compose-tab");
  const autopilotProfileMemory = buildAutopilotProfileMemory(
    autopilotStored.autopilotProfileMemory,
    autopilotStored.autopilotState,
    autopilotDrafts
  ).filter((record) => !(record.outcome === "saved" && invalidDirectProfileIds.has(record.profileId)))
    .filter((record) => !["AP-S103", "LEGACY_CHECKED"].includes(record.code));
  const autopilotState = normalizeAutopilotState({
    ...DEFAULT_AUTOPILOT_STATE,
    status: "stopped",
    current: { ...DEFAULT_AUTOPILOT_STATE.current, action: "Ready — open LinkedIn results and start Autopilot" }
  });
  await chrome.storage.local.set({ settings: migrated, autopilotSettings, autopilotState, autopilotQueue: [], autopilotProfileMemory, autopilotDrafts, autopilotMatchPolicyVersion: 2 });
  await chrome.storage.local.remove("autopilotResumeFile");
  await migrateAutopilotResumeProfiles();
  await configureSidePanel();
  await protectLocalStorage();
  await injectIntoOpenLinkedInTabs();
  void warmConfiguredOllama();
});

chrome.runtime.onStartup.addListener(async () => {
  await configureSidePanel();
  await protectLocalStorage();
  await restoreAutopilotSchedule();
  void warmConfiguredOllama();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === COPY_SHORTCUT_COMMAND) void handleCopyGeneratedText();
  if (command === REGENERATE_SHORTCUT_COMMAND) void handleRegenerateCurrentText();
  if (command === AUTOPILOT_SHORTCUT_COMMAND) void handleStartAutopilotFromHover();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === AUTOPILOT_ALARM) void processAutopilotQueue();
});

async function configureSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn("IceBreaker: could not configure side panel", error);
  }
}

async function protectLocalStorage() {
  try {
    await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  } catch (error) {
    console.warn("IceBreaker: storage access level unavailable", error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "CONVERSATION_CAPTURE_DIAGNOSTIC") {
    const code = normalizeConversationErrorCode(message.code || message.errorCode || message.error);
    const error = ensureConversationErrorCode(message.error || "Conversation capture failed.", code);
    const failed = {
      status: "error",
      source: "conversation-capture",
      profile: { mode: "conversation" },
      error,
      errorCode: code,
      createdAt: new Date().toISOString()
    };
    chrome.storage.session.set({ latestGeneration: failed })
      .then(() => notifyExtensionPages({ type: "GENERATION_ERROR", source: "conversation-capture", error, errorCode: code }))
      .then(() => sendResponse({ ok: true, code, errorCode: code }))
      .catch((diagnosticError) => sendResponse({ ok: false, code, errorCode: code, error: friendlyError(diagnosticError) }));
    return true;
  }

  if (["CONTEXT_HOVERED", "PROFILE_HOVERED", "CONVERSATION_HOVERED_GENERATE"].includes(message.type)) {
    handleIncomingProfile(message.context || message.profile, sender, {
      acceptExplicitMode: message.type === "CONVERSATION_HOVERED_GENERATE"
    })
      .then(sendResponse)
      .catch((error) => {
        const isConversation = message.type === "CONVERSATION_HOVERED_GENERATE" || normalizeMode(message.context?.mode || message.profile?.mode) === "conversation";
        const code = isConversation ? normalizeConversationErrorCode(error) : "";
        const friendly = friendlyError(error);
        sendResponse({
          ok: false,
          error: isConversation ? ensureConversationErrorCode(friendly, code) : friendly,
          ...(isConversation ? { code, errorCode: code } : {})
        });
      });
    return true;
  }

  if (message.type === "GET_PUBLIC_SETTINGS") {
    loadContext()
      .then(({ settings }) => sendResponse({
        ok: true,
        hoverDelay: Number(settings.hoverDelay || DEFAULT_SETTINGS.hoverDelay),
        autoGenerate: settings.autoGenerate !== false,
        generationMode: normalizeMode(settings.generationMode),
        senderName: String(settings.senderName || "").trim(),
        panelActive: sidePanelActive
      }))
      .catch(() => sendResponse({ ok: true, hoverDelay: DEFAULT_SETTINGS.hoverDelay, autoGenerate: true, generationMode: "dms", senderName: DEFAULT_SETTINGS.senderName, panelActive: sidePanelActive }));
    return true;
  }

  if (message.type === "GET_ACTIVE_PROFILE") {
    chrome.storage.session.get("activeProfile")
      .then(({ activeProfile }) => sendResponse({ ok: true, profile: activeProfile || null }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "GET_GENERATION_STATE") {
    chrome.storage.session.get("latestGeneration")
      .then(({ latestGeneration }) => sendResponse({ ok: true, generation: latestGeneration || null }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "GENERATE_OUTREACH") {
    const payload = message.payload || {};
    runGenerationFlow({
      profile: payload.profile,
      source: payload.source || "panel",
      force: payload.force !== false,
      previousMessage: payload.previousMessage || "",
      tone: payload.tone || "",
      length: payload.length || "",
      tabId: payload.profile?.tabId || null,
      allowJoin: false
    })
      .then(({ result }) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }


  if (message.type === "CANCEL_GENERATION") {
    const request = activeGenerationRequest;
    if (request) {
      request.cancelledByUser = true;
      request.controller.abort("user-cancelled");
    }
    sendResponse({ ok: true, cancelled: Boolean(request) });
    return false;
  }

  if (message.type === "TEST_PROVIDER") {
    testProvider()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "LIST_OLLAMA_MODELS") {
    listOllamaModels()
      .then((models) => sendResponse({ ok: true, models }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "LIST_PROVIDER_MODELS") {
    listProviderModels(String(message.provider || ""))
      .then((models) => sendResponse({ ok: true, models }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }


  if (message.type === "UPDATE_MODE") {
    updateGenerationMode(message.mode)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "UPDATE_ENGINE_SELECTION") {
    updateEngineSelection(message.provider, message.model, message.apiAccessMode)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "GET_AUTOPILOT_STATE") {
    getAutopilotBundle()
      .then((bundle) => sendResponse({ ok: true, ...bundle }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "SAVE_AUTOPILOT_SETTINGS") {
    saveAutopilotSettings(message.settings)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "START_AUTOPILOT") {
    startAutopilot(message.settings)
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (["PAUSE_AUTOPILOT", "RESUME_AUTOPILOT", "STOP_AUTOPILOT"].includes(message.type)) {
    controlAutopilot(message.type)
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "AUTOPILOT_STATE_UPDATE") {
    handleAutopilotStateUpdate(message.state, sender?.tab)
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "GET_ICEBREAKER_MESSAGE_FOR_PROFILE") {
    getIceBreakerMessageForProfile(message.profile, sender?.tab)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error), errorCode: autopilotErrorCode(error) }));
    return true;
  }

  if (message.type === "AUTOPILOT_GENERATE") {
    const payload = message.payload || {};
    generateAutopilotDraft(payload, sender?.tab)
      .then((data) => sendResponse({ ok: true, ...data }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error), errorCode: autopilotErrorCode(error) }));
    return true;
  }

  if (message.type === "AUTOPILOT_EVENT") {
    handleAutopilotEvent(message.runId, message.event, sender?.tab)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "AUTOPILOT_CREATE_DRAFT_TAB") {
    createAutopilotDraftTab(message.payload, sender?.tab)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, code: error?.code || "AP-E218", error: friendlyError(error) }));
    return true;
  }

  if (message.type === "AUTOPILOT_PROFILE_MEMORY") {
    rememberAutopilotProfile(message.runId, message.record)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "AUTOPILOT_PROFILE_MEMORY_BATCH") {
    rememberAutopilotProfiles(message.runId, message.records)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: friendlyError(error) }));
    return true;
  }

  if (message.type === "SETTINGS_UPDATED") {
    broadcastToLinkedInTabs({ type: "ICEBREAKER_SETTINGS_UPDATED" });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

async function handleIncomingProfile(profile, sender, { acceptExplicitMode = false } = {}) {
  if (!sidePanelActive) return { ok: true, generated: false, ignored: true, reason: "side-panel-closed" };
  const { settings, resumeText } = await loadContext();
  const mode = normalizeMode(profile?.mode || settings.generationMode);
  if (!acceptExplicitMode && mode !== normalizeMode(settings.generationMode)) return { ok: true, generated: false, ignored: true };
  const normalized = await storeActiveProfile({ ...profile, mode }, sender?.tab);
  const signature = profileSignature(normalized);
  latestHoveredSignature = signature;

  if (settings.autoGenerate === false) {
    return { ok: true, profile: normalized, generated: false };
  }
  if (mode === "dms" && !resumeText) {
    await notifyExtensionPages({
      type: "GENERATION_ERROR",
      source: "hover",
      profile: normalized,
      error: "Add your résumé in IceBreaker Settings before automatic DM generation."
    });
    return { ok: true, profile: normalized, generated: false, error: "Résumé required" };
  }

  const { latestGeneration } = await chrome.storage.session.get("latestGeneration");
  if (
    latestGeneration?.status === "success" &&
    latestGeneration.profileSignature === signature &&
    latestGeneration.result?.message
  ) {
    return { ok: true, profile: normalized, generated: true, messageReady: true, cached: true };
  }

  try {
    const { result } = await runGenerationFlow({
      profile: normalized,
      source: "hover",
      force: true,
      previousMessage: "",
      tabId: normalized.tabId,
      allowJoin: true
    });
    return { ok: true, profile: normalized, generated: true, messageReady: Boolean(result?.message) };
  } catch (error) {
    const friendly = friendlyError(error);
    if (mode === "conversation") {
      const code = normalizeConversationErrorCode(error);
      return {
        ok: false,
        profile: normalized,
        generated: false,
        error: ensureConversationErrorCode(friendly, code),
        code,
        errorCode: code
      };
    }
    return { ok: false, profile: normalized, generated: false, error: friendly };
  }
}

async function getIceBreakerMessageForProfile(profile, tab) {
  const normalized = await storeActiveProfile({ ...(profile || {}), mode: "dms" }, tab);
  const signature = profileSignature(normalized);
  latestHoveredSignature = signature;

  const stored = await chrome.storage.local.get(["autopilotSettings", "autopilotResumeProfiles"]);
  const autopilotSettings = normalizeAutopilotSettings(stored.autopilotSettings);
  const resumes = normalizeAutopilotResumeProfiles(stored.autopilotResumeProfiles);
  if (!resumes.length) throw new Error("Add your résumé in Autopilot Settings before running Autopilot.");
  const choice = chooseAutopilotRoleAndResume(autopilotSettings, resumes, normalized);

  // Do not reuse a normal hover generation here. Autopilot has a deliberately
  // compact prompt so a batch run cannot exhaust cloud-provider token limits.
  const { result } = await runGenerationFlow({
    profile: normalized,
    source: "autopilot",
    force: true,
    previousMessage: "",
    tone: autopilotSettings.vibe,
    length: autopilotSettings.length,
    tabId: normalized.tabId,
    allowJoin: false,
    resumeTextOverride: choice.resume.extractedText,
    targetRoleOverride: choice.desiredRole,
    resumeProfileName: choice.resume.label || choice.resume.fileName || "Résumé"
  });
  if (!result?.message) throw new Error("IceBreaker did not produce a message for this profile.");
  return {
    message: result.message,
    result,
    source: result.fallbackUsed ? "autopilot-local-fallback" : "autopilot-ai",
    fallbackUsed: Boolean(result.fallbackUsed),
    fallbackReason: result.fallbackReason || ""
  };
}

async function handleCopyGeneratedText() {
  let tab = null;
  try {
    [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !String(tab.url || "").includes("linkedin.com")) {
      throw new Error("Open LinkedIn before pressing Alt+C.");
    }

    await ensureContentScript(tab.id);
    const livePanelDraft = await requestCurrentSidePanelDraft();
    const stored = await chrome.storage.session.get(["sidePanelDraft", "latestGeneration"]);
    const panelDraft = livePanelDraft || (stored.sidePanelDraft && typeof stored.sidePanelDraft === "object"
      ? stored.sidePanelDraft
      : null);
    const latest = stored.latestGeneration;
    const textToCopy = String(
      panelDraft
        ? (panelDraft.clipboardText || panelDraft.text || "")
        : (latest?.status === "success" ? latest?.result?.message : "")
    ).trim();

    if (!textToCopy) {
      throw new Error("There is no generated IceBreaker text to copy yet. Press Alt+G or use Refresh first.");
    }

    await copyTextToLinkedInTab(tab.id, textToCopy);
    const copiedResult = panelDraft?.text
      ? { ...(latest?.result || {}), message: panelDraft.text }
      : (latest?.result || { message: textToCopy });
    await notifyExtensionPages({
      type: "MESSAGE_COPIED",
      profile: panelDraft?.profile || latest?.profile || null,
      result: copiedResult,
      source: "copy-shortcut"
    });
  } catch (error) {
    const friendly = friendlyError(error);
    await notifyExtensionPages({ type: "GENERATION_ERROR", source: "copy-shortcut", error: friendly });
  }
}

async function handleRegenerateCurrentText() {
  let tab = null;
  try {
    [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !String(tab.url || "").includes("linkedin.com")) {
      throw new Error("Open LinkedIn in the correct IceBreaker mode before pressing Alt+G.");
    }

    await ensureContentScript(tab.id);
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (_) {}

    const capture = await sendToLinkedInTab(tab.id, { type: "GET_ACTIVE_CONTEXT_V2" });
    const capturedContext = capture?.context || capture?.profile;
    if (!capture?.ok || (!capturedContext?.name && !capturedContext?.description)) {
      throw new Error(capture?.error || "No usable LinkedIn context was found for the selected mode.");
    }

    const profile = await storeActiveProfile(capturedContext, tab);
    const signature = profileSignature(profile);
    latestHoveredSignature = signature;

    const livePanelDraft = await requestCurrentSidePanelDraft();
    const stored = await chrome.storage.session.get(["sidePanelDraft", "latestGeneration"]);
    const panelDraft = livePanelDraft || (stored.sidePanelDraft && typeof stored.sidePanelDraft === "object"
      ? stored.sidePanelDraft
      : null);
    const latest = stored.latestGeneration;
    const matchingPanelDraft = panelDraft?.profile && profileSignature(panelDraft.profile) === signature
      ? panelDraft.text
      : "";
    const previousMessage = String(
      matchingPanelDraft ||
      (latest?.status === "success" && latest?.profileSignature === signature ? latest?.result?.message : "") ||
      ""
    ).trim();

    await runGenerationFlow({
      profile,
      source: "shortcut-refresh",
      force: true,
      previousMessage,
      tabId: tab.id,
      allowJoin: false
    });
  } catch (error) {
    const friendly = friendlyError(error);
    await notifyExtensionPages({ type: "GENERATION_ERROR", source: "shortcut-refresh", error: friendly });
  }
}

async function storeActiveProfile(profile, tab) {
  if (!profile?.name && !profile?.description) throw new Error("No usable LinkedIn context was found.");
  const normalized = {
    ...profile,
    tabId: tab?.id || profile.tabId || null,
    capturedAt: new Date().toISOString()
  };
  await chrome.storage.session.set({ activeProfile: normalized });
  await notifyExtensionPages({ type: "PROFILE_CAPTURED", profile: normalized });
  return normalized;
}

async function runGenerationFlow({ profile, source, force, previousMessage, tone, length, tabId, allowJoin, resumeTextOverride = "", targetRoleOverride = "", resumeProfileName = "" }) {
  if (!profile?.name && !profile?.description) throw new Error("Capture LinkedIn content for the selected mode first.");
  const signature = profileSignature(profile);
  if (allowJoin && generationJobs.has(signature)) return generationJobs.get(signature);

  // Autopilot must never share a normal hover request. A hover request can use
  // the full profile/résumé prompt and was the main cause of duplicate Groq
  // requests and TPM 429 errors when Alt+S was pressed while hover generation
  // was still running. Keep only one provider request active at a time.
  const request = {
    signature,
    source,
    controller: new AbortController()
  };
  if (activeGenerationRequest) {
    activeGenerationRequest.controller.abort(source === "autopilot" ? "autopilot-preempted" : "superseded");
  }
  activeGenerationRequest = request;

  const job = (async () => {
    try {
      const started = {
        status: "busy",
        source,
        profile,
        profileSignature: signature,
        createdAt: new Date().toISOString()
      };
      await chrome.storage.session.set({ latestGeneration: started });
      await notifyExtensionPages({ type: "GENERATION_STARTED", source, profile });
      if (tabId) await safeSendToTab(tabId, { type: "SHOW_ICEBREAKER_BADGE", text: "Generating…" });

      const result = await generateOutreach({
        profile,
        source,
        force,
        previousMessage,
        tone,
        length,
        resumeTextOverride,
        targetRoleOverride,
        resumeProfileName,
        signal: request.controller.signal,
        onProgress: async (detail) => {
          if (source !== "hover" || latestHoveredSignature === signature) {
            await notifyExtensionPages({ type: "GENERATION_PROGRESS", source, profile, detail });
          }
        }
      });
      const completed = {
        status: "success",
        source,
        profile,
        profileSignature: signature,
        result,
        createdAt: new Date().toISOString()
      };

      const isCurrentHover = source !== "hover" || latestHoveredSignature === signature;
      if (isCurrentHover) {
        await chrome.storage.session.set({ latestGeneration: completed });
        await notifyExtensionPages({ type: "GENERATION_COMPLETE", source, profile, result });
        if (tabId) await safeSendToTab(tabId, { type: "SHOW_ICEBREAKER_BADGE", text: "Message ready" });
      }
      return { profile, result };
    } catch (error) {
      const userCancelled = request.cancelledByUser || request.controller.signal.reason === "user-cancelled";
      const replaced = ["superseded", "autopilot-preempted"].includes(String(request.controller.signal.reason || ""));
      if (userCancelled) {
        const cancelled = {
          status: "cancelled",
          source,
          profile,
          profileSignature: signature,
          createdAt: new Date().toISOString()
        };
        await chrome.storage.session.set({ latestGeneration: cancelled }).catch(() => {});
        await notifyExtensionPages({ type: "GENERATION_CANCELLED", source, profile });
        if (tabId) await safeSendToTab(tabId, { type: "SHOW_ICEBREAKER_BADGE", text: "Stopped" });
        throw new Error("Generation stopped by user.");
      }

      if (replaced) {
        // A newer generation owns the UI now. Do not surface the intentionally
        // cancelled older hover request as an IceBreaker failure.
        throw new Error("Generation was replaced by a newer IceBreaker request.");
      }

      const friendly = friendlyError(error);
      const failed = {
        status: "error",
        source,
        profile,
        profileSignature: signature,
        error: friendly,
        createdAt: new Date().toISOString()
      };
      const isCurrentHover = source !== "hover" || latestHoveredSignature === signature;
      if (isCurrentHover) {
        await chrome.storage.session.set({ latestGeneration: failed }).catch(() => {});
        await notifyExtensionPages({ type: "GENERATION_ERROR", source, profile, error: friendly });
        if (tabId) await safeSendToTab(tabId, { type: "SHOW_ICEBREAKER_BADGE", text: "Generation failed" });
      }
      throw error;
    } finally {
      if (activeGenerationRequest === request) activeGenerationRequest = null;
    }
  })();

  generationJobs.set(signature, job);
  try {
    return await job;
  } finally {
    if (generationJobs.get(signature) === job) generationJobs.delete(signature);
  }
}

async function notifyExtensionPages(message) {
  try {
    await chrome.runtime.sendMessage(message);
  } catch (_) {}
}

async function safeSendToTab(tabId, message) {
  if (!tabId) return null;
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (_) {
    try {
      await ensureContentScript(tabId);
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (_) {
      return null;
    }
  }
}

async function sendToLinkedInTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    await ensureContentScript(tabId);
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (_) {
      throw new Error("IceBreaker could not connect to this LinkedIn tab. Refresh the LinkedIn page once, then try again.");
    }
  }
}

async function ensureContentScript(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "ICEBREAKER_PING_V2" });
    if (ping?.ok && ping.version === CONTENT_SCRIPT_VERSION) return;
  } catch (_) {}

  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["src/backend/content/linkedin-content.css"] });
  } catch (_) {}
  await chrome.scripting.executeScript({ target: { tabId }, files: ["src/backend/content/linkedin-content.js"] });
  await new Promise((resolve) => setTimeout(resolve, 120));
}

async function waitForLinkedInTabReady(tabId, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    let tab = null;
    try { tab = await chrome.tabs.get(tabId); } catch (_) {}
    if (!tab) throw new Error("The LinkedIn compose tab closed before the draft was prepared.");
    if (tab.status === "complete" && /^https:\/\/www\.linkedin\.com\//i.test(tab.url || "")) return tab;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const error = new Error("LinkedIn’s direct compose page did not finish loading.");
  error.code = "AP-E218";
  throw error;
}

async function createAutopilotDraftTab(payload, sourceTab = null) {
  const composeUrl = String(payload?.composeUrl || "").trim();
  let parsed = null;
  try { parsed = new URL(composeUrl); } catch (_) {}
  if (!parsed || parsed.protocol !== "https:" || !(parsed.hostname === "linkedin.com" || parsed.hostname.endsWith(".linkedin.com")) || !/\/messaging\/(?:compose|thread)\//i.test(parsed.pathname)) {
    const error = new Error("A valid LinkedIn direct-compose URL was not available for this profile.");
    error.code = "AP-E218";
    throw error;
  }

  const createOptions = { url: parsed.href, active: false };
  if (sourceTab?.id && Number.isInteger(sourceTab.windowId)) {
    createOptions.windowId = sourceTab.windowId;
    createOptions.openerTabId = sourceTab.id;
  }

  const tab = await chrome.tabs.create(createOptions);
  if (!tab?.id) {
    const error = new Error("Chrome could not open LinkedIn’s direct compose page.");
    error.code = "AP-E218";
    throw error;
  }

  let keepOpen = false;
  try {
    await waitForLinkedInTabReady(tab.id, 35000);
    await ensureContentScript(tab.id);

    let response = null;
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await sendToLinkedInTab(tab.id, { type: "AUTOPILOT_FILL_DIRECT_COMPOSER", payload });
      } catch (error) {
        lastError = friendlyError(error);
      }
      if (response?.ok && response.draftSaved) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return response;
      }
      if (response?.skipped) return response;
      lastError = response?.error || lastError || "LinkedIn did not preserve the draft.";
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    const error = new Error(lastError || "LinkedIn’s direct compose page did not preserve the draft.");
    error.code = response?.code || "AP-E218";
    throw error;
  } catch (error) {
    // Keep the failed compose tab open only when LinkedIn presents a visible
    // security challenge so the user can solve it manually.
    try {
      const current = await chrome.tabs.get(tab.id);
      keepOpen = /checkpoint|challenge|captcha|login|authwall/i.test(current?.url || "");
    } catch (_) {}
    throw error;
  } finally {
    if (!keepOpen) {
      try { await chrome.tabs.remove(tab.id); } catch (_) {}
    }
  }
}

async function injectIntoOpenLinkedInTabs() {
  const tabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
  await Promise.allSettled(tabs.filter((tab) => tab.id).map((tab) => ensureContentScript(tab.id)));
}

async function broadcastToLinkedInTabs(message) {
  const tabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
  await Promise.allSettled(tabs.filter((tab) => tab.id).map((tab) => safeSendToTab(tab.id, message)));
}

async function copyTextToLinkedInTab(tabId, text) {
  const response = await sendToLinkedInTab(tabId, { type: "COPY_TEXT_TO_CLIPBOARD", text });
  if (!response?.ok) throw new Error(response?.error || "Chrome blocked clipboard access.");
}

function normalizeAutopilotSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const roles = Array.isArray(source.desiredRoles)
    ? source.desiredRoles
    : String(source.desiredRole || "").split(/[;,\n]+/);
  const desiredRoles = [...new Set(roles.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 3);
  return {
    ...DEFAULT_AUTOPILOT_SETTINGS,
    ...source,
    selectionMode: ["all_connections", "hiring_contacts", "custom_titles"].includes(source.selectionMode)
      ? source.selectionMode
      : "all_connections",
    targetTags: normalizeAutopilotList(source.targetTags).length
      ? normalizeAutopilotList(source.targetTags)
      : [...AUTOPILOT_FIXED_CONTACT_CATEGORIES],
    targetTitles: normalizeAutopilotList(source.targetTitles),
    includeTitleKeywords: normalizeAutopilotList(source.includeTitleKeywords || source.includeTitles),
    excludeKeywords: normalizeAutopilotList(source.excludeKeywords || source.excludeTitles),
    companyKeywords: normalizeAutopilotList(source.companyKeywords || source.targetCompanies),
    locationKeywords: normalizeAutopilotList(source.locationKeywords || source.targetLocations),
    desiredRoles: desiredRoles.length ? desiredRoles : [...DEFAULT_AUTOPILOT_SETTINGS.desiredRoles],
    draftLimit: Math.max(1, Math.min(20, Number(source.draftLimit || DEFAULT_AUTOPILOT_SETTINGS.draftLimit))),
    timeSpanMinutes: 5,
    minMatchScore: [35, 65, 100].includes(Number(source.minMatchScore)) ? Number(source.minMatchScore) : DEFAULT_AUTOPILOT_SETTINGS.minMatchScore,
    maxDraftsPerCompany: Math.max(1, Math.min(10, Number(source.maxDraftsPerCompany || DEFAULT_AUTOPILOT_SETTINGS.maxDraftsPerCompany))),
    consecutiveErrorLimit: Math.max(1, Math.min(10, Number(source.consecutiveErrorLimit || DEFAULT_AUTOPILOT_SETTINGS.consecutiveErrorLimit))),
    connectionsOnly: source.connectionsOnly !== false,
    skipPreviouslyDrafted: source.skipPreviouslyDrafted !== false,
    skipPreviouslyChecked: source.skipPreviouslyChecked !== false,
    skipExistingDraft: source.skipExistingDraft !== false,
    skipExistingConversation: source.skipExistingConversation === true,
    exactTitleOnly: false,
    safeAssistMode: false,
    attachResume: true,
    skipDuplicates: source.skipDuplicates !== false,
    stopOnProviderFailure: false,
    stopOnRecipientFailure: source.stopOnRecipientFailure !== false,
    minimiseComposer: true,
    fastMode: true,
    highlightCurrentCard: source.highlightCurrentCard !== false,
    vibe: ["professional", "neutral", "engaging"].includes(source.vibe) ? source.vibe : "professional",
    length: ["short", "medium", "long"].includes(source.length) ? source.length : "medium"
  };
}


function normalizeAutopilotList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[,;\n]+/);
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 50);
}

function normalizeAutopilotState(value) {
  const source = value && typeof value === "object" ? value : {};
  const progress = source.progress && typeof source.progress === "object" ? source.progress : {};
  const current = source.current && typeof source.current === "object" ? source.current : {};
  const allowed = ["stopped", "starting", "running", "paused", "completed", "stopped-by-user", "error"];
  return {
    ...DEFAULT_AUTOPILOT_STATE,
    ...source,
    status: allowed.includes(source.status) ? source.status : "stopped",
    nextDraftAt: source.nextDraftAt || null,
    lastDraftAt: source.lastDraftAt || null,
    queueSize: Math.max(0, Number(source.queueSize || 0)),
    current: { ...DEFAULT_AUTOPILOT_STATE.current, ...current },
    progress: {
      checked: Math.max(0, Number(progress.checked || 0)),
      matched: Math.max(0, Number(progress.matched || 0)),
      skipped: Math.max(0, Number(progress.skipped || 0)),
      draftsPrepared: Math.max(0, Number(progress.draftsPrepared || 0)),
      errors: Math.max(0, Number(progress.errors || 0))
    },
    processedProfiles: Array.isArray(source.processedProfiles) ? source.processedProfiles.slice(-500) : [],
    failedProfiles: Array.isArray(source.failedProfiles) ? source.failedProfiles.slice(-200) : [],
    activityLog: Array.isArray(source.activityLog) ? source.activityLog.slice(-AUTOPILOT_MAX_LOGS) : [],
    diagnosticCounts: source.diagnosticCounts && typeof source.diagnosticCounts === "object" ? { ...source.diagnosticCounts } : {},
    lastDiagnostic: String(source.lastDiagnostic || ""),
    lastDiagnosticCode: String(source.lastDiagnosticCode || ""),
    lastError: String(source.lastError || ""),
    lastErrorCode: String(source.lastErrorCode || ""),
    rootCauseCode: String(source.rootCauseCode || ""),
    rootCauseMessage: String(source.rootCauseMessage || "")
  };
}

function normalizeAutopilotResumeProfiles(value) {
  const profiles = Array.isArray(value) ? value : [];
  return profiles.slice(0, 3).map((profile, index) => ({
    id: String(profile?.id || `resume-${index + 1}`),
    label: String(profile?.label || `Résumé ${index + 1}`).trim().slice(0, 80),
    fileName: String(profile?.fileName || "").trim().slice(0, 180),
    type: String(profile?.type || ""),
    size: Math.max(0, Number(profile?.size || 0)),
    base64: String(profile?.base64 || ""),
    extractedText: String(profile?.extractedText || "").trim().slice(0, 100000),
    roleTitles: [...new Set((Array.isArray(profile?.roleTitles) ? profile.roleTitles : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 20),
    savedAt: profile?.savedAt || new Date().toISOString()
  })).filter((profile) => profile.extractedText);
}

function normalizeAutopilotProfileMemory(value) {
  const records = Array.isArray(value) ? value : [];
  const byId = new Map();
  for (const item of records) {
    const profileId = String(item?.profileId || item?.id || "").trim().toLowerCase();
    if (!profileId) continue;
    byId.set(profileId, {
      profileId,
      profileName: String(item?.profileName || item?.name || "").trim().slice(0, 180),
      headline: String(item?.headline || "").trim().slice(0, 500),
      company: String(item?.company || "").trim().slice(0, 180),
      outcome: ["saved", "rejected", "failed", "skipped"].includes(item?.outcome) ? item.outcome : "skipped",
      code: String(item?.code || "").trim().slice(0, 40),
      reason: String(item?.reason || "").trim().slice(0, 1000),
      runId: String(item?.runId || "").trim().slice(0, 100),
      checkedAt: item?.checkedAt || new Date().toISOString()
    });
  }
  return [...byId.values()]
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
    .slice(-AUTOPILOT_MAX_PROFILE_MEMORY);
}

function buildAutopilotProfileMemory(memoryValue, stateValue, draftsValue) {
  const existing = normalizeAutopilotProfileMemory(memoryValue);
  const state = normalizeAutopilotState(stateValue);
  const drafts = Array.isArray(draftsValue) ? draftsValue : [];
  const failedById = new Map((state.failedProfiles || [])
    .map((failure) => [String(failure?.id || '').trim().toLowerCase(), failure])
    .filter(([id]) => id));
  const legacy = (state.processedProfiles || []).map((rawId) => {
    const profileId = String(rawId || '').trim().toLowerCase();
    const failure = failedById.get(profileId);
    return {
      profileId,
      profileName: failure?.profileName || failure?.name || '',
      outcome: failure ? 'failed' : 'skipped',
      code: failure?.code || 'LEGACY_CHECKED',
      reason: failure?.error || 'Migrated from the previous Autopilot run.',
      checkedAt: failure?.at || state.finishedAt || state.startedAt || new Date().toISOString(),
      runId: state.runId || ''
    };
  }).filter((record) => record.profileId);
  const saved = drafts.map((draft) => ({
    profileId: String(draft?.profileId || '').trim().toLowerCase(),
    profileName: draft?.profileName || '',
    headline: draft?.profileHeadline || '',
    company: draft?.profileCompany || '',
    outcome: 'saved',
    code: 'DRAFT_SAVED',
    reason: 'Migrated from the saved Autopilot drafts list.',
    checkedAt: draft?.createdAt || new Date().toISOString(),
    runId: ''
  })).filter((record) => record.profileId);
  return normalizeAutopilotProfileMemory([...existing, ...legacy, ...saved]);
}

async function migrateAutopilotProfileMemory() {
  const stored = await chrome.storage.local.get(["autopilotProfileMemory", "autopilotState", "autopilotDrafts"]);
  const memory = buildAutopilotProfileMemory(stored.autopilotProfileMemory, stored.autopilotState, stored.autopilotDrafts);
  await chrome.storage.local.set({ autopilotProfileMemory: memory });
  return memory;
}

async function migrateAutopilotMatchPolicy(memory) {
  const stored = await chrome.storage.local.get(["autopilotMatchPolicyVersion", "autopilotState"]);
  if (Number(stored.autopilotMatchPolicyVersion || 0) >= 2) return normalizeAutopilotProfileMemory(memory);

  // v1.4.74 changed the default matcher from hiring-contact-only to every
  // visible connection. Clear only obsolete classifier/legacy check records
  // once, while keeping verified saved drafts protected from duplication.
  const migrated = normalizeAutopilotProfileMemory(memory)
    .filter((record) => !["AP-S103", "LEGACY_CHECKED"].includes(record.code));
  const previousState = normalizeAutopilotState(stored.autopilotState);
  const resetState = normalizeAutopilotState({
    ...previousState,
    status: "stopped",
    processedProfiles: [],
    failedProfiles: (previousState.failedProfiles || []).filter((failure) => String(failure?.code || "") !== "AP-S103"),
    lastDiagnostic: previousState.lastDiagnosticCode === "AP-S103" ? "" : previousState.lastDiagnostic,
    lastDiagnosticCode: previousState.lastDiagnosticCode === "AP-S103" ? "" : previousState.lastDiagnosticCode,
    current: { ...previousState.current, action: "Ready — old title-classifier skips will be retried" }
  });
  await chrome.storage.local.set({
    autopilotProfileMemory: migrated,
    autopilotState: resetState,
    autopilotMatchPolicyVersion: 2
  });
  return migrated;
}

async function rememberAutopilotProfile(runId, record) {
  return rememberAutopilotProfiles(runId, [record]);
}

async function rememberAutopilotProfiles(runId, records) {
  const incoming = normalizeAutopilotProfileMemory((Array.isArray(records) ? records : []).map((record) => ({ ...(record || {}), runId })));
  if (!incoming.length) return { saved: false, count: 0 };

  const task = async () => {
    const stored = await chrome.storage.local.get("autopilotProfileMemory");
    const existing = normalizeAutopilotProfileMemory(stored.autopilotProfileMemory);
    const byId = new Map(existing.map((item) => [item.profileId, item]));
    for (const record of incoming) byId.set(record.profileId, record);
    const memory = normalizeAutopilotProfileMemory([...byId.values()]);
    await chrome.storage.local.set({ autopilotProfileMemory: memory });
    await notifyExtensionPages({ type: "AUTOPILOT_MEMORY_CHANGED", count: memory.length });
    return { saved: true, count: memory.length };
  };

  autopilotMemoryWriteChain = autopilotMemoryWriteChain.then(task, task);
  return autopilotMemoryWriteChain;
}

async function getAutopilotBundle() {
  const stored = await chrome.storage.local.get(["autopilotSettings", "autopilotState", "autopilotResumeProfiles", "autopilotDrafts", "autopilotQueue", "autopilotProfileMemory"]);
  const drafts = Array.isArray(stored.autopilotDrafts) ? stored.autopilotDrafts.slice(-AUTOPILOT_MAX_DRAFTS) : [];
  const profileMemory = normalizeAutopilotProfileMemory(stored.autopilotProfileMemory);
  return {
    settings: normalizeAutopilotSettings(stored.autopilotSettings),
    state: normalizeAutopilotState({ ...(stored.autopilotState || {}), queueSize: Array.isArray(stored.autopilotQueue) ? stored.autopilotQueue.length : 0 }),
    resumeProfiles: normalizeAutopilotResumeProfiles(stored.autopilotResumeProfiles).map(({ base64, extractedText, ...profile }) => ({ ...profile, characters: extractedText.length })),
    draftsCount: drafts.length,
    recentDrafts: drafts.slice(-5).reverse(),
    profileMemoryCount: profileMemory.length
  };
}

async function saveAutopilotSettings(value) {
  const settings = normalizeAutopilotSettings(value);
  if (!settings.desiredRoles.length) throw new Error("Add the role you are applying for, such as AI Engineer.");
  await chrome.storage.local.set({ autopilotSettings: settings });
  await notifyExtensionPages({ type: "AUTOPILOT_SETTINGS_UPDATED", settings });
  return settings;
}

function newAutopilotRunId() {
  return `ib-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function autopilotIntervalMs(_settings) {
  return 0;
}

function appendAutopilotLog(state, level, code, message, profileName = "") {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    level: ["info", "success", "warning", "error"].includes(level) ? level : "info",
    code: String(code || "INFO"),
    message: String(message || ""),
    profileName: String(profileName || "")
  };
  state.activityLog = [...(state.activityLog || []), entry].slice(-AUTOPILOT_MAX_LOGS);
  return entry;
}

async function migrateAutopilotResumeProfiles() {
  const stored = await chrome.storage.local.get(["autopilotResumeProfiles", "resumeText", "resumeMeta", "settings"]);
  let profiles = normalizeAutopilotResumeProfiles(stored.autopilotResumeProfiles);
  if (!profiles.length && String(stored.resumeText || "").trim()) {
    profiles = [{
      id: "resume-primary",
      label: "Primary résumé",
      fileName: stored.resumeMeta?.fileName || "Saved IceBreaker résumé",
      type: stored.resumeMeta?.type || "text/plain",
      size: Number(stored.resumeMeta?.sizeBytes || 0),
      base64: "",
      extractedText: String(stored.resumeText || "").trim().slice(0, 100000),
      roleTitles: String(stored.settings?.targetRoles || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
      savedAt: new Date().toISOString()
    }];
    await chrome.storage.local.set({ autopilotResumeProfiles: profiles });
  }
  return profiles;
}


function selectAutopilotAiResume(profiles) {
  const attachable = normalizeAutopilotResumeProfiles(profiles).filter((profile) => profile.base64 && profile.fileName && profile.extractedText);
  if (!attachable.length) return null;
  const aiPattern = /(^|\b)(ai|artificial intelligence|machine learning|ml)(\b|$)/i;
  return attachable.find((profile) => aiPattern.test(`${profile.label} ${profile.fileName} ${(profile.roleTitles || []).join(" ")}`)) || attachable[0];
}


function isSupportedAutopilotPage(url, settings) {
  try {
    const parsed = new URL(String(url || ""));
    const path = parsed.pathname.toLowerCase();
    if (path.includes("/mynetwork/invite-connect/connections")) return true;
    if (path.includes("/search/results/people")) return true;
    return !settings?.connectionsOnly && path.includes("/mynetwork/");
  } catch (_) {
    return false;
  }
}

async function handleStartAutopilotFromHover() {
  let activeTabId = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tab?.id || null;
    if (!tab?.id || !String(tab.url || "").includes("linkedin.com")) {
      throw new Error("Open LinkedIn Connections, hover a connection card, then press Alt+S.");
    }
    await ensureContentScript(tab.id);
    const startPoint = await sendToLinkedInTab(tab.id, { type: "GET_AUTOPILOT_START_POINT" });
    if (!startPoint?.ok || !startPoint.profileId) {
      await safeSendToTab(tab.id, { type: "SHOW_ICEBREAKER_BADGE", text: "Hover a connection, then press Alt+S" });
      throw new Error(startPoint?.error || "Hover a LinkedIn connection card before pressing Alt+S.");
    }
    await startAutopilot(undefined, {
      startProfileId: startPoint.profileId,
      startProfileName: startPoint.profileName || ""
    });
    try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (_) {}
  } catch (error) {
    console.warn("IceBreaker: Alt+S Autopilot could not start", error);
    if (activeTabId) {
      await safeSendToTab(activeTabId, { type: "SHOW_ICEBREAKER_BADGE", text: String(error?.message || "Autopilot could not start").slice(0, 120) });
    }
  }
}

async function startAutopilot(value, launch = {}) {
  const storedSettings = await chrome.storage.local.get("autopilotSettings");
  const settings = await saveAutopilotSettings(value && Object.keys(value).length ? value : storedSettings.autopilotSettings);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !String(tab.url || "").includes("linkedin.com")) {
    throw new Error("Open LinkedIn My Network → Connections first, then start Autopilot.");
  }
  if (!isSupportedAutopilotPage(tab.url, settings)) {
    throw new Error(settings.connectionsOnly
      ? "Open LinkedIn My Network → Connections, or a People search filtered to 1st-degree connections."
      : "Open a LinkedIn Connections or People search-results page first.");
  }

  const resumeProfiles = await migrateAutopilotResumeProfiles();
  const migratedProfileMemory = await migrateAutopilotMatchPolicy(await migrateAutopilotProfileMemory());
  const historical = await chrome.storage.local.get(["autopilotDrafts"]);
  const previousDraftProfileIds = Array.isArray(historical.autopilotDrafts)
    ? [...new Set(historical.autopilotDrafts.map((draft) => String(draft?.profileId || "").trim().toLowerCase()).filter(Boolean))].slice(-500)
    : [];
  const previousCheckedProfileIds = migratedProfileMemory.map((record) => record.profileId);
  const aiResume = selectAutopilotAiResume(resumeProfiles);
  if (!aiResume) {
    throw new Error("Upload an attachable AI Resume in IceBreaker Settings before starting Autopilot.");
  }

  const { settings: mainSettings } = await loadContext();
  const updatedMain = { ...mainSettings, generationMode: "dms", schemaVersion: 24 };
  await chrome.storage.local.set({ settings: updatedMain });
  await broadcastToLinkedInTabs({ type: "ICEBREAKER_SETTINGS_UPDATED" });
  if (activeGenerationRequest && activeGenerationRequest.source !== "autopilot") {
    activeGenerationRequest.controller.abort("autopilot-preempted");
  }
  await chrome.alarms.clear(AUTOPILOT_ALARM);

  const state = normalizeAutopilotState({
    ...DEFAULT_AUTOPILOT_STATE,
    runId: newAutopilotRunId(),
    status: "starting",
    tabId: tab.id,
    startedAt: new Date().toISOString(),
    current: { profileId: launch.startProfileId || "", profileName: launch.startProfileName || "", detectedTitle: "", action: launch.startProfileId ? `Starting from ${launch.startProfileName || "the hovered connection"}` : "Starting automatic connection scan" }
  });
  appendAutopilotLog(state, "info", "RUN_STARTED", `Connections Autopilot will keep scanning until ${settings.draftLimit} successful same-page messages are prepared. Fast mode continues immediately after each verified draft and résumé attachment.`);
  await chrome.storage.local.set({ autopilotSettings: settings, autopilotState: state, autopilotQueue: [] });
  await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state });

  const response = await sendToLinkedInTab(tab.id, {
    type: "AUTOPILOT_START",
    runId: state.runId,
    settings,
    previousDraftProfileIds: settings.skipPreviouslyDrafted ? previousDraftProfileIds : [],
    previousCheckedProfileIds: settings.skipPreviouslyChecked ? previousCheckedProfileIds : [],
    startProfileId: String(launch.startProfileId || "").trim().toLowerCase(),
    startProfileName: String(launch.startProfileName || "").trim(),
    resumeFile: settings.attachResume ? {
      id: aiResume.id,
      label: aiResume.label || aiResume.fileName || "Résumé",
      name: aiResume.fileName,
      type: aiResume.type || "application/octet-stream",
      base64: aiResume.base64
    } : null
  });
  if (!response?.ok) {
    const failed = normalizeAutopilotState({
      ...state,
      status: "error",
      lastError: response?.error || "Autopilot could not start in this LinkedIn tab.",
      lastErrorCode: "AP-E900",
      lastDiagnostic: "The extension could not communicate with the LinkedIn content script.",
      lastDiagnosticCode: "AP-E900",
      finishedAt: new Date().toISOString(),
      current: { ...state.current, action: "Start failed: AP-E900" }
    });
    appendAutopilotLog(failed, "error", "AP-E900", failed.lastError);
    await chrome.storage.local.set({ autopilotState: failed });
    await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state: failed });
    throw new Error(failed.lastError);
  }
  // The content script starts immediately after acknowledging AUTOPILOT_START
  // and can publish an error/completed state before this promise resumes. Do
  // not overwrite that newer state with a stale "running" snapshot.
  const latestStored = await chrome.storage.local.get("autopilotState");
  const latestState = normalizeAutopilotState(latestStored.autopilotState);
  if (latestState.runId === state.runId && !["starting", "running"].includes(latestState.status)) {
    return latestState;
  }
  const running = normalizeAutopilotState({
    ...(latestState.runId === state.runId ? latestState : state),
    status: "running",
    current: {
      ...(latestState.runId === state.runId ? latestState.current : state.current),
      action: "Scanning LinkedIn connection cards"
    }
  });
  await chrome.storage.local.set({ autopilotState: running });
  await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state: running });
  return running;
}

async function controlAutopilot(type) {
  const stored = await chrome.storage.local.get("autopilotState");
  let state = normalizeAutopilotState(stored.autopilotState);
  if (!state.tabId || !state.runId) throw new Error("There is no active Autopilot run.");

  const command = type === "PAUSE_AUTOPILOT" ? "AUTOPILOT_PAUSE" : type === "RESUME_AUTOPILOT" ? "AUTOPILOT_RESUME" : "AUTOPILOT_STOP";
  if (type === "STOP_AUTOPILOT" && activeGenerationRequest?.source === "autopilot") {
    activeGenerationRequest.cancelledByUser = true;
    activeGenerationRequest.controller.abort("user-cancelled");
  }
  await safeSendToTab(state.tabId, { type: command, runId: state.runId });
  const status = type === "PAUSE_AUTOPILOT" ? "paused" : type === "RESUME_AUTOPILOT" ? "running" : "stopped-by-user";
  const action = type === "PAUSE_AUTOPILOT" ? "Paused by user" : type === "RESUME_AUTOPILOT" ? "Resuming automatic scan" : "Stopped by user — prepared drafts remain unsent";
  state = normalizeAutopilotState({
    ...state,
    status,
    finishedAt: type === "STOP_AUTOPILOT" ? new Date().toISOString() : state.finishedAt,
    current: { ...state.current, action }
  });
  appendAutopilotLog(state, "info", type.replace("_AUTOPILOT", ""), action, state.current.profileName);
  await chrome.storage.local.set({ autopilotState: state, ...(type === "STOP_AUTOPILOT" ? { autopilotQueue: [] } : {}) });
  await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state });
  return state;
}

async function handleAutopilotStateUpdate(value, tab) {
  const stored = await chrome.storage.local.get("autopilotState");
  const current = normalizeAutopilotState(stored.autopilotState);
  const incoming = normalizeAutopilotState({ ...(value || {}), tabId: tab?.id || value?.tabId || current.tabId || null });
  if (current.runId && incoming.runId && current.runId !== incoming.runId) return current;
  const merged = normalizeAutopilotState({
    ...current,
    ...incoming,
    tabId: incoming.tabId || current.tabId,
    activityLog: current.activityLog,
    lastDraftAt: incoming.lastDraftAt || current.lastDraftAt,
    diagnosticCounts: incoming.diagnosticCounts || current.diagnosticCounts,
    lastDiagnostic: incoming.lastDiagnostic || current.lastDiagnostic,
    lastDiagnosticCode: incoming.lastDiagnosticCode || current.lastDiagnosticCode
  });
  await chrome.storage.local.set({ autopilotState: merged });
  await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state: merged });
  return merged;
}

async function generateAutopilotDraft(payload, tab) {
  const stored = await chrome.storage.local.get(["autopilotSettings", "autopilotResumeProfiles", "autopilotState"]);
  const settings = normalizeAutopilotSettings(stored.autopilotSettings);
  const resumes = normalizeAutopilotResumeProfiles(stored.autopilotResumeProfiles);
  if (!resumes.length) throw new Error("No Autopilot résumé profile is available.");
  const profile = { ...(payload.profile || {}), mode: "dms", tabId: tab?.id || payload.profile?.tabId || null };
  const choice = chooseAutopilotRoleAndResume(settings, resumes, profile);
  const { result } = await runGenerationFlow({
    profile,
    source: "autopilot",
    force: true,
    previousMessage: "",
    tone: payload.tone || settings.vibe,
    length: payload.length || settings.length,
    tabId: tab?.id || profile.tabId || null,
    allowJoin: false,
    resumeTextOverride: choice.resume.extractedText,
    targetRoleOverride: choice.desiredRole,
    resumeProfileName: choice.resume.label || choice.resume.fileName || "Résumé"
  });
  return {
    result,
    desiredRole: choice.desiredRole,
    resumeId: choice.resume.id,
    resumeName: choice.resume.label || choice.resume.fileName || "Résumé",
    resumeFile: settings.attachResume && choice.resume.base64 ? {
      name: choice.resume.fileName || `${choice.resume.label || "Resume"}.pdf`,
      type: choice.resume.type || "application/octet-stream",
      base64: choice.resume.base64
    } : null
  };
}

async function handleAutopilotEvent(runId, event, tab) {
  const stored = await chrome.storage.local.get(["autopilotState", "autopilotDrafts"]);
  let state = normalizeAutopilotState(stored.autopilotState);
  if (state.runId && runId && state.runId !== runId) return { state };
  const level = ["info", "success", "warning", "error"].includes(event?.level) ? event.level : "info";
  const code = String(event?.code || "INFO");
  const message = String(event?.message || "");
  appendAutopilotLog(state, level, code, message, event?.profileName || "");
  if (level === "warning" || level === "error") {
    const preserveRootCause = code === "AP-E301" && state.lastDiagnosticCode && state.lastDiagnosticCode !== "AP-E301";
    if (!preserveRootCause) {
      state.lastDiagnostic = message;
      state.lastDiagnosticCode = code;
    }
    state.diagnosticCounts = { ...(state.diagnosticCounts || {}), [code]: Number(state.diagnosticCounts?.[code] || 0) + 1 };
  }
  if (level === "error") {
    state.lastError = message;
    state.lastErrorCode = code;
    if (code !== "AP-E301") {
      state.rootCauseCode = code;
      state.rootCauseMessage = message;
    }
  }
  let drafts = Array.isArray(stored.autopilotDrafts) ? stored.autopilotDrafts : [];
  if (event?.draft && code === "DRAFT_SAVED") {
    const draft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: event.at || new Date().toISOString(),
      ...event.draft
    };
    drafts = [...drafts, draft].slice(-AUTOPILOT_MAX_DRAFTS);
    state.lastDraftAt = draft.createdAt;
    state.lastError = "";
    state.lastErrorCode = "";
    state.lastDiagnostic = "";
    state.lastDiagnosticCode = "";
    state.rootCauseCode = "";
    state.rootCauseMessage = "";
  }
  state.tabId = tab?.id || state.tabId;
  await chrome.storage.local.set({ autopilotState: state, autopilotDrafts: drafts });
  await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state });
  return { state, draftsCount: drafts.length };
}

async function scheduleAutopilotProcessing(delayMs = 100) {
  const stored = await chrome.storage.local.get("autopilotState");
  const state = normalizeAutopilotState(stored.autopilotState);
  if (state.status !== "running") return;
  const next = state.nextDraftAt ? new Date(state.nextDraftAt).getTime() : 0;
  const when = Math.max(Date.now() + Math.max(100, delayMs), Number.isFinite(next) ? next : 0);
  await chrome.alarms.create(AUTOPILOT_ALARM, { when });
}

async function restoreAutopilotSchedule() {
  const stored = await chrome.storage.local.get(["autopilotState", "autopilotQueue"]);
  const state = normalizeAutopilotState(stored.autopilotState);
  if (state.status === "running" && Array.isArray(stored.autopilotQueue) && stored.autopilotQueue.length) {
    await scheduleAutopilotProcessing(500);
  }
}

function chooseAutopilotRoleAndResume(settings, profiles, _profile) {
  const desiredRole = settings.desiredRoles?.[0] || "AI Engineer";
  const resume = selectAutopilotAiResume(profiles);
  if (!resume) throw new Error("The saved AI Resume file is unavailable. Upload it again in Autopilot Settings.");
  return { desiredRole, resume };
}

function normalizeConversationErrorCode(value) {
  const message = String(value?.code || value?.errorCode || value?.message || value || "");
  const explicit = message.match(/\b(E-RPL-\d{2})\b/i)?.[1];
  if (explicit) return explicit.toUpperCase();
  if (/not (?:on|inside).*messaging|messaging surface.*(?:not|missing)|open LinkedIn Messaging/i.test(message)) return "E-RPL-01";
  if (/no (?:active|open|selected|usable).*(?:conversation|row|thread)|could not find.*(?:conversation|thread)/i.test(message)) return "E-RPL-02";
  if (/no readable|no usable conversation reply|thread.*(?:empty|no messages)|message text.*(?:missing|unavailable)/i.test(message)) return "E-RPL-03";
  if (/mismatch|wrong thread|stale thread|expected .*visible thread/i.test(message)) return "E-RPL-04";
  if (/sender|direction.*(?:unknown|unresolved)|who sent/i.test(message)) return "E-RPL-05";
  if (/cancelled|canceled|mode changed|page changed|newer LinkedIn content|superseded/i.test(message)) return "E-RPL-06";
  if (/not installed|stale content script|could not connect.*LinkedIn tab|receiving end does not exist/i.test(message)) return "E-RPL-07";
  if (/open.*(?:timed out|timeout)|thread.*(?:timed out|timeout)|did not open/i.test(message)) return "E-RPL-08";
  if (/preview-only|latest preview|preview fallback/i.test(message)) return "E-RPL-10";
  if (/outside.*(?:conversation|thread|composer)|pointer.*outside/i.test(message)) return "E-RPL-11";
  if (/contaminated|feed or comment content|candidate conversation root/i.test(message)) return "E-RPL-12";
  if (/stale hovered conversation|replaced by.*active.*thread/i.test(message)) return "E-RPL-13";
  if (/different participants|active inbox row.*visible message thread|participant conflict/i.test(message)) return "E-RPL-14";
  if (/more than one visible conversation|could not select one safely|ambiguous thread/i.test(message)) return "E-RPL-15";
  if (/not inside a real LinkedIn conversation shell|page-wide capture was blocked|no locally hovered or focused conversation shell|no readable local conversation shell|refused to read unrelated page content/i.test(message)) return "E-RPL-16";
  return "E-RPL-09";
}

function ensureConversationErrorCode(message, code = "E-RPL-09") {
  const text = String(message || "Conversation capture failed.").trim();
  const resolved = normalizeConversationErrorCode(code || text);
  return /\bE-RPL-\d{2}\b/i.test(text) ? text : `[${resolved}] ${text}`;
}

function autopilotErrorCode(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (/resume|résumé|attachment/.test(message)) return "AP-E207";
  if (/403|408|429|blocked|origin permission|timed out|timeout|api key|unauthori|authentication|failed to fetch|offline|connect|network|empty draft|empty message|returned an empty/.test(message)) return "AP-E201";
  return "AP-E999";
}

function isProviderFailureCode(code) {
  return code === "AP-E201";
}

async function processAutopilotQueue() {
  if (autopilotQueueProcessing) return;
  autopilotQueueProcessing = true;
  try {
    const stored = await chrome.storage.local.get(["autopilotState", "autopilotSettings", "autopilotQueue", "autopilotDrafts", "autopilotResumeProfiles"]);
    let state = normalizeAutopilotState(stored.autopilotState);
    const settings = normalizeAutopilotSettings(stored.autopilotSettings);
    let queue = Array.isArray(stored.autopilotQueue) ? stored.autopilotQueue : [];
    let drafts = Array.isArray(stored.autopilotDrafts) ? stored.autopilotDrafts : [];
    const resumes = normalizeAutopilotResumeProfiles(stored.autopilotResumeProfiles);
    if (state.status !== "running" || !queue.length) return;
    if (state.progress.draftsPrepared >= settings.draftLimit) {
      state.status = "completed";
      state.finishedAt = new Date().toISOString();
      state.current.action = "Draft limit reached";
      state.queueSize = 0;
      appendAutopilotLog(state, "success", "RUN_COMPLETED", "Draft limit reached.");
      await chrome.storage.local.set({ autopilotState: state, autopilotQueue: [] });
      await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state });
      return;
    }
    const nextAt = state.nextDraftAt ? new Date(state.nextDraftAt).getTime() : 0;
    if (nextAt && Date.now() < nextAt) {
      await scheduleAutopilotProcessing(nextAt - Date.now());
      return;
    }
    const item = queue.shift();
    state.queueSize = queue.length;
    state.current = { profileId: item.id, profileName: item.profile?.name || "LinkedIn profile", detectedTitle: item.profile?.headline || item.matchReason || "", action: "Preparing personalised draft" };
    await chrome.storage.local.set({ autopilotState: state, autopilotQueue: queue });
    await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state });

    try {
      if (!resumes.length) throw new Error("No Autopilot résumé profile is available.");
      const choice = chooseAutopilotRoleAndResume(settings, resumes, item.profile);
      const { result } = await runGenerationFlow({
        profile: { ...item.profile, mode: "dms", tabId: item.tabId || state.tabId || null },
        source: "autopilot",
        force: true,
        previousMessage: "",
        tone: settings.vibe,
        length: settings.length,
        tabId: item.tabId || state.tabId || null,
        allowJoin: false,
        resumeTextOverride: choice.resume.extractedText,
        targetRoleOverride: choice.desiredRole,
        resumeProfileName: choice.resume.label || choice.resume.fileName || "Résumé"
      });
      const draft = {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        profileId: item.id,
        profileName: item.profile?.name || "LinkedIn profile",
        profileUrl: item.profile?.url || "",
        profileHeadline: item.profile?.headline || "",
        contactMatch: item.matchReason || "",
        desiredRole: choice.desiredRole,
        resumeId: choice.resume.id,
        resumeName: choice.resume.label || choice.resume.fileName || "Résumé",
        message: String(result?.message || "").trim(),
        status: "saved"
      };
      if (!draft.message) throw new Error("The AI returned an empty draft.");
      drafts = [...drafts, draft].slice(-AUTOPILOT_MAX_DRAFTS);
      state.progress.draftsPrepared += 1;
      state.lastDraftAt = draft.createdAt;
      state.lastError = "";
      state.lastErrorCode = "";
      state.lastDiagnostic = "";
      state.lastDiagnosticCode = "";
      state.current.action = `Saved draft for ${choice.desiredRole} using ${draft.resumeName}`;
      appendAutopilotLog(state, "success", "DRAFT_SAVED", state.current.action, draft.profileName);
      const complete = state.progress.draftsPrepared >= settings.draftLimit;
      state.status = complete ? "completed" : "running";
      state.finishedAt = complete ? new Date().toISOString() : null;
      state.nextDraftAt = complete ? null : new Date(Date.now() + autopilotIntervalMs(settings)).toISOString();
      if (complete) {
        queue = [];
        state.queueSize = 0;
        appendAutopilotLog(state, "success", "RUN_COMPLETED", "Requested number of drafts has been saved.");
      }
      await chrome.storage.local.set({ autopilotState: state, autopilotQueue: queue, autopilotDrafts: drafts });
      await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state });
    } catch (error) {
      const code = autopilotErrorCode(error);
      state.progress.errors += 1;
      state.lastError = friendlyError(error);
      state.lastErrorCode = code;
      state.failedProfiles = [...state.failedProfiles, { id: item.id, profileName: item.profile?.name || "", code, error: state.lastError, at: new Date().toISOString() }].slice(-200);
      state.current.action = `Paused: ${code}`;
      appendAutopilotLog(state, "error", code, state.lastError, item.profile?.name || "");
      if (settings.stopOnProviderFailure && isProviderFailureCode(code)) {
        state.status = "paused";
        queue.unshift(item);
      } else {
        state.status = "running";
        state.nextDraftAt = new Date(Date.now() + autopilotIntervalMs(settings)).toISOString();
      }
      state.queueSize = queue.length;
      await chrome.storage.local.set({ autopilotState: state, autopilotQueue: queue });
      await notifyExtensionPages({ type: "AUTOPILOT_STATE_CHANGED", state });
    }

    if (state.status === "running" && queue.length) await scheduleAutopilotProcessing(100);
  } finally {
    autopilotQueueProcessing = false;
  }
}

async function loadContext() {
  const { settings, resumeText, resumeMeta, profileContext, projectSelectionHistory } = await chrome.storage.local.get([
    "settings",
    "resumeText",
    "resumeMeta",
    "profileContext",
    PROJECT_SELECTION_HISTORY_KEY
  ]);

  const normalizedSettings = {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    schemaVersion: 23,
    generationMode: normalizeMode(settings?.generationMode),
    autoGenerate: settings?.autoGenerate !== false,
    ollamaEndpoint: normalizeOllamaEndpoint(settings?.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint),
    apiAccessMode: normalizeApiAccessMode(settings?.apiAccessMode),
    manualApiKey: migrateManualApiKey(settings || {}),
    manualApiProvider: detectApiProvider(migrateManualApiKey(settings || {}))
  };

  return {
    settings: normalizedSettings,
    resumeText: String(resumeText || "").trim(),
    resumeMeta: resumeMeta || null,
    profileContext: reconcileSavedProfileContextWithSettings(profileContext, normalizedSettings),
    projectSelectionHistory: normalizeProjectSelectionHistory(projectSelectionHistory)
  };
}

async function generateOutreach(payload) {
  const context = await loadContext();
  const settings = {
    ...context.settings,
    targetRoles: String(payload.targetRoleOverride || context.settings.targetRoles || "").trim()
  };
  const resumeText = String(payload.resumeTextOverride || context.resumeText || "").trim();
  const profileContext = context.profileContext;
  const profile = payload.profile;
  const mode = normalizeMode(profile?.mode || settings.generationMode);
  const tone = payload.tone || settings.defaultTone;
  const length = payload.length || settings.defaultLength;
  const previousMessage = String(payload.previousMessage || "").trim();
  const projectMatch = mode === "dms"
    ? selectProjectForRecipient({
        profile,
        resumeText,
        profileContext,
        history: context.projectSelectionHistory,
        previousMessage
      })
    : null;

  if (!profile?.name && !profile?.description) {
    throw new Error("Capture LinkedIn content for the selected mode first.");
  }
  if (mode === "dms" && !resumeText) {
    throw new Error("Upload your résumé in IceBreaker Settings first.");
  }

  // All three modes use the same selected provider and model.
  // Only this prompt changes according to the selected mode.
  const isAutopilot = payload.source === "autopilot";
  const prompt = isAutopilot
    ? buildAutopilotCompactPrompt({
        profile,
        resumeText,
        settings,
        tone,
        length,
        preferredRole: String(payload.targetRoleOverride || "").trim()
      })
    : buildModePrompt({
        mode,
        profile,
        resumeText,
        profileContext,
        settings,
        tone,
        length,
        previousMessage,
        preferredRole: String(payload.targetRoleOverride || "").trim(),
        resumeProfileName: String(payload.resumeProfileName || "").trim(),
        projectMatch
      });

  let raw = "";
  let fallbackUsed = false;
  let fallbackReason = "";
  try {
    raw = await callProvider(
      settings,
      [
        {
          role: "system",
          content: isAutopilot
            ? "Write one concise, truthful LinkedIn outreach DM. Return only the message. Never invent facts."
            : "You are IceBreaker, a professional LinkedIn writing assistant. Follow the selected mode instructions exactly. Return only the final text the user can copy. Never return JSON, analysis, labels, or explanations. Never invent facts."
        },
        { role: "user", content: prompt }
      ],
      {
        signal: payload.signal,
        onProgress: payload.onProgress,
        responseMode: "text",
        maxOutputTokens: outputTokenBudget(length),
        source: payload.source || "manual",
        compactInput: isAutopilot
      }
    );
  } catch (providerError) {
    if (!isAutopilot || isGenerationCancellation(providerError, payload.signal)) throw providerError;
    fallbackUsed = true;
    fallbackReason = String(providerError?.message || providerError || "AI provider unavailable");
    await payload.onProgress?.("Cloud AI unavailable — using IceBreaker’s local personalised draft fallback…");
    raw = buildLocalAutopilotDraft({
      profile,
      resumeText,
      settings,
      tone,
      length,
      preferredRole: String(payload.targetRoleOverride || "").trim()
    });
  }

  let message = cleanGeneratedDraft(extractPlainDraft(raw), mode);
  if (!message) throw new Error("The selected AI model returned an empty draft. Press Refresh and try again.");

  const range = getSelectedWordRange(length);
  // One request only. Previous builds often made a second full request because
  // the prompt and validator used conflicting word ranges.
  message = enforceMaximumWordCount(message, range.max);
  if (countWords(message) < 4) {
    throw new Error("The selected AI model returned an unusably short draft. Press Refresh or choose another model.");
  }

  const labels = {
    dms: ["DM ready", "Based on the visible profile and saved résumé"],
    comments: ["Comment ready", "Based on the visible LinkedIn post"],
    conversation: ["Reply ready", "Based on the visible conversation"]
  };
  const [matchLabel, reason] = labels[mode] || labels.dms;
  if (mode === "dms" && projectMatch?.selectedProject) {
    await recordProjectSelection(projectMatch, profile);
  }
  const projectReason = mode === "dms"
    ? projectMatch?.selectedProject
      ? `Best-fit project: ${projectMatch.selectedProject.displayName}`
      : "No project forced without a clear receiver-interest match"
    : "";

  return {
    matchScore: 100,
    matchLabel,
    matchReasons: [reason, projectReason].filter(Boolean),
    message,
    targetRole: String(payload.targetRoleOverride || "").trim(),
    resumeProfileName: String(payload.resumeProfileName || "").trim(),
    fallbackUsed,
    fallbackReason: fallbackUsed ? truncate(fallbackReason, 500) : ""
  };
}

function buildAutopilotCompactPrompt({ profile, resumeText, settings, tone, length, preferredRole = "" }) {
  const range = getSelectedWordRange(length);
  const firstName = String(profile?.name || "").trim().split(/\s+/)[0] || "there";
  const headline = truncate(String(profile?.headline || profile?.description || "").trim(), 220) || "Hiring-related LinkedIn contact";
  const company = truncate(String(profile?.company || "").trim(), 90) || "Not visible";
  const skills = compactAutopilotSkills(settings?.coreSkills, resumeText);
  const sender = truncate(String(settings?.senderName || "").trim(), 60) || "the sender";
  const role = truncate(String(preferredRole || settings?.targetRoles || "AI Engineer").trim(), 80);
  return [
    `Write one ${range.min}-${range.max} word LinkedIn DM.`,
    `Recipient first name: ${firstName}`,
    `Recipient headline: ${headline}`,
    `Recipient company: ${company}`,
    `Sender name: ${sender}`,
    `Target role: ${role}`,
    `Sender skills: ${skills || "software engineering and AI"}`,
    `Tone: ${sharedTone(tone)}`,
    "Start with Hi. Mention the attached résumé exactly once. Ask to be considered for a relevant role or directed to the right hiring contact. Use only these facts. Return only the DM."
  ].join("\n");
}

function compactAutopilotSkills(configuredSkills, resumeText) {
  const configured = String(configuredSkills || "").split(/[,;|\n]+/).map((item) => item.trim()).filter(Boolean);
  if (configured.length) return configured.slice(0, 6).join(", ");
  const catalog = [
    "Python", "FastAPI", "Flask", "Django", "React", "JavaScript", "TypeScript", "Node.js",
    "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "LLMs", "NLP", "Computer Vision",
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Docker", "Git", "AWS", "Azure", "Linux"
  ];
  const haystack = String(resumeText || "");
  const found = catalog.filter((skill) => new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(skill)}(?:$|[^a-z0-9])`, "i").test(haystack));
  return found.slice(0, 6).join(", ");
}

function buildLocalAutopilotDraft({ profile, resumeText, settings, length, preferredRole = "" }) {
  const firstName = String(profile?.name || "").trim().split(/\s+/)[0] || "there";
  const role = String(preferredRole || settings?.targetRoles || "AI Engineer").trim();
  const company = String(profile?.company || "").trim();
  const headline = String(profile?.headline || "").trim();
  const skills = compactAutopilotSkills(settings?.coreSkills, resumeText);
  const context = company
    ? `your work at ${company}`
    : headline
      ? `your role in ${truncate(headline, 70)}`
      : "your hiring-related work";

  if (length === "short") {
    return `Hi ${firstName}, I’m exploring ${role} roles. I’ve attached my résumé and would appreciate consideration for relevant opportunities.`;
  }
  if (length === "long") {
    const skillLine = skills ? `My background includes ${skills}. ` : "";
    return `Hi ${firstName}, I’m reaching out because I’m currently exploring ${role} opportunities and noticed ${context}. ${skillLine}I’ve attached my résumé for context. I’d appreciate being considered for a suitable role, or being directed to the right hiring contact on your team. Thank you for your time.`;
  }
  const skillLine = skills ? `My background includes ${skills}. ` : "";
  return `Hi ${firstName}, I’m exploring ${role} opportunities and noticed ${context}. ${skillLine}I’ve attached my résumé and would appreciate consideration for a suitable role or the right hiring contact.`;
}

function isGenerationCancellation(error, signal) {
  if (signal?.aborted) return true;
  return /stopped by user|user-cancelled|replaced by newer linkedin content|generation was replaced/i.test(String(error?.message || error || ""));
}

function buildModePrompt(input) {
  const mode = normalizeMode(input.mode);
  if (mode === "comments") return buildCommentPrompt(input);
  if (mode === "conversation") return buildConversationPrompt(input);
  return buildOutreachPrompt(input);
}

function sharedTone(tone) {
  const tones = {
    professional: "polished, confident, respectful, and direct",
    neutral: "natural, balanced, friendly, and professional",
    engaging: "warm, conversational, memorable, and still workplace-appropriate"
  };
  return tones[tone] || tones.neutral;
}

function refreshInstruction(previousMessage) {
  return previousMessage
    ? `\nPREVIOUS DRAFT TO AVOID REPEATING\n${truncate(previousMessage, 650)}\nWrite a genuinely fresh version with different wording and structure while keeping all facts accurate.\n`
    : "";
}

function formatStructuredSenderProfile(settings, preferredRole = "") {
  const goalLabels = {
    opportunities: "Explore relevant opportunities",
    internship: "Find an internship",
    fulltime: "Find a full-time role",
    networking: "Build professional connections",
    collaboration: "Find project collaborators"
  };
  const experienceLabels = {
    student: "Student",
    intern: "Intern / Trainee",
    entry: "Entry level",
    mid: "Mid level",
    senior: "Senior"
  };
  const workLabels = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", flexible: "Flexible" };
  return [
    `Name: ${settings.senderName || "Not provided"}`,
    settings.professionalHeadline ? `Professional headline: ${settings.professionalHeadline}` : "",
    `Interested role: ${preferredRole || settings.targetRoles || "AI or software opportunities"}`,
    settings.profileLocation ? `Location: ${settings.profileLocation}` : "",
    settings.experienceLevel ? `Experience level: ${experienceLabels[settings.experienceLevel] || settings.experienceLevel}` : "",
    settings.workPreference ? `Work preference: ${workLabels[settings.workPreference] || settings.workPreference}` : "",
    settings.availability ? `Availability: ${settings.availability}` : "",
    settings.coreSkills ? `Core skills: ${settings.coreSkills}` : "",
    settings.preferredIndustries ? `Preferred industries: ${settings.preferredIndustries}` : "",
    `Outreach goal: ${goalLabels[settings.outreachGoal] || settings.outreachGoal || "Explore relevant opportunities"}`,
    `Extra context: ${settings.customBio || "None"}`
  ].filter(Boolean).join("\n");
}

function buildOutreachPrompt({ profile, resumeText, profileContext, settings, tone, length, previousMessage, preferredRole = "", resumeProfileName = "", projectMatch = null }) {
  const ranges = {
    short: `${WORD_RANGES.short.min}-${WORD_RANGES.short.max} words total`,
    medium: `${WORD_RANGES.medium.min}-${WORD_RANGES.medium.max} words total`,
    long: `${WORD_RANGES.long.min}-${WORD_RANGES.long.max} words total`
  };
  const contextualDm = ["comment-dm", "post-dm"].includes(String(profile.contextType || ""));
  const recipientDescription = contextualDm
    ? String(profile.profileDescription || "").trim()
    : String(profile.description || "").trim();
  const personalizationContext = truncate([
    profile.commentText ? `MATCHED COMMENT\n${truncate(profile.commentText, 900)}` : "",
    profile.parentPostText ? `RELATED POST${profile.parentPostAuthor ? ` BY ${profile.parentPostAuthor}` : ""}\n${truncate(profile.parentPostText, 1100)}` : ""
  ].filter(Boolean).join("\n\n"), 1500);
  const profileText = [
    `Name: ${profile.name || "Unknown"}`,
    `Headline: ${truncate(profile.headline || "Not visible", 260)}`,
    `Company: ${truncate(profile.company || "Not visible", 120)}`,
    `Location: ${truncate(profile.location || "Not visible", 100)}`,
    `About: ${truncate(recipientDescription || "Not visible", 700)}`
  ].join("\n");
  const relevanceQuery = [profileText, personalizationContext, profile.rawText || ""].filter(Boolean).join("\n\n");
  const projectCandidates = Array.isArray(projectMatch?.candidates) ? projectMatch.candidates : [];
  const generalResumeText = stripProjectCatalog(resumeText, projectCandidates);
  const generalProfileContext = formatSavedProfileContextWithoutProjectCatalog(profileContext, projectCandidates);
  const projectDecision = truncate(formatProjectMatchDecision(projectMatch), 650);

  return `
Write ONE ready-to-send LinkedIn outreach DM.

RECIPIENT
${truncate(profileText, 1100)}

MATCHED LINKEDIN CONTEXT
${personalizationContext || "No matched comment or post context. Personalise from the profile."}

MOST RELEVANT CV FACTS
${selectRelevantResumeText(generalResumeText, relevanceQuery, 1450)}

SAVED SENDER CONTEXT
${selectRelevantResumeText(generalProfileContext, relevanceQuery, 850) || "No imported profile context."}

PROJECT DECISION
${projectDecision}

SENDER PROFILE
${truncate(formatStructuredSenderProfile(settings, preferredRole), 700)}
Tone: ${sharedTone(tone)}
Length: ${ranges[length] || ranges.medium}
${refreshInstruction(previousMessage)}
RULES
- Return only the final DM and start with "Hi" plus the recipient's first name.
- Briefly explain the outreach reason using only supplied facts.
- Mention the attached CV exactly once.
- Use a matched comment's actual idea when useful; never say only that you saw a comment/activity.
- Treat a related post as supporting private-DM context, not as a public reply.
- Mention only the selected project; when PROJECT DECISION says NONE, mention no named project.
- Never invent a role opening, relationship, achievement, mutual connection, or recipient identity.
- No markdown, headings, bullets, subject line, placeholders, analysis, or alternatives in the output.
- Stay strictly inside the selected word range; short is one sentence, medium one or two sentences, long up to three short paragraphs.
`.trim();
}

function buildCommentPrompt({ profile, tone, length, previousMessage }) {
  const ranges = {
    short: `${WORD_RANGES.short.min}-${WORD_RANGES.short.max} words total`,
    medium: `${WORD_RANGES.medium.min}-${WORD_RANGES.medium.max} words total`,
    long: `${WORD_RANGES.long.min}-${WORD_RANGES.long.max} words total`
  };

  return `
Write ONE relevant LinkedIn comment responding to the actual post.

AUTHOR
Name: ${profile.name || "Not visible"}
Headline: ${truncate(profile.headline || "Not visible", 220)}

POST
${truncate(profile.description || profile.rawText || "", 2800)}

Tone: ${sharedTone(tone)}
Length: ${ranges[length] || ranges.medium}
${refreshInstruction(previousMessage)}
RULES
- React to one concrete idea and add a useful observation, respectful opinion, practical addition, or natural question.
- Do not merely summarise the post or use generic praise such as “Great post”.
- Do not mention a résumé, ask for a job, advertise services, or invent experience.
- Match the post's language and formality when possible.
- Return only the comment as plain text. No headings, bullets, hashtags, quotation marks, or markdown.
`.trim();
}

function buildConversationPrompt({ profile, resumeText, profileContext, settings, tone, length, previousMessage }) {
  const ranges = {
    short: `${WORD_RANGES.short.min}-${WORD_RANGES.short.max} words total`,
    medium: `${WORD_RANGES.medium.min}-${WORD_RANGES.medium.max} words total`,
    long: `${WORD_RANGES.long.min}-${WORD_RANGES.long.max} words total`
  };
  const savedWebContext = formatSavedProfileContext(profileContext);
  const combinedUserContext = [
    resumeText ? `RÉSUMÉ\n${resumeText}` : "",
    savedWebContext ? `IMPORTED PROFILE CONTEXT\n${savedWebContext}` : ""
  ].filter(Boolean).join("\n\n");
  const userContext = combinedUserContext
    ? selectRelevantResumeText(combinedUserContext, profile.description || "", 1100)
    : "No saved résumé or imported profile context is available.";

  return `
Write ONE context-aware LinkedIn inbox reply that naturally continues the visible chat.

CONVERSATION WITH
${profile.name || "LinkedIn contact"}

CHAT — OLDEST TO NEWEST
Captured messages: ${Number(profile.messageCount || 0) || "up to 8"}
Newest sender: ${profile.latestSender || "Use the final transcript label"}
Newest direction: ${profile.latestDirection || "Use [YOU] / [CONTACT]"}
[YOU] is the extension user's sent text. [CONTACT] is the other person's text.
${truncate(profile.description || profile.rawText || "", 3000)}

USER CONTEXT — only when the chat asks about it
${truncate(formatStructuredSenderProfile(settings), 650)}
${userContext}

Tone: ${sharedTone(tone)}
Length: ${ranges[length] || ranges.medium}
${refreshInstruction(previousMessage)}
RULES
- Respond to the contact's latest [CONTACT] message; use earlier messages only for context.
- Never answer a [YOU] message as if the contact sent it. If the final entry is [YOU], write only a supported, non-repetitive follow-up.
- Preserve the conversation's intent, tone, and language. Do not restart with a cold introduction.
- Use only supplied facts. Never invent dates, availability, attachments, promises, meetings, or prior discussions.
- Ask one concise question when essential information is missing.
- Return only the reply as plain text, in one to three short paragraphs. No headings, labels, bullets, emojis, quotation marks, or markdown.
`.trim();
}

function normalizeSavedProfileContext(value) {
  const context = value && typeof value === "object" ? value : {};
  const normalizeSource = (source) => {
    if (!source || typeof source !== "object" || !String(source.text || "").trim()) return null;
    return {
      url: String(source.url || "").trim(),
      importedAt: String(source.importedAt || "").trim(),
      summary: String(source.summary || "").trim(),
      text: String(source.text || "").trim().slice(0, 60000),
      repositories: Array.isArray(source.repositories) ? source.repositories.slice(0, 100) : [],
      sections: Array.isArray(source.sections) ? source.sections.slice(0, 50) : []
    };
  };
  return {
    linkedin: normalizeSource(context.linkedin),
    github: normalizeSource(context.github),
    portfolio: normalizeSource(context.portfolio),
    updatedAt: String(context.updatedAt || "").trim()
  };
}

function canonicalSavedContextUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch (_) {
    return String(value || "").trim().replace(/\/+$/, "").toLowerCase();
  }
}

function reconcileSavedProfileContextWithSettings(value, settings) {
  const context = normalizeSavedProfileContext(value);
  for (const key of ["linkedin", "github", "portfolio"]) {
    const configuredUrl = String(settings?.[`${key}Url`] || "").trim();
    if (!configuredUrl || !context[key] || canonicalSavedContextUrl(context[key].url) !== canonicalSavedContextUrl(configuredUrl)) {
      context[key] = null;
    }
  }
  return context;
}

function formatSavedProfileContext(profileContext) {
  const context = normalizeSavedProfileContext(profileContext);
  const parts = [];
  if (context.linkedin) parts.push(`LINKEDIN PROFILE (posts and activity excluded)\nSource: ${context.linkedin.url || "Saved LinkedIn profile"}\n${context.linkedin.text}`);
  if (context.github) parts.push(`GITHUB PROJECT CONTEXT\nSource: ${context.github.url || "Saved GitHub profile"}\n${context.github.text}`);
  if (context.portfolio) parts.push(`PORTFOLIO CONTEXT\nSource: ${context.portfolio.url || "Saved portfolio"}\n${context.portfolio.text}`);
  return parts.join("\n\n").slice(0, 110000);
}


function normalizeProjectSelectionHistory(value) {
  const source = value && typeof value === "object" ? value : {};
  const usage = {};
  for (const [key, entry] of Object.entries(source.usage || {})) {
    const canonical = canonicalProjectKey(key);
    if (!canonical) continue;
    usage[canonical] = {
      count: Math.max(0, Number(entry?.count || 0)),
      lastUsedAt: String(entry?.lastUsedAt || "").trim(),
      lastRecipient: String(entry?.lastRecipient || "").trim()
    };
  }
  const recent = Array.isArray(source.recent)
    ? source.recent.slice(0, PROJECT_SELECTION_RECENT_LIMIT).map((entry) => ({
        projectKey: canonicalProjectKey(entry?.projectKey),
        projectName: String(entry?.projectName || "").trim(),
        recipient: String(entry?.recipient || "").trim(),
        selectedAt: String(entry?.selectedAt || "").trim()
      })).filter((entry) => entry.projectKey)
    : [];
  return { version: 1, usage, recent };
}

function canonicalProjectKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function humanizeProjectName(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeProjectCandidate(candidate) {
  const name = String(candidate?.name || "").trim();
  const key = canonicalProjectKey(name);
  if (!key || name.length < 2) return null;
  const description = String(candidate?.description || "").replace(/\s+/g, " ").trim();
  const topics = Array.isArray(candidate?.topics) ? candidate.topics.map((topic) => String(topic || "").trim()).filter(Boolean).slice(0, 20) : [];
  return {
    key,
    name,
    displayName: humanizeProjectName(name),
    description: description === "No description provided" ? "" : description,
    language: String(candidate?.language || "").trim(),
    topics,
    url: String(candidate?.url || "").trim(),
    source: String(candidate?.source || "Saved profile").trim()
  };
}

function extractProjectCandidates(profileContext, resumeText = "") {
  const context = normalizeSavedProfileContext(profileContext);
  const candidates = [];
  const add = (candidate) => {
    const normalized = normalizeProjectCandidate(candidate);
    if (!normalized) return;
    const existing = candidates.find((item) => item.key === normalized.key);
    if (!existing) {
      candidates.push(normalized);
      return;
    }
    if (normalized.description.length > existing.description.length) existing.description = normalized.description;
    if (!existing.language && normalized.language) existing.language = normalized.language;
    existing.topics = [...new Set([...existing.topics, ...normalized.topics])].slice(0, 20);
    if (!existing.url && normalized.url) existing.url = normalized.url;
  };

  for (const repo of context.github?.repositories || []) {
    add({ ...repo, source: "GitHub" });
  }

  const structuredSections = [
    ...(context.linkedin?.sections || []).map((section) => ({ ...section, source: "LinkedIn" })),
    ...(context.portfolio?.sections || []).map((section) => ({ ...section, source: "Portfolio" }))
  ];
  for (const section of structuredSections) {
    const heading = String(section?.heading || "").trim();
    const text = String(section?.text || "").trim();
    if (!heading || !text || !/project|portfolio|case stud|selected work/i.test(`${heading} ${text.slice(0, 120)}`)) continue;
    for (const parsed of parseProjectBlocks(text, section.source)) add(parsed);
  }

  for (const parsed of parseProjectBlocks(resumeText, "Résumé")) add(parsed);
  return candidates.slice(0, 120);
}

function parseProjectBlocks(value, source = "Saved profile") {
  const lines = String(value || "").replace(/\r/g, "").split("\n").map((line) => line.replace(/^[•▪◦●*]+\s*/, "").trim()).filter(Boolean);
  const projects = [];
  let inProjectSection = false;
  const isMajorHeader = (line) => /^(experience|work experience|education|skills|technical skills|certifications?|courses?|achievements?|awards?|publications?|languages?|interests?|summary|profile|objective|about)(\s|&|\/|:|$)/i.test(line);
  const isProjectHeader = (line) => /^(selected\s+|personal\s+|academic\s+|featured\s+)?projects?(\s|&|\/|:|$)/i.test(line) || /^(portfolio|case studies|selected work)(\s|&|\/|:|$)/i.test(line);
  const looksLikeTitle = (line) => {
    if (line.length < 3 || line.length > 95 || line.split(/\s+/).length > 13) return false;
    if (/^(description|technologies?|tech stack|tools?|role|responsibilities?|features?|github|repository|live|demo|link|date)\s*:/i.test(line)) return false;
    if (/^https?:\/\//i.test(line) || /[.!?]$/.test(line)) return false;
    return /[A-Za-z]/.test(line);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isProjectHeader(line)) {
      inProjectSection = true;
      continue;
    }
    if (inProjectSection && isMajorHeader(line)) {
      inProjectSection = false;
      continue;
    }

    const explicit = line.match(/^(?:project|repository|repo|case study)\s*[:–—-]\s*(.+)$/i);
    const title = explicit?.[1]?.trim() || (inProjectSection && looksLikeTitle(line) ? line.replace(/\s*[|–—]\s*(?:github|demo|live).*$/i, "").trim() : "");
    if (!title) continue;

    const details = [];
    for (let offset = 1; offset <= 4 && index + offset < lines.length; offset += 1) {
      const next = lines[index + offset];
      if (isProjectHeader(next) || isMajorHeader(next) || /^(?:project|repository|repo|case study)\s*[:–—-]/i.test(next)) break;
      if (inProjectSection && looksLikeTitle(next) && details.length) break;
      details.push(next.replace(/^(description|technologies?|tech stack|tools?)\s*:\s*/i, ""));
    }
    projects.push({ name: title, description: details.join(" ").slice(0, 900), topics: [], source });
  }
  return projects;
}

const PROJECT_STOP_WORDS = new Set([
  "about", "after", "also", "and", "been", "being", "build", "built", "company", "current", "engineer", "from", "have", "into", "linkedin", "looking", "more", "other", "profile", "role", "strong", "system", "systems", "their", "there", "these", "they", "this", "using", "visible", "with", "work", "working", "your"
]);

const PROJECT_THEMES = [
  { id: "emotion", label: "emotion or affective AI", words: ["emotion", "emotional", "sentiment", "facial", "expression", "affective", "mood"] },
  { id: "vision", label: "computer vision", words: ["vision", "image", "video", "opencv", "yolo", "detection", "recognition", "camera", "cnn"] },
  { id: "nlp", label: "NLP or LLMs", words: ["nlp", "natural language", "text", "chatbot", "llm", "generative", "transformer", "rag", "prompt"] },
  { id: "ml", label: "AI and machine learning", words: ["ai", "machine", "learning", "artificial", "intelligence", "tensorflow", "pytorch", "keras", "model", "neural", "deep"] },
  { id: "fullstack", label: "full-stack development", words: ["fullstack", "full-stack", "frontend", "backend", "react", "node", "express", "flask", "django", "api", "website", "web"] },
  { id: "extension", label: "browser extensions or LinkedIn tooling", words: ["chrome", "browser", "extension", "linkedin", "outreach", "automation", "productivity"] },
  { id: "developer-tools", label: "developer tools or compilers", words: ["compiler", "parser", "lexer", "language", "vscode", "ide", "developer", "tooling"] },
  { id: "data", label: "data and analytics", words: ["data", "analytics", "dashboard", "visualization", "sql", "database", "pipeline"] },
  { id: "cloud", label: "cloud or deployment", words: ["cloud", "docker", "kubernetes", "aws", "azure", "vercel", "deployment", "devops"] },
  { id: "mobile", label: "mobile development", words: ["mobile", "android", "ios", "flutter", "react-native"] },
  { id: "security", label: "security", words: ["security", "cyber", "authentication", "privacy", "encryption"] }
];

function projectKeywords(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/full[\s-]?stack/g, "fullstack")
      .match(/[a-z0-9+#.]{3,}/g)
      ?.filter((word) => !PROJECT_STOP_WORDS.has(word)) || []
  );
}

function detectProjectThemes(value) {
  const lower = String(value || "").toLowerCase().replace(/full[\s-]?stack/g, "fullstack");
  const hasTerm = (term) => {
    const normalized = String(term || "").toLowerCase().replace(/full[\s-]?stack/g, "fullstack");
    if (!normalized) return false;
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(lower);
  };
  return PROJECT_THEMES.filter((theme) => theme.words.some(hasTerm));
}

const PROJECT_GENERIC_MATCH_WORDS = new Set([
  "ai", "artificial", "intelligence", "machine", "learning", "model", "developer", "development", "software", "technology", "data", "web", "app", "application"
]);

function stableProjectTieBreaker(profile, projectKey) {
  const value = `${profileSignature(profile)}|${projectKey}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function selectProjectForRecipient({ profile, resumeText, profileContext, history, previousMessage = "" }) {
  const candidates = extractProjectCandidates(profileContext, resumeText);
  const normalizedHistory = normalizeProjectSelectionHistory(history);
  if (!candidates.length) return { selectedProject: null, candidates: [], confidence: "none", reasons: [] };

  const receiverText = [profile?.headline, profile?.company, profile?.description, profile?.rawText].filter(Boolean).join("\n");
  const receiverKeywords = projectKeywords(receiverText);
  const receiverThemes = detectProjectThemes(receiverText);
  const previousLower = String(previousMessage || "").toLowerCase();

  const scored = candidates.map((candidate) => {
    const projectText = [candidate.name, candidate.description, candidate.language, candidate.topics.join(" ")].filter(Boolean).join(" ");
    const keywords = projectKeywords(projectText);
    const themes = detectProjectThemes(projectText);
    const overlaps = [...keywords].filter((keyword) => receiverKeywords.has(keyword));
    const specificOverlaps = overlaps.filter((keyword) => !PROJECT_GENERIC_MATCH_WORDS.has(keyword));
    const genericOverlaps = overlaps.filter((keyword) => PROJECT_GENERIC_MATCH_WORDS.has(keyword));
    const themeOverlaps = themes.filter((theme) => receiverThemes.some((receiverTheme) => receiverTheme.id === theme.id));
    let relevance = specificOverlaps.length * 6 + genericOverlaps.length * 2 + themeOverlaps.length * 4;
    if (receiverText.toLowerCase().includes(candidate.name.toLowerCase()) && candidate.name.length >= 5) relevance += 20;
    if (candidate.language && receiverText.toLowerCase().includes(candidate.language.toLowerCase())) relevance += 4;
    if (candidate.topics.some((topic) => receiverText.toLowerCase().includes(String(topic).toLowerCase()))) relevance += 5;
    if (previousLower && (previousLower.includes(candidate.name.toLowerCase()) || previousLower.includes(candidate.displayName.toLowerCase()))) relevance -= 8;
    const usage = normalizedHistory.usage[candidate.key] || { count: 0, lastUsedAt: "" };
    return {
      candidate,
      relevance,
      overlaps: overlaps.slice(0, 5),
      themeOverlaps,
      usageCount: Number(usage.count || 0),
      lastUsedAt: Date.parse(usage.lastUsedAt || "") || 0,
      tieBreaker: stableProjectTieBreaker(profile, candidate.key)
    };
  });

  const bestRelevance = Math.max(...scored.map((item) => item.relevance));
  if (bestRelevance < 4) {
    return { selectedProject: null, candidates, confidence: "none", reasons: ["The receiver profile did not expose a clear project-related interest."] };
  }

  const relevanceWindow = bestRelevance >= 18 ? 4 : 2;
  const pool = scored
    .filter((item) => item.relevance >= Math.max(4, bestRelevance - relevanceWindow))
    .sort((a, b) =>
      a.usageCount - b.usageCount ||
      a.lastUsedAt - b.lastUsedAt ||
      b.relevance - a.relevance ||
      a.tieBreaker - b.tieBreaker
    );
  const selected = pool[0] || scored.sort((a, b) => b.relevance - a.relevance)[0];
  const reasons = [
    ...selected.themeOverlaps.map((theme) => theme.label),
    ...selected.overlaps
  ].filter((value, index, list) => value && list.indexOf(value) === index).slice(0, 4);

  return {
    selectedProject: selected.candidate,
    candidates,
    confidence: selected.relevance >= 16 ? "strong" : "moderate",
    relevanceScore: selected.relevance,
    reasons,
    balancedAgainst: pool.slice(1).map((item) => item.candidate.displayName).slice(0, 5)
  };
}

function stripProjectCatalog(value, candidates = []) {
  const names = candidates.map((candidate) => String(candidate?.name || "").toLowerCase()).filter((name) => name.length >= 4);
  const lines = String(value || "").replace(/\r/g, "").split("\n");
  const output = [];
  let skipping = false;
  const projectHeader = (line) => /^(selected\s+|personal\s+|academic\s+|featured\s+)?projects?(\s|&|\/|:|$)/i.test(line.trim()) || /^(project \/ work sections|projects and repositories|portfolio|case studies|selected work)$/i.test(line.trim());
  const nextHeader = (line) => /^(experience|work experience|education|skills|technical skills|certifications?|courses?|achievements?|awards?|publications?|languages?|interests?|summary|profile|objective|about|full public portfolio text)(\s|&|\/|:|$)/i.test(line.trim());

  for (const line of lines) {
    if (projectHeader(line)) {
      skipping = true;
      continue;
    }
    if (skipping && nextHeader(line)) skipping = false;
    if (skipping) continue;
    const lower = line.toLowerCase();
    if (names.some((name) => lower.includes(name))) continue;
    output.push(line);
  }
  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatSavedProfileContextWithoutProjectCatalog(profileContext, candidates = []) {
  const context = normalizeSavedProfileContext(profileContext);
  const parts = [];
  if (context.linkedin) {
    const text = stripProjectCatalog(context.linkedin.text, candidates);
    if (text) parts.push(`LINKEDIN PROFILE (posts, activity, and project catalogue excluded)\nSource: ${context.linkedin.url || "Saved LinkedIn profile"}\n${text}`);
  }
  if (context.github) {
    const profileOnly = String(context.github.text || "").split(/PROJECTS AND REPOSITORIES/i)[0].trim();
    if (profileOnly) parts.push(`GITHUB PROFILE SUMMARY (project selection is handled separately)\nSource: ${context.github.url || "Saved GitHub profile"}\n${profileOnly}`);
  }
  if (context.portfolio) {
    const preamble = String(context.portfolio.text || "").split(/PROJECT \/ WORK SECTIONS|FULL PUBLIC PORTFOLIO TEXT/i)[0].trim();
    const safeSections = (context.portfolio.sections || [])
      .filter((section) => !/project|portfolio|case stud|selected work/i.test(String(section?.heading || "")))
      .map((section) => `${String(section?.heading || "").trim()}\n${String(section?.text || "").trim()}`.trim())
      .filter(Boolean)
      .join("\n\n");
    const text = stripProjectCatalog([preamble, safeSections].filter(Boolean).join("\n\n"), candidates);
    if (text) parts.push(`PORTFOLIO SUMMARY (project catalogue excluded)\nSource: ${context.portfolio.url || "Saved portfolio"}\n${text}`);
  }
  return parts.join("\n\n").slice(0, 90000);
}

function formatProjectMatchDecision(projectMatch) {
  const project = projectMatch?.selectedProject;
  if (!project) {
    return [
      "Selected project: NONE",
      "Reason: The receiver's visible profile does not clearly match one saved project.",
      "Instruction: Do not mention a named project in this DM. Use general skills and role alignment instead."
    ].join("\n");
  }
  const facts = [
    project.description ? `Description: ${project.description}` : "",
    project.language ? `Primary language: ${project.language}` : "",
    project.topics?.length ? `Topics: ${project.topics.join(", ")}` : "",
    project.url ? `Repository: ${project.url}` : ""
  ].filter(Boolean);
  return [
    `Selected project: ${project.displayName}`,
    `Match strength: ${projectMatch.confidence || "moderate"}`,
    projectMatch.reasons?.length ? `Receiver-interest signals: ${projectMatch.reasons.join(", ")}` : "Receiver-interest signals: relevant technical overlap",
    `Selection policy: relevance first; among similarly relevant projects, prefer the least-used project so one project does not dominate every DM.`,
    ...facts,
    "Instruction: You may mention this project once when it makes the DM more specific. Do not mention any other project."
  ].join("\n");
}

async function recordProjectSelection(projectMatch, profile) {
  const project = projectMatch?.selectedProject;
  if (!project?.key) return;
  const stored = await chrome.storage.local.get(PROJECT_SELECTION_HISTORY_KEY);
  const history = normalizeProjectSelectionHistory(stored[PROJECT_SELECTION_HISTORY_KEY]);
  const now = new Date().toISOString();
  const previous = history.usage[project.key] || { count: 0, lastUsedAt: "", lastRecipient: "" };
  history.usage[project.key] = {
    count: Number(previous.count || 0) + 1,
    lastUsedAt: now,
    lastRecipient: String(profile?.name || "").trim()
  };
  history.recent.unshift({
    projectKey: project.key,
    projectName: project.displayName,
    recipient: String(profile?.name || "").trim(),
    selectedAt: now
  });
  history.recent = history.recent.slice(0, PROJECT_SELECTION_RECENT_LIMIT);
  await chrome.storage.local.set({ [PROJECT_SELECTION_HISTORY_KEY]: history });
}

async function testProvider() {
  const { settings } = await loadContext();
  if (settings.provider === "ollama") return testOllama(settings);

  const response = await callProvider(settings, [
    { role: "system", content: "Reply with exactly: IceBreaker connected" },
    { role: "user", content: "Connection test." }
  ]);
  return String(response || "").trim();
}

async function testOllama(settings) {
  const endpoint = sanitizeEndpoint(settings.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint);
  const model = await resolveOllamaModel(settings, endpoint);
  const response = await fetchLocalWithTimeout(
    `${endpoint}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: IceBreaker connected" }],
        stream: false,
        think: false,
        keep_alive: normalizeOllamaKeepAlive(settings.ollamaKeepAlive),
        options: { temperature: 0, num_ctx: 2048, num_predict: 16 }
      })
    },
    240000
  );

  assertOllamaOriginAllowed(response);
  const data = await parseJsonResponse(response, "Ollama");
  const content = String(data?.message?.content || "").trim();
  if (!content) throw new Error(data?.error || "Ollama connected but returned no test response.");
  return content;
}

async function listOllamaModels() {
  const { settings } = await loadContext();
  const endpoint = sanitizeEndpoint(settings.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint);
  return fetchOllamaModels(endpoint);
}

async function fetchOllamaModels(endpoint, { force = false } = {}) {
  const cached = ollamaModelCache.get(endpoint);
  if (!force && cached && Date.now() - cached.savedAt < OLLAMA_MODEL_CACHE_TTL_MS) {
    return cached.models;
  }

  const response = await fetchLocalWithTimeout(`${endpoint}/api/tags`, { headers: { Accept: "application/json" } }, 12000);
  assertOllamaOriginAllowed(response);
  const data = await parseJsonResponse(response, "Ollama");
  const models = Array.isArray(data.models)
    ? data.models
        .map((item) => ({
          name: String(item?.name || item?.model || "").trim(),
          size: Number(item?.size || 0),
          modifiedAt: item?.modified_at || "",
          parameterSize: item?.details?.parameter_size || "",
          quantization: item?.details?.quantization_level || "",
          family: item?.details?.family || ""
        }))
        .filter((item) => item.name)
    : [];
  ollamaModelCache.set(endpoint, { models, savedAt: Date.now() });
  return models;
}

async function listProviderModels(provider) {
  const { settings } = await loadContext();
  const selectedProvider = ["ollama", "openrouter", "groq"].includes(provider) ? provider : settings.provider;

  if (selectedProvider === "ollama") {
    const endpoint = sanitizeEndpoint(settings.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint);
    return fetchOllamaModels(endpoint);
  }

  if (selectedProvider === "openrouter") return fetchOpenRouterModels(settings);
  if (selectedProvider === "groq") return fetchGroqModels(settings);
  throw new Error("Choose Ollama, OpenRouter, or Groq.");
}

async function updateGenerationMode(mode) {
  const selectedMode = normalizeMode(mode);
  const stored = await chrome.storage.local.get("settings");
  const next = {
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {}),
    schemaVersion: 23,
    generationMode: selectedMode,
    autoGenerate: stored.settings?.autoGenerate !== false,
    ollamaEndpoint: normalizeOllamaEndpoint(stored.settings?.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint)
  };
  await chrome.storage.local.set({ settings: next });
  await chrome.storage.session.remove(["activeProfile", "latestGeneration"]).catch(() => {});
  latestHoveredSignature = "";
  if (activeGenerationRequest) activeGenerationRequest.controller.abort("mode changed");
  await injectIntoOpenLinkedInTabs();
  await broadcastToLinkedInTabs({ type: "ICEBREAKER_SETTINGS_UPDATED" });
  return next;
}

async function updateEngineSelection(provider, model, apiAccessMode = "") {
  const selectedProvider = ["ollama", "openrouter", "groq"].includes(provider) ? provider : "ollama";
  const selectedModel = String(model || "").trim();
  const stored = await chrome.storage.local.get("settings");
  const next = {
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {}),
    provider: selectedProvider,
    apiAccessMode: selectedProvider === "ollama"
      ? normalizeApiAccessMode(stored.settings?.apiAccessMode)
      : normalizeApiAccessMode(apiAccessMode || stored.settings?.apiAccessMode),
    manualApiKey: migrateManualApiKey(stored.settings || {}),
    manualApiProvider: detectApiProvider(migrateManualApiKey(stored.settings || {})),
    schemaVersion: 23,
    generationMode: normalizeMode(stored.settings?.generationMode),
    autoGenerate: stored.settings?.autoGenerate !== false,
    ollamaEndpoint: normalizeOllamaEndpoint(stored.settings?.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint)
  };

  if (selectedProvider === "ollama" && selectedModel) next.ollamaModel = selectedModel;
  if (selectedProvider === "openrouter" && selectedModel) next.openRouterModel = selectedModel;
  if (selectedProvider === "groq" && selectedModel) next.groqModel = selectedModel;

  await chrome.storage.local.set({ settings: next });
  if (selectedProvider === "ollama") {
    const endpoint = sanitizeEndpoint(next.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint);
    const model = selectedModel || next.ollamaModel;
    if (model) void warmOllamaModel(endpoint, model, next.ollamaKeepAlive).catch(() => {});
  }
  await chrome.storage.session.remove("latestGeneration").catch(() => {});
  await broadcastToLinkedInTabs({ type: "ICEBREAKER_SETTINGS_UPDATED" });
  return next;
}

async function fetchOpenRouterModels(settings) {
  const headers = { Accept: "application/json" };

  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/models?output_modalities=text&sort=most-popular",
    { headers },
    30000
  );
  const data = await parseJsonResponse(response, "OpenRouter");
  const models = Array.isArray(data?.data) ? data.data : [];
  return models
    .filter((item) => item?.id)
    .slice(0, 250)
    .map((item) => {
      const promptPrice = Number(item?.pricing?.prompt || 0);
      const completionPrice = Number(item?.pricing?.completion || 0);
      const free = promptPrice === 0 && completionPrice === 0;
      return {
        id: String(item.id),
        name: String(item.name || item.id),
        detail: [free ? "Free" : "Cloud", item.context_length ? `${Number(item.context_length).toLocaleString()} ctx` : ""].filter(Boolean).join(" · "),
        free
      };
    });
}

async function fetchGroqModels(settings) {
  return withProviderKeyFailover(settings, "groq", async (apiKey) => {
    const response = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/models",
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      },
      30000
    );
    const data = await parseJsonResponse(response, "Groq");
    const models = Array.isArray(data?.data) ? data.data : [];
    return models
      .filter((item) => item?.id && item?.active !== false)
      .filter((item) => !/whisper|speech|tts|orpheus|prompt-guard|safeguard/i.test(String(item.id)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((item) => ({
        id: String(item.id),
        name: String(item.id),
        detail: item?.owned_by ? `Groq · ${item.owned_by}` : "Groq"
      }));
  });
}

async function callProvider(settings, messages, requestOptions = {}) {
  if (settings.provider === "ollama") return callOllama(settings, messages, requestOptions);
  if (settings.provider === "openrouter") return callOpenRouter(settings, messages, requestOptions);
  if (settings.provider === "groq") return callGroq(settings, messages, requestOptions);
  throw new Error("Choose a valid AI provider in Settings.");
}

async function callOllama(settings, messages, requestOptions = {}) {
  const endpoint = sanitizeEndpoint(settings.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint);
  const model = await resolveOllamaModel(settings, endpoint);
  const onProgress = typeof requestOptions.onProgress === "function" ? requestOptions.onProgress : async () => {};

  await onProgress(`Loading ${model}…`);

  const content = await fetchOllamaChatStream(
    `${endpoint}/api/chat`,
    {
      model,
      messages,
      stream: true,
      think: false,
      keep_alive: normalizeOllamaKeepAlive(settings.ollamaKeepAlive),
      options: {
        temperature: 0.35,
        top_p: 0.88,
        repeat_penalty: 1.05,
        num_ctx: 4096,
        num_predict: clampNumber(requestOptions.maxOutputTokens, 64, 240, 140)
      }
    },
    {
      signal: requestOptions.signal,
      onProgress: async (stage) => onProgress(stage || `Writing with ${model}…`),
      model
    }
  );

  if (!content) throw new Error("Ollama returned an empty response.");
  return content;
}

async function fetchOllamaChatStream(url, payload, { signal, onProgress, model }) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason || "cancelled");
  if (signal) {
    if (signal.aborted) abortFromCaller();
    else signal.addEventListener("abort", abortFromCaller, { once: true });
  }

  let headerTimer = null;
  let idleTimer = null;
  let overallTimer = null;
  let timedOut = false;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      controller.abort("idle-timeout");
    }, 240000);
  };

  try {
    headerTimer = setTimeout(() => {
      timedOut = true;
      controller.abort("header-timeout");
    }, 240000);
    overallTimer = setTimeout(() => {
      timedOut = true;
      controller.abort("overall-timeout");
    }, 600000);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: JSON.stringify(payload),
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal
    });

    clearTimeout(headerTimer);
    assertOllamaOriginAllowed(response);
    if (!response.ok) {
      const data = await parseJsonResponse(response, "Ollama");
      throw new Error(data?.error || `Ollama request failed (${response.status}).`);
    }
    if (!response.body) throw new Error("Ollama did not provide a response stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let firstChunk = true;
    resetIdleTimer();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      resetIdleTimer();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let chunk;
        try {
          chunk = JSON.parse(trimmed);
        } catch (_) {
          continue;
        }
        if (chunk?.error) throw new Error(`Ollama: ${chunk.error}`);
        if (firstChunk) {
          firstChunk = false;
          await onProgress(`Writing with ${model}…`);
        }
        if (chunk?.message?.content) content += String(chunk.message.content);
        if (chunk?.done) return content.trim();
      }
    }

    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer.trim());
        if (chunk?.error) throw new Error(`Ollama: ${chunk.error}`);
        if (chunk?.message?.content) content += String(chunk.message.content);
      } catch (error) {
        if (/^Ollama:/.test(String(error?.message || ""))) throw error;
      }
    }
    return content.trim();
  } catch (error) {
    if (error?.name === "AbortError") {
      if (signal?.aborted && !timedOut) throw new Error("Generation was replaced by newer LinkedIn content.");
      throw new Error("Ollama stopped responding. Use llama3.2 or qwen3:1.7b for faster local drafts, and run `ollama ps` to check whether the model is loaded in memory.");
    }
    const detail = String(error?.message || error || "");
    if (/Failed to fetch|NetworkError|Load failed|address space|local network|CORS/i.test(detail)) {
      throw new Error("IceBreaker could not reach Ollama at http://127.0.0.1:11434. Run Enable-Ollama-for-IceBreaker.bat, then reload the extension.");
    }
    throw error;
  } finally {
    clearTimeout(headerTimer);
    clearTimeout(idleTimer);
    clearTimeout(overallTimer);
    if (signal) signal.removeEventListener("abort", abortFromCaller);
  }
}

async function resolveOllamaModel(settings, endpoint) {
  const selected = String(settings.ollamaModel || "").trim();
  // A saved model can be used directly. Avoid an extra /api/tags request on
  // every generation; the model picker already validates installed models.
  if (selected) return selected;

  const models = await fetchOllamaModels(endpoint);
  if (!models.length) {
    throw new Error("Ollama is running, but no installed models were found. Install one with: ollama pull llama3.2");
  }

  const chosen = models[0].name;

  const stored = await chrome.storage.local.get("settings");
  const nextSettings = {
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {}),
    ollamaModel: chosen,
    autoGenerate: stored.settings?.autoGenerate !== false,
    schemaVersion: 23,
    generationMode: normalizeMode(stored.settings?.generationMode),
    ollamaEndpoint: normalizeOllamaEndpoint(stored.settings?.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint)
  };
  await chrome.storage.local.set({ settings: nextSettings });
  await notifyExtensionPages({ type: "OLLAMA_MODEL_SELECTED", model: chosen });
  return chosen;
}

async function callOpenRouter(settings, messages, requestOptions = {}) {
  const selectedModel = normalizeOpenRouterModel(settings.openRouterModel);
  const requestMessages = compactProviderMessages(messages, {
    systemMaxChars: 700,
    userMaxChars: requestOptions.compactInput ? 2200 : 7600,
    assistantMaxChars: 1800
  });
  if (!requestMessages.length) throw new Error("OpenRouter request has no usable messages.");

  // The free router can occasionally choose a reasoning-heavy model that uses
  // the entire small output budget before producing final text. Build a short
  // list of current free text models that can reliably return normal content,
  // then retry them automatically when the router returns an empty choice.
  let discoveredFallbacks = [];
  try {
    discoveredFallbacks = await getOpenRouterFreeTextFallbacks(requestOptions.signal);
  } catch (_) {
    // Model discovery is an optimisation. The router attempts below still work.
  }

  const candidates = buildOpenRouterCandidates(selectedModel, discoveredFallbacks);
  const outputBudget = clampNumber(
    Number(requestOptions.maxOutputTokens || 160) * 3,
    256,
    640,
    384
  );

  return withProviderKeyFailover(settings, "openrouter", async (apiKey) => {
    let lastError = null;

    for (const candidate of candidates) {
      try {
        const payload = {
          model: candidate.id,
          messages: requestMessages,
          max_tokens: outputBudget,
          stream: false,
          provider: { allow_fallbacks: true }
        };

        // Only disable reasoning when the current explicit model advertises
        // support for effort="none". Dynamic routers omit reasoning metadata,
        // so no unsupported reasoning option is sent to openrouter/free.
        if (candidate.reasoningOffSupported) {
          payload.reasoning = { effort: "none", exclude: true };
        }

        const response = await fetchWithTimeout(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://www.linkedin.com/",
              "X-OpenRouter-Title": "IceBreaker"
            },
            body: JSON.stringify(payload),
            cache: "no-store",
            credentials: "omit"
          },
          75000,
          requestOptions.signal
        );

        const data = await parseJsonResponse(response, "OpenRouter");
        if (data?.error) throw providerBodyError("OpenRouter", data.error);

        const choice = data?.choices?.[0] || {};
        const message = choice?.message || {};
        const content = normalizeMessageContent(
          message?.content ?? message?.text ?? choice?.text ?? choice?.delta?.content
        );
        if (content) return content;

        const finishReason = String(choice?.finish_reason || choice?.native_finish_reason || "unknown");
        const routedModel = String(data?.model || candidate.id);
        throw new Error(
          `OpenRouter returned no final text from ${routedModel} (finish reason: ${finishReason}).`
        );
      } catch (error) {
        lastError = error;
        if (!shouldTryOpenRouterFallback(error)) throw error;
      }
    }

    throw lastError || new Error("OpenRouter could not produce final text with the available models.");
  });
}

function buildOpenRouterCandidates(selectedModel, discoveredFallbacks = []) {
  const candidates = [];
  const seen = new Set();
  const add = (candidate) => {
    const id = String(candidate?.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    candidates.push({
      id,
      reasoningOffSupported: candidate?.reasoningOffSupported === true
    });
  };

  if (selectedModel !== "openrouter/free") add({ id: selectedModel });
  add({ id: "openrouter/free" });
  discoveredFallbacks.forEach(add);

  // A second free-router attempt can select a different currently available
  // free model. Keep it as a distinct attempt without duplicating the ID list.
  if (selectedModel === "openrouter/free") {
    candidates.push({ id: "openrouter/free", reasoningOffSupported: false });
  }

  return candidates.slice(0, 6);
}

async function getOpenRouterFreeTextFallbacks(externalSignal = null) {
  if (
    openRouterFreeModelCache.expiresAt > Date.now() &&
    Array.isArray(openRouterFreeModelCache.models) &&
    openRouterFreeModelCache.models.length
  ) {
    return openRouterFreeModelCache.models;
  }

  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/models",
    { headers: { Accept: "application/json" }, cache: "no-store", credentials: "omit" },
    20000,
    externalSignal
  );
  const data = await parseJsonResponse(response, "OpenRouter models");
  const models = (Array.isArray(data?.data) ? data.data : [])
    .filter(isUsableOpenRouterFreeTextModel)
    .map((model) => ({
      id: String(model.id),
      reasoningOffSupported: openRouterModelSupportsReasoningOff(model),
      score: scoreOpenRouterFallbackModel(model)
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 4)
    .map(({ id, reasoningOffSupported }) => ({ id, reasoningOffSupported }));

  openRouterFreeModelCache = {
    expiresAt: Date.now() + OPENROUTER_FREE_MODEL_CACHE_TTL_MS,
    models
  };
  return models;
}

function isUsableOpenRouterFreeTextModel(model) {
  const id = String(model?.id || "");
  if (!id || id === "openrouter/free") return false;
  const promptPrice = Number(model?.pricing?.prompt);
  const completionPrice = Number(model?.pricing?.completion);
  if (promptPrice !== 0 || completionPrice !== 0) return false;

  const inputModalities = Array.isArray(model?.architecture?.input_modalities)
    ? model.architecture.input_modalities
    : [];
  const outputModalities = Array.isArray(model?.architecture?.output_modalities)
    ? model.architecture.output_modalities
    : [];
  if (inputModalities.length && !inputModalities.includes("text")) return false;
  if (outputModalities.length && !outputModalities.includes("text")) return false;
  if (model?.reasoning?.mandatory === true) return false;
  if (
    model?.reasoning &&
    model.reasoning.default_enabled !== false &&
    !openRouterModelSupportsReasoningOff(model)
  ) return false;

  const supported = Array.isArray(model?.supported_parameters) ? model.supported_parameters : [];
  if (supported.length && !supported.includes("max_tokens")) return false;
  return true;
}

function openRouterModelSupportsReasoningOff(model) {
  if (!model?.reasoning || model.reasoning.mandatory === true) return false;
  if (!Object.prototype.hasOwnProperty.call(model.reasoning, "supported_efforts")) return false;
  const efforts = model.reasoning.supported_efforts;
  return efforts === null || (Array.isArray(efforts) && efforts.includes("none"));
}

function scoreOpenRouterFallbackModel(model) {
  const id = String(model?.id || "").toLowerCase();
  const name = String(model?.name || "").toLowerCase();
  const text = `${id} ${name}`;
  let score = 0;

  if (!model?.reasoning) score += 70;
  else if (openRouterModelSupportsReasoningOff(model)) score += 45;
  if (/flash|instant|turbo|lite/.test(text)) score += 35;
  if (/instruct|chat/.test(text)) score += 25;
  if (/mini|small|\b(?:3b|7b|8b|9b|12b|14b|27b|32b)\b/.test(text)) score += 18;
  if (/reason|thinking|deepseek-r1|coder|code|vision|\bvl\b/.test(text)) score -= 35;
  score += Math.min(20, Math.log10(Math.max(1, Number(model?.context_length || 1))) * 3);
  return score;
}

async function callGroq(settings, messages, requestOptions = {}) {
  const selectedModel = String(settings.groqModel || "llama-3.1-8b-instant").trim();
  const modelCandidates = [...new Set([selectedModel, "llama-3.1-8b-instant"].filter(Boolean))];
  const providerMessages = compactProviderMessages(messages, {
    systemMaxChars: requestOptions.compactInput ? 320 : 650,
    userMaxChars: requestOptions.compactInput ? 2200 : 5200,
    assistantMaxChars: 1400
  });
  const isAutopilotRequest = requestOptions.source === "autopilot";

  return withProviderKeyFailover(settings, "groq", async (apiKey, keyCandidate) => {
    let lastError = null;
    for (const model of modelCandidates) {
      for (let requestAttempt = 0; requestAttempt < 3; requestAttempt += 1) {
        try {
          const cooldownRemaining = await providerCooldownRemainingMs("groq", apiKey);
          if (cooldownRemaining > 0 && keyCandidate?.source === "official") {
            const error = new Error(`This Groq key is cooling down for ${Math.ceil(cooldownRemaining / 1000)}s after a rate limit.`);
            error.status = 429;
            error.retryAfterMs = cooldownRemaining;
            throw error;
          }
          if (isAutopilotRequest && cooldownRemaining > 0) {
            const error = new Error(`Groq is cooling down for ${Math.ceil(cooldownRemaining / 1000)}s after a rate limit. Autopilot will use its local draft fallback instead of waiting.`);
            error.status = 429;
            throw error;
          }
          await waitForProviderCooldown("groq", apiKey, requestOptions.signal, requestOptions.onProgress);
          const response = await fetchWithTimeout(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model,
                messages: providerMessages,
                temperature: 0.35,
                max_completion_tokens: clampNumber(requestOptions.maxOutputTokens, 48, 220, 120),
                ...(/^openai\/gpt-oss/i.test(model)
                  ? { reasoning_effort: "low", reasoning_format: "hidden" }
                  : /^qwen\//i.test(model)
                    ? { reasoning_effort: "none", reasoning_format: "hidden" }
                    : {}),
                stream: false
              }),
              cache: "no-store",
              credentials: "omit"
            },
            45000,
            requestOptions.signal
          );

          const data = await parseJsonResponse(response, "Groq");
          if (data?.error) throw providerBodyError("Groq", data.error);
          const content = normalizeMessageContent(data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text);
          if (!content) throw new Error("Groq returned an empty response. Select another model and try again.");
          return content;
        } catch (error) {
          lastError = error;
          if (isGroqRateLimitError(error)) {
            const waitMs = groqRetryDelayMs(error, requestAttempt);
            await setProviderCooldown("groq", apiKey, waitMs);
            if (isAutopilotRequest || keyCandidate?.source === "official") throw error;
          }
          if (isGroqRateLimitError(error) && requestAttempt < 1) {
            const waitMs = groqRetryDelayMs(error, requestAttempt);
            await requestOptions.onProgress?.(`Groq limit reached — retrying automatically in ${Math.ceil(waitMs / 1000)}s…`);
            continue;
          }
          break;
        }
      }
      if (model === "llama-3.1-8b-instant" || !shouldTryProviderModelFallback(lastError)) throw lastError;
    }
    throw lastError || new Error("Groq request failed.");
  });
}

function providerCooldownSlot(provider, apiKey = "") {
  const value = String(apiKey || "");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return value ? `${provider}:${(hash >>> 0).toString(36)}` : provider;
}

async function providerCooldownRemainingMs(provider, apiKey = "") {
  const stored = await chrome.storage.local.get("providerCooldowns");
  const cooldowns = stored.providerCooldowns && typeof stored.providerCooldowns === "object" ? stored.providerCooldowns : {};
  const slot = providerCooldownSlot(provider, apiKey);
  return Math.max(0, Number(cooldowns[slot] || 0) - Date.now());
}

function compactProviderContent(value, maxChars) {
  const text = String(value || "").trim();
  const limit = Math.max(200, Number(maxChars || 0));
  if (text.length <= limit) return text;

  const ruleMarkers = ["\nSTRICT RULES", "\nREQUIRED CONTENT", "\nRULES"];
  let markerIndex = -1;
  for (const marker of ruleMarkers) {
    const index = text.lastIndexOf(marker);
    if (index > markerIndex) markerIndex = index;
  }

  const tailTarget = Math.min(Math.floor(limit * 0.38), 1900);
  let tail = markerIndex >= 0 ? text.slice(markerIndex) : text.slice(-tailTarget);
  if (tail.length > tailTarget) tail = tail.slice(-tailTarget);
  const headLimit = Math.max(120, limit - tail.length - 28);
  const head = text.slice(0, headLimit).trimEnd();
  return `${head}\n\n[context compacted]\n\n${tail.trimStart()}`;
}

function compactProviderMessages(messages, limits = {}) {
  const systemMaxChars = Number(limits.systemMaxChars || 500);
  const userMaxChars = Number(limits.userMaxChars || 5200);
  const assistantMaxChars = Number(limits.assistantMaxChars || 1400);
  return normalizeProviderMessages(messages).map((message) => ({
    ...message,
    content: compactProviderContent(
      message.content,
      message.role === "system" ? systemMaxChars : message.role === "assistant" ? assistantMaxChars : userMaxChars
    )
  }));
}

async function waitForProviderCooldown(provider, apiKey, signal, onProgress) {
  const remaining = await providerCooldownRemainingMs(provider, apiKey);
  if (remaining <= 0) return;
  await onProgress?.(`${provider === "groq" ? "Groq" : provider} cooling down — resuming in ${Math.ceil(remaining / 1000)}s…`);
  await abortableSleep(remaining + 150, signal);
}

async function setProviderCooldown(provider, apiKey, waitMs) {
  const stored = await chrome.storage.local.get("providerCooldowns");
  const cooldowns = stored.providerCooldowns && typeof stored.providerCooldowns === "object" ? stored.providerCooldowns : {};
  const slot = providerCooldownSlot(provider, apiKey);
  cooldowns[slot] = Math.max(Number(cooldowns[slot] || 0), Date.now() + Math.max(1000, Number(waitMs || 0)));
  for (const [key, until] of Object.entries(cooldowns)) {
    if (Number(until || 0) <= Date.now()) delete cooldowns[key];
  }
  await chrome.storage.local.set({ providerCooldowns: cooldowns });
}

function isGroqRateLimitError(error) {
  return Number(error?.status || 0) === 429 || /\b429\b|rate.?limit|tokens per minute|requests per minute|too many requests/i.test(String(error?.message || error || ""));
}

function groqRetryDelayMs(error, attempt = 0) {
  const explicit = Number(error?.retryAfterMs || 0);
  if (explicit > 0) return Math.min(65000, Math.max(1200, explicit + 500));
  const message = String(error?.message || error || "");
  const secondsMatch = message.match(/(?:try again|retry|resets?)[^\d]{0,20}(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/i);
  if (secondsMatch) return Math.min(65000, Math.max(1200, Math.ceil(Number(secondsMatch[1]) * 1000) + 500));
  return Math.min(30000, 6000 * (attempt + 1));
}

function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Generation stopped by user."));
      return;
    }
    const timer = setTimeout(done, Math.max(0, Number(ms || 0)));
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      reject(new Error("Generation stopped by user."));
    };
    function done() {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

function normalizeOpenRouterModel(value) {
  let model = String(value || "").trim();
  try {
    const url = new URL(model);
    if (/^(?:www\.)?openrouter\.ai$/i.test(url.hostname)) {
      model = url.pathname.replace(/^\/(?:models\/)?/i, "").replace(/\/+$/, "");
    }
  } catch (_) {
    model = model.replace(/^(?:https?:\/\/)?(?:www\.)?openrouter\.ai\/(?:models\/)?/i, "");
  }
  model = model.trim().replace(/^\/+|\/+$/g, "");
  return /^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(model) ? model : "openrouter/free";
}

function normalizeProviderMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => ({
      role: ["system", "user", "assistant"].includes(message?.role) ? message.role : "user",
      content: normalizeMessageContent(message?.content).trim()
    }))
    .filter((message) => message.content);
}

function shouldTryOpenRouterFallback(error) {
  const detail = String(error?.message || error || "");
  return shouldTryProviderModelFallback(error) ||
    /\b400\b|bad request|invalid request|no final text|empty response|empty draft|unusably short|finish reason/i.test(detail);
}

function shouldTryProviderModelFallback(error) {
  const detail = String(error?.message || error || "");
  return /\b(402|403|404|408|409|425|429|500|502|503|504)\b|model.*(?:blocked|permission|not found|unavailable)|credits|payment required|overloaded|capacity|timed? out/i.test(detail);
}

function providerBodyError(provider, errorValue) {
  const errorObject = errorValue && typeof errorValue === "object" ? errorValue : null;
  const code = errorObject?.code || errorObject?.status || errorObject?.type || "";
  const message = errorObject?.message || String(errorValue || "Unknown provider error");
  return new Error(`${provider} generation failed${code ? ` (${code})` : ""}: ${message}`);
}

function normalizeMessageContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .join("")
      .trim();
  }
  return "";
}

function extractPlainDraft(raw) {
  let text = String(raw || "").trim();
  if (!text) return "";

  text = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json|text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // One generic fallback in case a model ignores the plain-text instruction.
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.message === "string") text = parsed.message;
      else if (typeof parsed?.comment === "string") text = parsed.comment;
      else if (typeof parsed?.reply === "string") text = parsed.reply;
    } catch (_) {}
  }

  return text
    .replace(/^(?:final\s+)?(?:comment|reply|response|message|dm)\s*[:.-]\s*/i, "")
    .trim();
}

function outputTokenBudget(length) {
  const range = getSelectedWordRange(length);
  return Math.min(240, Math.max(72, Math.ceil(range.max * 1.8)));
}

function normalizeOllamaKeepAlive(value) {
  const raw = String(value ?? "-1").trim();
  if (!raw || raw === "30m") return -1;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  return raw;
}

async function warmConfiguredOllama() {
  try {
    const { settings } = await loadContext();
    if (settings.provider !== "ollama") return;
    const endpoint = sanitizeEndpoint(settings.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint);
    const model = await resolveOllamaModel(settings, endpoint);
    await warmOllamaModel(endpoint, model, settings.ollamaKeepAlive);
  } catch (_) {
    // Warm-up is only a speed optimisation. Normal generation reports errors.
  }
}

async function warmOllamaModel(endpoint, model, keepAlive = "-1", externalSignal = null) {
  const key = `${endpoint}|${model}`;
  if (ollamaWarmups.has(key)) return ollamaWarmups.get(key);

  const task = (async () => {
    const response = await fetchLocalWithTimeout(
      `${endpoint}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          keep_alive: normalizeOllamaKeepAlive(keepAlive)
        })
      },
      180000,
      externalSignal
    );
    assertOllamaOriginAllowed(response);
    await parseJsonResponse(response, "Ollama");
    return true;
  })();

  ollamaWarmups.set(key, task);
  try {
    return await task;
  } catch (error) {
    ollamaWarmups.delete(key);
    throw error;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000, externalSignal = null) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason || "cancelled");
  if (externalSignal) {
    if (externalSignal.aborted) abortFromCaller();
    else externalSignal.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort("timeout");
  }, timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      if (externalSignal?.aborted && !timedOut) throw new Error("Generation was replaced by newer LinkedIn content.");
      throw new Error("The AI request timed out. Check the provider and selected model, then try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener("abort", abortFromCaller);
  }
}

async function fetchLocalWithTimeout(url, options = {}, timeoutMs = 30000, externalSignal = null) {
  const localOptions = {
    cache: "no-store",
    credentials: "omit",
    ...options
  };
  try {
    return await fetchWithTimeout(url, localOptions, timeoutMs, externalSignal);
  } catch (error) {
    const detail = String(error?.message || error || "");
    if (!/Failed to fetch|NetworkError|Load failed|address space|local network|CORS/i.test(detail)) throw error;
    throw new Error(
      "IceBreaker could not reach Ollama at http://127.0.0.1:11434. Run Setup-Ollama-for-IceBreaker.ps1 once, confirm `curl http://127.0.0.1:11434/api/tags` works, then reload the extension."
    );
  }
}

async function parseJsonResponse(response, providerName = "Provider") {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }

  if (!response.ok) {
    const errorObject = data?.error && typeof data.error === "object" ? data.error : null;
    const providerMessage = errorObject?.message || data?.error || data?.message || text;
    const providerCode = errorObject?.code || errorObject?.type || data?.code || "";
    const detail = String(providerMessage || "").trim();
    const error = new Error(`${providerName} request failed (${response.status})${providerCode ? ` [${providerCode}]` : ""}${detail ? `: ${detail}` : "."}`);
    error.status = response.status;
    error.providerCode = providerCode;
    error.retryAfterMs = parseProviderRetryAfterMs(response, detail);
    throw error;
  }
  return data;
}

function parseProviderRetryAfterMs(response, detail = "") {
  const retryAfter = String(response?.headers?.get?.("retry-after") || "").trim();
  if (/^\d+(?:\.\d+)?$/.test(retryAfter)) return Math.ceil(Number(retryAfter) * 1000);
  const resetTokens = String(response?.headers?.get?.("x-ratelimit-reset-tokens") || "").trim();
  const resetRequests = String(response?.headers?.get?.("x-ratelimit-reset-requests") || "").trim();
  for (const value of [resetTokens, resetRequests]) {
    const match = value.match(/(\d+(?:\.\d+)?)\s*(ms|s|m)?/i);
    if (!match) continue;
    const number = Number(match[1]);
    const unit = String(match[2] || "s").toLowerCase();
    return Math.ceil(number * (unit === "ms" ? 1 : unit === "m" ? 60000 : 1000));
  }
  const messageMatch = String(detail || "").match(/(?:try again|retry|resets?)[^\d]{0,20}(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/i);
  return messageMatch ? Math.ceil(Number(messageMatch[1]) * 1000) : 0;
}

function assertOllamaOriginAllowed(response) {
  if (response.status === 403) {
    const origin = `chrome-extension://${chrome.runtime.id}`;
    throw new Error(
      `E403: Ollama rejected ${origin}. Run Enable-Ollama-for-IceBreaker.bat once, then reload the extension.`
    );
  }
}

function normalizeApiAccessMode(value) {
  return value === "manual" ? "manual" : "official";
}

function detectApiProvider(value) {
  const key = sanitizeApiKey(value, "API");
  if (/^gsk_/i.test(key)) return "groq";
  if (/^sk-or-/i.test(key)) return "openrouter";
  return "";
}

function migrateManualApiKey(settings) {
  const direct = sanitizeApiKey(settings?.manualApiKey || "", "API");
  if (direct) return direct;
  const groq = sanitizeApiKey(settings?.groqApiKey || "", "Groq");
  if (groq) return groq;
  return sanitizeApiKey(settings?.openRouterApiKey || "", "OpenRouter");
}

function validOfficialKey(provider, value) {
  const key = sanitizeApiKey(value, provider);
  if (!key || /PASTE_|YOUR_|_HERE|EXAMPLE|REPLACE_ME/i.test(key)) return false;
  return provider === "groq" ? /^gsk_/i.test(key) : /^sk-or-/i.test(key);
}

async function configuredOfficialKeys(provider) {
  const env = await loadEmbeddedEnv();
  const generatedPool = Array.isArray(OFFICIAL_API_KEYS?.[provider]) ? OFFICIAL_API_KEYS[provider] : [];
  const envPool = provider === "groq"
    ? [env?.GROQ_API_KEY, env?.GROQ_API_KEY_1, env?.GROQ_API_KEY_2]
    : [env?.OPENROUTER_API_KEY, env?.OPENROUTER_API_KEY_1, env?.OPENROUTER_API_KEY_2];
  const pool = [...generatedPool, ...envPool];
  return [...new Set(pool.map((key) => sanitizeApiKey(key, provider)).filter((key) => validOfficialKey(provider, key)))];
}

async function providerKeyCandidates(settings, provider) {
  const mode = normalizeApiAccessMode(settings?.apiAccessMode);
  if (mode === "manual") {
    const key = migrateManualApiKey(settings || {});
    const detected = detectApiProvider(key);
    if (!key || !detected) {
      throw new Error("Add a valid Groq or OpenRouter key in Settings and select Manual API.");
    }
    if (detected !== provider) {
      throw new Error(`Your manual API key belongs to ${detected === "groq" ? "Groq" : "OpenRouter"}. Select that provider or switch to Official API.`);
    }
    return [{ key, source: "manual", index: 0 }];
  }

  const keys = await configuredOfficialKeys(provider);
  if (!keys.length) {
    const legacyKey = sanitizeApiKey(
      provider === "groq" ? settings?.groqApiKey : settings?.openRouterApiKey,
      provider
    );
    if (validOfficialKey(provider, legacyKey)) {
      return [{ key: legacyKey, source: "manual", index: 0 }];
    }
    throw new Error(`No usable embedded ${provider === "groq" ? "Groq" : "OpenRouter"} API key was found in src/backend/config/official-api-keys.js. Run scripts/api/Build-Official-Keys.bat, then reload IceBreaker.`);
  }

  const stored = await chrome.storage.local.get("officialApiKeyCursor");
  const cursors = stored.officialApiKeyCursor && typeof stored.officialApiKeyCursor === "object"
    ? stored.officialApiKeyCursor
    : {};
  const start = Math.abs(Number(cursors[provider] || 0)) % keys.length;
  return keys.map((_, offset) => {
    const index = (start + offset) % keys.length;
    return { key: keys[index], source: "official", index };
  });
}

function retryableKeyFailure(error) {
  const detail = String(error?.message || error || "");
  return /\b(401|403|408|409|425|429|500|502|503|504)\b|quota exhausted|rate.?limit|tokens per minute|requests per minute|too many requests|temporar|timeout|timed out|network|failed to fetch|load failed|overloaded|capacity|authentication|unauthori|invalid api key/i.test(detail);
}

async function rememberOfficialKeySuccess(provider, index, poolSize) {
  const stored = await chrome.storage.local.get("officialApiKeyCursor");
  const cursors = stored.officialApiKeyCursor && typeof stored.officialApiKeyCursor === "object"
    ? stored.officialApiKeyCursor
    : {};
  cursors[provider] = poolSize ? (Number(index) + 1) % poolSize : 0;
  await chrome.storage.local.set({ officialApiKeyCursor: cursors });
}

async function withProviderKeyFailover(settings, provider, request) {
  const candidates = await providerKeyCandidates(settings, provider);
  let lastError = null;

  for (let attempt = 0; attempt < candidates.length; attempt += 1) {
    const candidate = candidates[attempt];
    try {
      const result = await request(candidate.key, candidate);
      if (candidate.source === "official") {
        await rememberOfficialKeySuccess(provider, candidate.index, candidates.length);
      }
      return result;
    } catch (error) {
      lastError = error;
      const canRetry = candidate.source === "official" && attempt < candidates.length - 1 && retryableKeyFailure(error);
      if (!canRetry) throw error;
    }
  }

  throw lastError || new Error(`${provider} request failed.`);
}

function sanitizeApiKey(value, providerName) {
  const key = String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^(?:(?:OPENROUTER|GROQ)_API_KEY(?:_[12])?|MANUAL_API_KEY)\s*=\s*/i, "")
    .trim()
    .replace(/^[\"']|[\"']$/g, "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^Bearer(?=(?:sk-|gsk_))/i, "")
    .trim()
    .replace(/^[\"']|[\"']$/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (/[^\x21-\x7E]/.test(key)) {
    throw new Error(`${providerName} API key contains unsupported characters. Delete it and paste the key again.`);
  }

  return key;
}

function normalizeOllamaEndpoint(value) {
  const fallback = DEFAULT_SETTINGS.ollamaEndpoint;
  const raw = String(value || fallback).trim().replace(/\/+$/, "");

  try {
    const url = new URL(raw || fallback);
    if (url.protocol !== "http:") return fallback;
    if (["localhost", "0.0.0.0", "[::1]", "::1"].includes(url.hostname)) {
      url.hostname = "127.0.0.1";
    }
    if (!url.port) url.port = "11434";
    return url.origin;
  } catch (_) {
    return fallback;
  }
}

function sanitizeEndpoint(value) {
  return normalizeOllamaEndpoint(value);
}

function normalizeMode(value) {
  return ["dms", "comments", "conversation"].includes(value) ? value : "dms";
}

function profileSignature(profile) {
  if (!profile) return "";
  const mode = normalizeMode(profile.mode);
  if (mode === "conversation") {
    const transcript = String(profile.description || profile.rawText || "")
      .split(/\n+/)
      .map((line) => String(line || "").replace(/\s+/g, " ").trim())
      .filter((line) => /^\[(?:YOU|CONTACT)(?:\s*-.*)?\]\s*:/i.test(line))
      .slice(-8)
      .join("\n");
    return [
      mode,
      profile.url,
      profile.name,
      profile.latestDirection,
      profile.latestMessage,
      transcript
    ].map((value) => String(value || "").trim()).join("|");
  }
  return [
    mode,
    profile.url,
    profile.name,
    profile.headline,
    profile.contextType,
    String(profile.description || "").slice(-1200),
    String(profile.commentText || "").slice(-1200),
    String(profile.parentPostText || "").slice(-1200)
  ].map((value) => String(value || "").trim()).join("|");
}

function selectRelevantResumeText(value, query, maxChars = 9000) {
  const text = String(value || "").replace(/\r/g, "").trim();
  if (text.length <= maxChars) return text;

  const keywords = new Set(
    String(query || "")
      .toLowerCase()
      .match(/[a-z0-9+#.-]{4,}/g)
      ?.filter((word) => !["with", "from", "this", "that", "linkedin", "profile", "visible", "unknown"].includes(word)) || []
  );

  let chunks = text.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  if (chunks.length < 6) {
    chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [text];
  }

  const scored = chunks.map((chunk, index) => {
    const lower = chunk.toLowerCase();
    let score = index < 8 ? 2 : 0;
    for (const keyword of keywords) if (lower.includes(keyword)) score += 4;
    if (/skills?|experience|project|education|engineer|developer|machine learning|artificial intelligence|full.?stack/i.test(chunk)) score += 2;
    return { chunk, index, score };
  });

  const selected = [];
  let used = 0;
  const add = (item) => {
    if (!item || selected.some((entry) => entry.index === item.index)) return;
    const cost = item.chunk.length + 2;
    if (used + cost > maxChars) return;
    selected.push(item);
    used += cost;
  };

  scored.slice(0, 8).forEach(add);
  scored.slice().sort((a, b) => b.score - a.score || a.index - b.index).forEach(add);
  return selected.sort((a, b) => a.index - b.index).map((item) => item.chunk).join("\n").slice(0, maxChars);
}

function truncate(value, max) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}\n[truncated]` : text;
}


function getSelectedWordRange(length) {
  return WORD_RANGES[length] || WORD_RANGES.medium;
}

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function enforceMaximumWordCount(value, maxWords) {
  const text = String(value || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  let clipped = words.slice(0, maxWords).join(" ").trim();
  clipped = clipped.replace(/[,;:\-–—]+$/, "").trim();
  if (clipped && !/[.!?]$/.test(clipped)) clipped += ".";
  return clipped;
}

function cleanGeneratedDraft(value, mode = "dms") {
  let text = String(value || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
    .replace(/```(?:json|text|markdown)?/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?(?:p|div|span|strong|em|b|i)[^>]*>/gi, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (mode === "dms") {
    // Reasoning models sometimes print their internal plan before the usable DM.
    // Keep only the final message beginning with the greeting when possible.
    const greeting = text.match(/(?:^|\n)(Hi|Hello|Hey)\s+[^\n,]{1,80},/i);
    if (greeting && greeting.index != null) text = text.slice(greeting.index).trim();

    text = text
      .replace(/^(?:analysis|reasoning|thoughts?|plan|workflow|drafting process)\s*[:.-][\s\S]*?(?=\n(?:Hi|Hello|Hey)\s+)/i, "")
      .replace(/^(?:here(?:'s| is)\s+)?(?:the|your|a)?\s*(?:final\s+)?(?:linkedin\s+)?(?:outreach\s+)?(?:message|dm)\s*[:.-]\s*/i, "")
      .replace(/^[-*]\s+(?=\S)/gm, "")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1");
  } else {
    text = text
      .replace(/^(?:here(?:'s| is)\s+(?:the|your)\s+)?(?:final\s+)?(?:linkedin\s+)?(?:comment|reply|response|message|dm)\s*[:.-]\s*/i, "")
      .replace(/^[-*]\s+(?=\S)/gm, "")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1");
  }

  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*["“]|["”]\s*$/g, "")
    .trim();

  return cleanMessage(text);
}

function cleanMessage(value) {
  let text = String(value || "")
    .replace(/^\s*["“]|["”]\s*$/g, "")
    .replace(/^Message\s*\d*\s*[:.-]\s*/i, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  text = text.replace(/\*\*([^*\n]{1,90})\*\*/g, (_match, phrase) => toUnicodeBold(phrase.trim()));
  return ensureReadableParagraphs(text);
}

function ensureReadableParagraphs(text) {
  const normalized = String(text || "").trim();
  if (!normalized || /\n\s*\n/.test(normalized)) return normalized;

  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 3) return lines.join("\n\n");

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [];
  if (sentences.length < 3) return normalized;

  const groups = [];
  groups.push(sentences[0]);
  if (sentences.length === 3) {
    groups.push(sentences[1]);
    groups.push(sentences[2]);
  } else {
    const middle = Math.ceil((sentences.length - 2) / 2);
    groups.push(sentences.slice(1, 1 + middle).join(" "));
    groups.push(sentences.slice(1 + middle).join(" "));
  }
  return groups.filter(Boolean).join("\n\n");
}

function toUnicodeBold(value) {
  return Array.from(String(value || "")).map((char) => {
    const code = char.codePointAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + code - 48);
    return char;
  }).join("");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}


function friendlyError(error) {
  const message = String(error?.message || error || "Unknown error");
  if (/\bE-RPL-\d{2}\b/i.test(message)) return message;
  if (/target IP address space|address space.*loopback|local-network access|loopback network|Permission was denied|CORS/i.test(message)) {
    return "An older IceBreaker file is still making a browser-side Ollama request. Replace every extension file with v1.0.8, reload it in chrome://extensions, close and reopen the side panel, then run Setup-Ollama-for-IceBreaker.ps1 once.";
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return "Could not reach the selected AI provider. For Ollama, make sure ollama serve is running and Chrome-extension access is enabled. For OpenRouter or Groq, check your internet connection and saved API key.";
  }
  if (/401|unauthorized|invalid api key/i.test(message)) return `${message} Open Settings, paste the API key again, and save it.`;
  if (/402|credits|payment required/i.test(message)) return `${message} Choose a free OpenRouter model or add credits to the provider account.`;
  if (/404|model.*not found|does not exist/i.test(message)) return `${message} Refresh the model dropdown and choose an available model.`;
  if (/429|rate limit/i.test(message)) return `${message} Wait briefly or select another model/provider.`;
  if (/no final text|empty response|empty draft|returned an empty|unusably short/i.test(message)) {
    return `${message} IceBreaker tried the OpenRouter free router and current free text-model fallbacks, but none returned usable text.`;
  }
  if (/replaced by newer LinkedIn content|superseded|mode changed/i.test(message)) return "The previous draft was cancelled because newer LinkedIn content was detected. Keep the same post or conversation open and try Refresh once.";
  return message;
}
