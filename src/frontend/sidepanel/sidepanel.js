const sidePanelLifecyclePort = (() => {
  try {
    return chrome.runtime.connect({ name: "ICEBREAKER_SIDEPANEL_LIFECYCLE" });
  } catch (_) {
    return null;
  }
})();

window.addEventListener("pagehide", () => {
  try { sidePanelLifecyclePort?.disconnect(); } catch (_) {}
}, { once: true });

const state = {
  settings: null,
  resumeMeta: null,
  profile: null,
  mode: "dms",
  tone: "professional",
  length: "medium",
  draft: "",
  generating: false,
  generationToken: 0,
  shortcut: "Alt+C",
  regenerateShortcut: "Alt+G",
  models: [],
  loadingModels: false,
  autopilotSettings: null,
  autopilotState: null,
  autopilotResumeProfiles: [],
  autopilotDraftsCount: 0
};

const TONE_OPTIONS_BY_MODE = Object.freeze({
  dms: Object.freeze([
    Object.freeze({ value: "professional", label: "Professional" }),
    Object.freeze({ value: "neutral", label: "Casual" }),
    Object.freeze({ value: "funny", label: "Funny" }),
    Object.freeze({ value: "engaging", label: "Engaging" })
  ]),
  comments: Object.freeze([
    Object.freeze({ value: "professional", label: "Friendly" }),
    Object.freeze({ value: "funny", label: "Funny" }),
    Object.freeze({ value: "neutral", label: "Insightful" }),
    Object.freeze({ value: "engaging", label: "Supportive" })
  ]),
  conversation: Object.freeze([
    Object.freeze({ value: "neutral", label: "Friendly" }),
    Object.freeze({ value: "professional", label: "Professional" }),
    Object.freeze({ value: "engaging", label: "Supportive" }),
    Object.freeze({ value: "funny", label: "Funny" })
  ])
});

const elements = {
  settingsButton: document.getElementById("settingsButton"),
  openResumeSettings: document.getElementById("openResumeSettings"),
  resumeNotice: document.getElementById("resumeNotice"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  providerBadge: document.getElementById("providerBadge"),
  modeControl: document.getElementById("modeControl"),
  providerControl: document.getElementById("providerControl"),
  providerSelect: document.getElementById("providerSelect"),
  userApiProviderButton: document.getElementById("userApiProviderButton"),
  userApiProviderLogo: document.getElementById("userApiProviderLogo"),
  userApiProviderIcon: document.getElementById("userApiProviderIcon"),
  userApiProviderLabel: document.getElementById("userApiProviderLabel"),
  modelSelect: document.getElementById("modelSelect"),
  modelProviderIcon: document.getElementById("modelProviderIcon"),
  reloadModelsButton: document.getElementById("reloadModelsButton"),
  testEngineButton: document.getElementById("testEngineButton"),
  engineStatus: document.getElementById("engineStatus"),
  openProviderSettings: document.getElementById("openProviderSettings"),
  copyOllamaFixButton: document.getElementById("copyOllamaFixButton"),
  shortcutKey: document.getElementById("shortcutKey"),
  regenerateShortcutKey: document.getElementById("regenerateShortcutKey"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyDescription: document.getElementById("emptyDescription"),
  shortcutDescription: document.getElementById("shortcutDescription"),
  captureEmptyLabel: document.getElementById("captureEmptyLabel"),
  emptyState: document.getElementById("emptyState"),
  workspace: document.getElementById("workspace"),
  contextCard: document.querySelector("#workspace > .context-card"),
  contextSubjectLabel: document.getElementById("contextSubjectLabel"),
  profileInitials: document.getElementById("profileInitials"),
  profileName: document.getElementById("profileName"),
  profileHeadline: document.getElementById("profileHeadline"),
  profileMeta: document.getElementById("profileMeta"),
  headlineFact: document.getElementById("headlineFact"),
  headlineLabel: document.getElementById("headlineLabel"),
  companyFact: document.getElementById("companyFact"),
  companyLabel: document.getElementById("companyLabel"),
  contextCompany: document.getElementById("contextCompany"),
  locationFact: document.getElementById("locationFact"),
  locationLabel: document.getElementById("locationLabel"),
  contextLocation: document.getElementById("contextLocation"),
  contextBody: document.getElementById("contextBody"),
  contextSecondaryBody: document.getElementById("contextSecondaryBody"),
  contextToggleButton: document.getElementById("contextToggleButton"),
  contextCount: document.getElementById("contextCount"),
  recentContextLabel: document.getElementById("recentContextLabel"),
  commentReactionCount: document.getElementById("commentReactionCount"),
  commentReplyCount: document.getElementById("commentReplyCount"),
  matchChip: document.getElementById("matchChip"),
  matchPanel: document.getElementById("matchPanel"),
  matchScore: document.getElementById("matchScore"),
  matchBar: document.getElementById("matchBar"),
  matchReasons: document.getElementById("matchReasons"),
  styleControls: document.querySelector(".ib-style-controls"),
  toneControl: document.getElementById("toneControl"),
  lengthControl: document.getElementById("lengthControl"),
  actionDock: document.querySelector(".action-dock"),
  refreshButton: document.getElementById("refreshButton"),
  draftEyebrow: document.getElementById("draftEyebrow"),
  draftTitle: document.getElementById("draftTitle"),
  draftLoading: document.getElementById("draftLoading"),
  messageEditor: document.getElementById("messageEditor"),
  draftCharCount: document.getElementById("draftCharCount"),
  lowMatchActions: document.getElementById("lowMatchActions"),
  pinnedDraft: document.getElementById("pinnedDraft"),
  copyButton: document.getElementById("copyButton"),
  copyButtonLabel: document.getElementById("copyButtonLabel"),
  stopRefreshButton: document.getElementById("stopRefreshButton"),
  stopRefreshButtonLabel: document.getElementById("stopRefreshButtonLabel"),
  captureButtonLabel: document.getElementById("captureButtonLabel"),
  matchPanelLabel: document.getElementById("matchPanelLabel"),
  captureCurrentButton: document.getElementById("captureCurrentButton"),
  captureCurrentButtonEmpty: document.getElementById("captureCurrentButtonEmpty"),
  autopilotCard: document.getElementById("autopilotCard"),
  autopilotStatus: document.getElementById("autopilotStatus"),
  autopilotSupporting: document.getElementById("autopilotSupporting"),
  autopilotProgress: document.getElementById("autopilotProgress"),
  autopilotCurrentProfile: document.getElementById("autopilotCurrentProfile"),
  autopilotCurrentTitle: document.getElementById("autopilotCurrentTitle"),
  autopilotCurrentAction: document.getElementById("autopilotCurrentAction"),
  autopilotErrorCode: document.getElementById("autopilotErrorCode"),
  autopilotProgressBar: document.getElementById("autopilotProgressBar"),
  autopilotDrafts: document.getElementById("autopilotDrafts"),
  autopilotChecked: document.getElementById("autopilotChecked"),
  autopilotMatched: document.getElementById("autopilotMatched"),
  autopilotSkipped: document.getElementById("autopilotSkipped"),
  autopilotErrors: document.getElementById("autopilotErrors"),
  autopilotStartButton: document.getElementById("autopilotStartButton"),
  autopilotPauseButton: document.getElementById("autopilotPauseButton"),
  autopilotStopButton: document.getElementById("autopilotStopButton"),
  autopilotSettingsButton: document.getElementById("autopilotSettingsButton"),
};

const MAX_CONVERSATION_CONTEXT_MESSAGES = 15;

sidePanelLifecyclePort?.onMessage.addListener((message) => {
  if (message?.type !== "ICEBREAKER_GET_CURRENT_DRAFT" || !message.requestId) return;
  const text = String(elements.messageEditor?.value || state.draft || "").trim();
  try {
    sidePanelLifecyclePort.postMessage({
      type: "ICEBREAKER_CURRENT_DRAFT",
      requestId: message.requestId,
      draft: {
        text,
        clipboardText: text ? formatClipboardText(text) : "",
        mode: state.mode,
        profile: state.profile ? { ...state.profile, mode: state.mode } : null,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (_) {}
});

initialize();

async function initialize() {
  bindEvents();
  await loadSavedState();
  await loadAutopilotState();
  await Promise.allSettled([loadShortcut(), loadProviderModels({ silent: true })]);
  await Promise.allSettled([loadActiveProfile(), loadGenerationState()]);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  chrome.storage.onChanged.addListener(handleStorageChange);
}

function bindEvents() {
  elements.settingsButton.addEventListener("click", openSettings);
  elements.openResumeSettings.addEventListener("click", openSettings);
  elements.refreshButton.addEventListener("click", () => generateMessage({ source: "refresh" }));
  elements.copyButton.addEventListener("click", copyMessage);
  elements.stopRefreshButton.addEventListener("click", stopAndRefresh);
  elements.captureCurrentButton.addEventListener("click", captureCurrentProfile);
  elements.captureCurrentButtonEmpty.addEventListener("click", captureCurrentProfile);
  elements.contextToggleButton?.addEventListener("click", toggleContextExpansion);
  elements.autopilotStartButton.addEventListener("click", startAutopilot);
  elements.autopilotPauseButton.addEventListener("click", toggleAutopilotPause);
  elements.autopilotStopButton.addEventListener("click", stopAutopilot);
  elements.autopilotSettingsButton.addEventListener("click", openAutopilotSettings);

  elements.modeControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button || state.generating || isAutopilotActive()) return;
    void changeMode(button.dataset.value);
  });


  elements.providerControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-provider]");
    if (!button || state.generating || state.loadingModels || isAutopilotActive()) return;
    const useManual = button.dataset.provider === "userapi";
    const provider = useManual ? detectedManualProvider(state.settings) : validProvider(button.dataset.provider);
    if (!provider) {
      setEngineStatus("error", "Add a valid Groq or OpenRouter key in Settings first.");
      return;
    }
    const apiAccessMode = useManual ? "manual" : "official";
    if (provider === elements.providerSelect.value && normalizeApiAccessMode(state.settings?.apiAccessMode) === apiAccessMode) return;
    elements.providerSelect.value = provider;
    updateProviderControl(provider, apiAccessMode);
    void changeProvider(apiAccessMode);
  });

  elements.providerSelect.addEventListener("change", changeProvider);
  elements.modelSelect.addEventListener("change", changeModel);
  elements.reloadModelsButton.addEventListener("click", () => loadProviderModels({ silent: false }));
  elements.testEngineButton.addEventListener("click", testSelectedEngine);
  elements.openProviderSettings.addEventListener("click", openSettings);
  elements.copyOllamaFixButton.addEventListener("click", copyOllamaFix);

  elements.toneControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button || state.generating || isAutopilotActive()) return;
    state.tone = button.dataset.value;
    updateSegmentedControl(elements.toneControl, state.tone);
    void saveDefaults();
    setStatus("ready", "Vibe updated. Use Refresh for a new version with this vibe.");
  });

  elements.lengthControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button || state.generating || isAutopilotActive()) return;
    state.length = button.dataset.value;
    updateSegmentedControl(elements.lengthControl, state.length);
    void saveDefaults();
    setStatus("ready", "Length updated. Use Refresh for a new version with this length.");
  });

  elements.messageEditor.addEventListener("input", () => {
    state.draft = elements.messageEditor.value;
    updateDraftCharCount();
    updateCopyState();
    scheduleDraftPersistence();
  });
}

async function loadSavedState() {
  const previousProvider = validProvider(state.settings?.provider);
  const { settings, resumeMeta, resumeText } = await chrome.storage.local.get(["settings", "resumeMeta", "resumeText"]);
  state.settings = settings || {};
  state.resumeMeta = resumeText ? (resumeMeta || { fileName: "Saved résumé" }) : null;
  state.mode = normalizeMode(state.settings.generationMode);
  state.tone = normalizeTone(state.settings.defaultTone);
  state.length = state.settings.defaultLength || "medium";

  updateSegmentedControl(elements.modeControl, state.mode);
  updateSegmentedControl(elements.toneControl, state.tone);
  updateSegmentedControl(elements.lengthControl, state.length);
  elements.providerBadge.textContent = providerLabel(state.settings);
  elements.providerBadge.title = elements.providerBadge.textContent;
  elements.providerSelect.value = validProvider(state.settings.provider);
  updateProviderControl(elements.providerSelect.value);
  if (!elements.modelSelect.options.length || previousProvider !== validProvider(state.settings.provider)) renderStoredModel();
  updateEngineControls();
  renderModeUI();
  elements.resumeNotice.classList.toggle("hidden", state.mode !== "dms" || Boolean(state.resumeMeta));
}


async function loadAutopilotState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_AUTOPILOT_STATE" });
    if (!response?.ok) throw new Error(response?.error || "Could not load Autopilot.");
    state.autopilotSettings = response.settings || {};
    state.autopilotState = response.state || null;
    state.autopilotResumeProfiles = response.resumeProfiles || [];
    state.autopilotDraftsCount = Number(response.draftsCount || 0);
    renderAutopilot();
  } catch (error) {
    state.autopilotSettings = state.autopilotSettings || {};
    state.autopilotState = state.autopilotState || { status: "stopped", progress: {} };
    renderAutopilot();
  }
}

function isAutopilotActive() {
  return ["starting", "running", "paused"].includes(state.autopilotState?.status);
}

async function openAutopilotSettings() {
  const url = chrome.runtime.getURL("src/frontend/options/index.html#autopilot");
  await chrome.tabs.create({ url });
}

async function startAutopilot() {
  if (isAutopilotActive()) return;
  setStatus("busy", "Starting Autopilot…");
  elements.autopilotStartButton.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "START_AUTOPILOT" });
    if (!response?.ok) throw new Error(response?.error || "Autopilot could not start.");
    state.autopilotState = response.state;
    state.mode = "dms";
    updateSegmentedControl(elements.modeControl, state.mode);
    renderAutopilot();
    setStatus("ready", "Connections Autopilot is scanning 1st-degree contacts, opening the correct same-page composer, pasting the DM, and attaching your saved résumé.");
  } catch (error) {
    setStatus("error", error.message || "Autopilot could not start. Open Drafts & Settings to finish setup.");
  } finally {
    elements.autopilotStartButton.disabled = false;
  }
}

async function toggleAutopilotPause() {
  const paused = state.autopilotState?.status === "paused";
  const response = await chrome.runtime.sendMessage({ type: paused ? "RESUME_AUTOPILOT" : "PAUSE_AUTOPILOT" });
  if (!response?.ok) {
    setStatus("error", response?.error || "Autopilot control failed.");
    return;
  }
  state.autopilotState = response.state;
  renderAutopilot();
}

async function stopAutopilot() {
  if (!isAutopilotActive()) return;
  const response = await chrome.runtime.sendMessage({ type: "STOP_AUTOPILOT" });
  if (!response?.ok) {
    setStatus("error", response?.error || "Autopilot could not be stopped.");
    return;
  }
  state.autopilotState = response.state;
  renderAutopilot();
  setStatus("", "Autopilot stopped. Drafts already placed in LinkedIn remain unsent and available for review.");
}

function renderAutopilot() {
  const run = state.autopilotState || { status: "stopped", progress: {}, current: {} };
  const status = run.status || "stopped";
  const active = isAutopilotActive();
  const progress = run.progress || {};
  const limit = Number(state.autopilotSettings?.draftLimit || 10);
  const prepared = Number(progress.draftsPrepared || 0);
  const statusLabels = {
    stopped: "Stopped",
    starting: "Starting",
    running: "Running",
    paused: "Paused",
    completed: "Completed",
    "stopped-by-user": "Stopped",
    error: "Error"
  };
  elements.autopilotStatus.textContent = statusLabels[status] || "Stopped";
  elements.autopilotStatus.title = `Autopilot: ${statusLabels[status] || "Stopped"}`;
  elements.autopilotStatus.setAttribute("aria-label", `Autopilot status: ${statusLabels[status] || "Stopped"}`);
  elements.autopilotStatus.className = `autopilot-status ${status === "starting" ? "running" : status}`;
  elements.autopilotProgress.classList.toggle("hidden", !run.runId);
  elements.autopilotCurrentProfile.textContent = run.current?.profileName || (status === "completed" ? "Run complete" : "Waiting for a profile");
  elements.autopilotCurrentTitle.textContent = run.current?.detectedTitle || "";
  elements.autopilotCurrentAction.textContent = run.current?.action || run.lastError || "Ready";
  elements.autopilotDrafts.textContent = prepared;
  elements.autopilotChecked.textContent = Number(progress.checked || 0);
  elements.autopilotMatched.textContent = Number(progress.matched || 0);
  elements.autopilotSkipped.textContent = Number(progress.skipped || 0);
  elements.autopilotErrors.textContent = Number(progress.errors || 0);
  elements.autopilotProgressBar.style.width = `${Math.max(0, Math.min(100, limit ? (prepared / limit) * 100 : 0))}%`;
  elements.autopilotStartButton.classList.toggle("hidden", active);
  elements.autopilotPauseButton.classList.toggle("hidden", !active);
  elements.autopilotStopButton.classList.toggle("hidden", !active);
  elements.autopilotSettingsButton.classList.remove("hidden");
  elements.autopilotPauseButton.textContent = status === "paused" ? "Resume" : "Pause";
  elements.autopilotSupporting.textContent = status === "completed"
    ? (prepared > 0
      ? `${prepared} unsent LinkedIn draft${prepared === 1 ? "" : "s"} prepared for review.`
      : (run.lastDiagnostic || `No drafts were prepared. Open Drafts & Settings → Diagnostics to see why each card was skipped.`))
    : status === "error" || status === "paused" && run.lastError
      ? (run.lastError || "Autopilot paused for safety.")
      : active
        ? "IceBreaker is scanning from your selected connection and moving forward as soon as each résumé-backed draft is verified."
        : `${state.autopilotDraftsCount || 0} saved draft record${Number(state.autopilotDraftsCount || 0) === 1 ? "" : "s"}. Configure the target role and AI Resume in Drafts & Settings.`;
  document.body.classList.toggle("autopilot-running", active);
  elements.stopRefreshButtonLabel.textContent = active ? "Stop Autopilot" : "Reset";
  elements.stopRefreshButton.title = active ? "Stop Autopilot immediately" : "Stop current work and reset the draft";
  elements.autopilotSettingsButton.textContent = "Drafts & Settings";
  if (elements.autopilotErrorCode) {
    const code = run.lastErrorCode || run.lastDiagnosticCode || "";
    elements.autopilotErrorCode.textContent = code;
    elements.autopilotErrorCode.classList.toggle("hidden", !code);
  }
}

function normalizeMode(mode) {
  return ["dms", "comments", "conversation"].includes(mode) ? mode : "dms";
}

function normalizeTone(tone) {
  return ["professional", "neutral", "funny", "engaging"].includes(tone) ? tone : "professional";
}

function toneOptions(mode = state.mode) {
  return TONE_OPTIONS_BY_MODE[normalizeMode(mode)] || TONE_OPTIONS_BY_MODE.dms;
}

function selectedToneLabel(mode = state.mode, tone = state.tone) {
  return toneOptions(mode).find((option) => option.value === tone)?.label || toneOptions(mode)[0].label;
}

function configureToneControl(mode = state.mode) {
  const options = toneOptions(mode);
  const buttons = [...elements.toneControl.querySelectorAll("button[data-value]")];
  buttons.forEach((button) => {
    const index = options.findIndex((option) => option.value === button.dataset.value);
    const option = index >= 0 ? options[index] : null;
    button.style.order = String(index >= 0 ? index + 1 : options.length + 1);
    button.dataset.displayLabel = option?.label || button.textContent.trim();
    button.setAttribute("aria-label", option?.label || button.textContent.trim());
    button.title = option?.label || button.textContent.trim();
  });
  updateSegmentedControl(elements.toneControl, state.tone);
}

async function changeMode(mode) {
  const nextMode = normalizeMode(mode);
  if (nextMode === state.mode) return;
  state.mode = nextMode;
  updateSegmentedControl(elements.modeControl, state.mode);
  state.profile = null;
  clearGeneration();
  renderModeUI();
  renderProfile();
  const response = await chrome.runtime.sendMessage({ type: "UPDATE_MODE", mode: nextMode });
  if (response?.ok) state.settings = response.settings;
  else {
    state.settings = { ...(state.settings || {}), generationMode: nextMode, schemaVersion: 23 };
    await chrome.storage.local.set({ settings: state.settings });
    await chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED" }).catch(() => {});
  }
  setStatus("", modeInstruction(nextMode));
}

function modeInstruction(mode = state.mode) {
  if (mode === "comments") return "Hover over a LinkedIn post.";
  if (mode === "conversation") return "Open LinkedIn Messaging and hover over a conversation row or the visible thread.";
  return "Hover over a LinkedIn profile or a commenter to create a private DM.";
}

function modeLabels(mode = state.mode) {
  if (mode === "comments") return {
    title: "Hover a LinkedIn post",
    description: "Point your cursor at a post or comment to instantly draft a relevant response.",
    draftEyebrow: "Post engagement",
    draftTitle: "AI Draft",
    copy: "Copy Comment",
    capture: "Read current page",
    placeholder: "Your post-aware comment will appear automatically."
  };
  if (mode === "conversation") return {
    title: "Hover a LinkedIn conversation",
    description: "Open a conversation and IceBreaker will read the visible thread to draft a contextual reply.",
    draftEyebrow: "Inbox assistant",
    draftTitle: "AI Suggested Reply",
    copy: "Copy Reply",
    capture: "Read current page",
    placeholder: "Your context-aware reply will appear automatically."
  };
  return {
    title: "Hover a LinkedIn profile",
    description: "Point your cursor at any name in your feed or inbox to instantly draft a personalized icebreaker.",
    draftEyebrow: "Personalized outreach",
    draftTitle: "Message",
    copy: "Copy Message",
    capture: "Read current page",
    placeholder: "Your personalized, spaced message will appear automatically."
  };
}

function renderModeUI() {
  document.body.dataset.mode = state.mode;
  configureToneControl(state.mode);
  placeStyleControlsForMode();
  const labels = modeLabels();
  elements.emptyTitle.textContent = labels.title;
  elements.emptyDescription.textContent = labels.description;
  elements.shortcutDescription.textContent = "COPY";
  elements.captureEmptyLabel.textContent = labels.capture;
  elements.captureButtonLabel.textContent = labels.capture;
  elements.draftEyebrow.textContent = state.mode === "comments" ? "Post-aware comment · editable" : state.mode === "conversation" ? "Context-aware reply · editable" : "Personalised DM · editable";
  elements.draftTitle.textContent = labels.draftTitle;
  elements.copyButtonLabel.textContent = labels.copy;
  elements.messageEditor.placeholder = labels.placeholder;
  elements.resumeNotice.classList.toggle("hidden", state.mode !== "dms" || Boolean(state.resumeMeta));
  elements.matchPanel.classList.toggle("hidden", state.mode !== "dms" || !state.draft);
}

function placeStyleControlsForMode() {
  const controls = elements.styleControls;
  if (!controls || !elements.pinnedDraft || !elements.draftLoading) return;
  if (state.mode === "conversation") {
    if (elements.actionDock?.nextElementSibling !== controls) elements.actionDock?.after(controls);
    return;
  }
  if (controls.parentElement !== elements.pinnedDraft) {
    elements.pinnedDraft.insertBefore(controls, elements.draftLoading);
  }
}

function normalizeApiAccessMode(value) {
  return value === "manual" ? "manual" : "official";
}

function sanitizeManualKey(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^(?:(?:OPENROUTER|GROQ)_API_KEY(?:_[12])?|MANUAL_API_KEY)\s*=\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/\s+/g, "")
    .trim();
}

function detectedManualProvider(settings = state.settings) {
  const stored = String(settings?.manualApiProvider || "").trim();
  if (["groq", "openrouter"].includes(stored)) return stored;
  const key = sanitizeManualKey(settings?.manualApiKey || settings?.groqApiKey || settings?.openRouterApiKey || "");
  if (/^gsk_/i.test(key)) return "groq";
  if (/^sk-or-/i.test(key)) return "openrouter";
  return "";
}

function hasCloudApi(settings, provider) {
  if (normalizeApiAccessMode(settings?.apiAccessMode) === "official") return true;
  return detectedManualProvider(settings) === provider;
}

function renderUserApiControl() {
  const provider = detectedManualProvider(state.settings);
  elements.userApiProviderButton.classList.remove("hidden");

  if (!provider) {
    elements.userApiProviderIcon.src = "../../../assets/providers/provider-groq.svg";
    elements.userApiProviderLabel.textContent = "My API";
    elements.userApiProviderButton.title = "Add or use your own Groq/OpenRouter API key";
    elements.userApiProviderLogo.classList.remove("user-openrouter");
    return;
  }

  const openrouter = provider === "openrouter";
  elements.userApiProviderIcon.src = openrouter ? "../../../assets/providers/provider-openrouter.png" : "../../../assets/providers/provider-groq.svg";
  elements.userApiProviderLabel.textContent = "My API";
  elements.userApiProviderButton.title = openrouter ? "Use your saved OpenRouter API key" : "Use your saved Groq API key";
  elements.userApiProviderLogo.classList.toggle("user-openrouter", openrouter);
}

function validProvider(provider) {
  return ["ollama", "openrouter", "groq"].includes(provider) ? provider : "ollama";
}

function modelSettingKey(provider) {
  if (provider === "openrouter") return "openRouterModel";
  if (provider === "groq") return "groqModel";
  return "ollamaModel";
}

function selectedSavedModel(provider = elements.providerSelect.value) {
  return String(state.settings?.[modelSettingKey(provider)] || "").trim();
}

function renderStoredModel() {
  const provider = validProvider(elements.providerSelect.value || state.settings?.provider);
  const model = selectedSavedModel(provider);
  elements.modelSelect.innerHTML = "";
  const option = document.createElement("option");
  option.value = model;
  option.textContent = model || "Load available models";
  elements.modelSelect.appendChild(option);
  elements.modelSelect.value = model;
}

function updateEngineControls() {
  const provider = validProvider(elements.providerSelect.value);
  renderUserApiControl();
  updateProviderControl(provider, normalizeApiAccessMode(state.settings?.apiAccessMode));
  elements.copyOllamaFixButton.classList.toggle("hidden", provider !== "ollama");
  elements.providerBadge.textContent = providerLabel(state.settings || { provider });
  elements.providerBadge.title = elements.providerBadge.textContent;
}

async function changeProvider(apiAccessMode = "official") {
  if (state.generating) return;
  const provider = validProvider(elements.providerSelect.value);
  const response = await chrome.runtime.sendMessage({
    type: "UPDATE_ENGINE_SELECTION",
    provider,
    model: selectedSavedModel(provider),
    apiAccessMode: provider === "ollama" ? normalizeApiAccessMode(state.settings?.apiAccessMode) : normalizeApiAccessMode(apiAccessMode)
  });
  if (!response?.ok) {
    setEngineStatus("error", response?.error || "Could not save the provider.");
    return;
  }
  state.settings = response.settings;
  updateEngineControls();
  renderStoredModel();
  await loadProviderModels({ silent: false });
  setStatus("ready", `${providerName(provider)} selected. Hover again or use Refresh to generate with it.`);
}

async function changeModel() {
  if (state.generating) return;
  const provider = validProvider(elements.providerSelect.value);
  const model = elements.modelSelect.value.trim();
  if (!model) return;
  const response = await chrome.runtime.sendMessage({ type: "UPDATE_ENGINE_SELECTION", provider, model, apiAccessMode: normalizeApiAccessMode(state.settings?.apiAccessMode) });
  if (!response?.ok) {
    setEngineStatus("error", response?.error || "Could not save the model.");
    return;
  }
  state.settings = response.settings;
  updateEngineControls();
  setEngineStatus("success", `${model} selected for ${providerName(provider)}.`);
  setStatus("ready", "Model updated. Hover again or use Refresh for a new draft.");
}

function normalizeOllamaEndpoint(value) {
  const fallback = "http://127.0.0.1:11434";
  const raw = String(value || fallback).trim().replace(/\/+$/, "");
  try {
    const url = new URL(raw || fallback);
    if (["localhost", "0.0.0.0", "[::1]", "::1"].includes(url.hostname)) url.hostname = "127.0.0.1";
    if (!url.port) url.port = "11434";
    return url.origin;
  } catch (_) {
    return fallback;
  }
}

async function loadProviderModels({ silent = false } = {}) {
  if (state.loadingModels) return;
  const provider = validProvider(elements.providerSelect.value || state.settings?.provider);
  state.loadingModels = true;
  elements.modelSelect.disabled = true;
  elements.providerSelect.disabled = true;
  setProviderButtonsDisabled(true);
  elements.reloadModelsButton.disabled = true;
  elements.reloadModelsButton.classList.add("loading");
  if (!silent) setEngineStatus("", `Loading ${providerName(provider)} models…`);

  try {
    const response = await chrome.runtime.sendMessage({ type: "LIST_PROVIDER_MODELS", provider });
    if (!response?.ok) throw new Error(response?.error || `Could not load ${providerName(provider)} models.`);

    const models = normalizeProviderModels(response.models, provider);
    state.models = models;
    const saved = selectedSavedModel(provider);
    const selected = chooseProviderModel(models, saved);
    renderModelOptions(models, selected, provider);

    if (selected && selected !== saved) {
      const savedResponse = await chrome.runtime.sendMessage({ type: "UPDATE_ENGINE_SELECTION", provider, model: selected, apiAccessMode: normalizeApiAccessMode(state.settings?.apiAccessMode) });
      if (savedResponse?.ok) state.settings = savedResponse.settings;
    }

    const keyMissing = provider === "openrouter" || provider === "groq"
      ? !hasCloudApi(state.settings, provider)
      : false;

    if (!models.length) {
      setEngineStatus("error", provider === "ollama" ? "No installed Ollama models found. Run: ollama pull qwen3:8b" : "No available models were returned.");
    } else if (keyMissing) {
      setEngineStatus("", `${models.length} models loaded. Add a matching manual ${providerName(provider)} API key in Settings or switch to Official API.`);
    } else {
      setEngineStatus("success", `${models.length} ${providerName(provider)} model${models.length === 1 ? "" : "s"} available.`);
    }
    updateEngineControls();
  } catch (error) {
    state.models = [];
    renderStoredModel();
    setEngineStatus("error", error.message || `Could not load ${providerName(provider)} models.`);
  } finally {
    state.loadingModels = false;
    elements.modelSelect.disabled = false;
    elements.providerSelect.disabled = false;
    setProviderButtonsDisabled(false);
    elements.reloadModelsButton.disabled = false;
    elements.reloadModelsButton.classList.remove("loading");
  }
}

function normalizeProviderModels(models, provider) {
  if (!Array.isArray(models)) return [];
  return models.map((item) => {
    const id = String(item?.id || item?.name || item?.model || "").trim();
    if (!id) return null;
    const displayName = String(item?.name || id).trim();
    let detail = String(item?.detail || "").trim();
    if (provider === "ollama" && !detail) {
      detail = [item?.parameterSize, item?.quantization, item?.family].filter(Boolean).join(" · ");
    }
    return { id, name: displayName, detail, free: Boolean(item?.free) };
  }).filter(Boolean);
}

function chooseProviderModel(models, preferred) {
  if (!models.length) return "";
  const exact = models.find((model) => model.id === preferred);
  if (exact) return exact.id;
  const free = models.find((model) => model.free);
  return free?.id || models[0].id;
}

function renderModelOptions(models, selected, provider) {
  elements.modelSelect.innerHTML = "";
  if (!models.length) {
    renderStoredModel();
    return;
  }

  for (const model of models) {
    const option = document.createElement("option");
    option.value = model.id;
    const conciseName = model.name !== model.id ? `${model.name} — ${model.id}` : model.id;
    option.textContent = model.detail ? `${conciseName} · ${model.detail}` : conciseName;
    option.title = option.textContent;
    option.selected = model.id === selected;
    elements.modelSelect.appendChild(option);
  }
  elements.modelSelect.value = selected;
}

async function testSelectedEngine() {
  if (state.generating) return;
  elements.testEngineButton.disabled = true;
  setEngineStatus("", `Testing ${providerName(elements.providerSelect.value)}…`);
  try {
    await changeModel();
    const response = await chrome.runtime.sendMessage({ type: "TEST_PROVIDER" });
    if (!response?.ok) throw new Error(response?.error || "Connection test failed.");
    setEngineStatus("success", `${providerName(elements.providerSelect.value)} connected successfully.`);
  } catch (error) {
    setEngineStatus("error", error.message || "Connection test failed.");
  } finally {
    elements.testEngineButton.disabled = false;
  }
}

async function copyOllamaFix() {
  const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS','chrome-extension://*','User'); [Environment]::SetEnvironmentVariable('OLLAMA_HOST','127.0.0.1:11434','User'); [Environment]::SetEnvironmentVariable('OLLAMA_KEEP_ALIVE','-1','User'); Get-Process | Where-Object { $_.ProcessName -like 'ollama*' } | Stop-Process -Force -ErrorAction SilentlyContinue; $env:OLLAMA_ORIGINS='chrome-extension://*'; $env:OLLAMA_HOST='127.0.0.1:11434'; $env:OLLAMA_KEEP_ALIVE='-1'; Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden"`;
  try {
    await navigator.clipboard.writeText(command);
  } catch (_) {
    const area = document.createElement("textarea");
    area.value = command;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  setEngineStatus("success", "Ollama setup copied. Paste it into PowerShell once, then reload models.");
}

function setEngineStatus(kind, text) {
  const detail = String(text || "").trim();
  elements.engineStatus.classList.remove("success", "error", "busy");
  if (kind) elements.engineStatus.classList.add(kind);
  elements.engineStatus.dataset.kind = kind || "";
  elements.engineStatus.textContent = kind === "error" ? errorCode(detail) : compactEngineStatus(kind, detail);
  elements.engineStatus.title = detail;
  elements.engineStatus.setAttribute("aria-label", detail || elements.engineStatus.textContent);
  const statusKind = kind === "success" ? "ready" : kind || (/loading|testing|connecting/i.test(detail) ? "busy" : "");
  setStatus(statusKind, detail);
}

function compactEngineStatus(kind, detail) {
  if (kind === "success") return "CONNECTED";
  if (/loading/i.test(detail)) return "LOADING";
  if (/models? (?:available|loaded)/i.test(detail)) {
    const count = detail.match(/\d+/)?.[0];
    return count ? `${count} MODELS` : "MODELS READY";
  }
  if (/testing/i.test(detail)) return "TESTING";
  return detail && detail.length <= 24 ? detail.toUpperCase() : "READY";
}

function updateProviderControl(provider, apiAccessMode = normalizeApiAccessMode(state.settings?.apiAccessMode)) {
  const selected = validProvider(provider);
  const manualProvider = detectedManualProvider(state.settings);
  [...elements.providerControl.querySelectorAll("button[data-provider]")].forEach((button) => {
    const isUserApi = button.dataset.provider === "userapi";
    const active = isUserApi
      ? apiAccessMode === "manual" && manualProvider === selected
      : button.dataset.provider === selected && (selected === "ollama" || apiAccessMode !== "manual");
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  document.body.dataset.provider = selected;
  if (elements.modelProviderIcon) {
    const icons = {
      groq: "../../../assets/providers/provider-groq.svg",
      ollama: "../../../assets/providers/provider-ollama.png",
      openrouter: "../../../assets/providers/provider-openrouter.png"
    };
    elements.modelProviderIcon.src = icons[selected];
    elements.modelProviderIcon.parentElement?.classList.toggle("openrouter", selected === "openrouter");
  }
}

function setProviderButtonsDisabled(disabled) {
  [...elements.providerControl.querySelectorAll("button[data-provider]")].forEach((button) => {
    button.disabled = Boolean(disabled);
  });
}

function providerName(provider) {
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "groq") return "Groq";
  return "Ollama";
}

async function loadShortcut() {
  try {
    const commands = await chrome.commands.getAll();
    const copyCommand = commands.find((item) => item.name === "force-generate-and-copy");
    const regenerateCommand = commands.find((item) => item.name === "regenerate-current-text");
    state.shortcut = copyCommand?.shortcut || "Alt+C";
    state.regenerateShortcut = regenerateCommand?.shortcut || "Alt+G";
  } catch (_) {
    state.shortcut = "Alt+C";
    state.regenerateShortcut = "Alt+G";
  }
  const displayShortcut = (value) => String(value || "").replace(/\s*\+\s*/g, " + ");
  elements.shortcutKey.textContent = displayShortcut(state.shortcut);
  if (elements.regenerateShortcutKey) elements.regenerateShortcutKey.textContent = displayShortcut(state.regenerateShortcut);
}

async function loadActiveProfile() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_PROFILE" });
    if (response?.ok && response.profile && normalizeMode(response.profile.mode) === state.mode) acceptProfile(response.profile, { preserveDraft: false });
  } catch (_) {}
}

async function loadGenerationState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_GENERATION_STATE" });
    const generation = response?.generation;
    if (!generation || generation.source === "autopilot" || normalizeMode(generation.profile?.mode) !== state.mode) return;

    if (generation.status === "busy" && generation.profile) {
      acceptProfile(generation.profile, { preserveDraft: false });
      state.generating = true;
      setLoading(true);
      setStatus("busy", state.mode === "conversation" ? "Reading the thread and generating a contextual reply…" : state.mode === "comments" ? "Reading the post and generating a relevant comment…" : "Generating a personalized message automatically…");
      return;
    }

    if (generation.status === "success" && generation.profile && generation.result) {
      acceptProfile(generation.profile, { preserveDraft: true });
      applyGenerationResult(generation.result);
      return;
    }

    if (generation.status === "error" && generation.error) {
      if (generation.profile) acceptProfile(generation.profile, { preserveDraft: false });
      setStatus("error", generation.error);
    }
  } catch (_) {}
}

function handleRuntimeMessage(message) {
  if (message?.type === "AUTOPILOT_STATE_CHANGED" && message.state) {
    state.autopilotState = message.state;
    renderAutopilot();
    return;
  }
  if (message?.type === "AUTOPILOT_SETTINGS_UPDATED" && message.settings) {
    state.autopilotSettings = message.settings;
    renderAutopilot();
    return;
  }
  if (message?.source === "autopilot") return;
  if (message?.type === "PROFILE_CAPTURED" && message.profile) {
    if (normalizeMode(message.profile.mode) !== state.mode) return;
    const changed = profileSignature(state.profile) !== profileSignature(message.profile);
    acceptProfile(message.profile, { preserveDraft: !changed });
    setStatus("busy", `Detected ${message.profile.name}. Automatic generation is starting…`);
    return;
  }

  if (["GENERATION_STARTED", "SHORTCUT_GENERATION_STARTED"].includes(message?.type) && message.profile) {
    if (normalizeMode(message.profile.mode) !== state.mode) return;
    acceptProfile(message.profile, { preserveDraft: false });
    state.generating = true;
    state.generationToken += 1;
    setLoading(true);
    setStatus("busy", state.mode === "conversation" ? "Conversation captured. Preparing your reply…" : state.mode === "comments" ? "Post captured. Preparing your comment…" : "Preparing the selected model…");
    return;
  }

  if (message?.type === "GENERATION_PROGRESS" && message.profile) {
    if (normalizeMode(message.profile.mode) !== state.mode) return;
    if (state.profile && profileSignature(state.profile) !== profileSignature(message.profile)) return;
    state.generating = true;
    setLoading(true);
    setStatus("busy", message.detail || "Generating the message…");
    return;
  }

  if (["GENERATION_COMPLETE", "SHORTCUT_GENERATION_COMPLETE"].includes(message?.type) && message.profile && message.result) {
    if (normalizeMode(message.profile.mode) !== state.mode) return;
    if (state.profile && profileSignature(state.profile) !== profileSignature(message.profile)) return;
    acceptProfile(message.profile, { preserveDraft: true });
    state.generating = false;
    setLoading(false);
    applyGenerationResult(message.result);
    return;
  }

  if (message?.type === "GENERATION_CANCELLED") {
    state.generationToken += 1;
    state.generating = false;
    setLoading(false);
    setStatus("", "Working stopped. Adjust the controls and regenerate when ready.");
    return;
  }

  if (["GENERATION_ERROR", "SHORTCUT_GENERATION_ERROR"].includes(message?.type)) {
    if (message.profile && state.profile && profileSignature(state.profile) !== profileSignature(message.profile)) return;
    state.generating = false;
    setLoading(false);
    setStatus("error", message.error || "Message generation failed.");
    return;
  }

  if (message?.type === "MESSAGE_COPIED") {
    if (message.profile && (!state.profile || profileSignature(state.profile) === profileSignature(message.profile))) {
      if (message.result) applyGenerationResult(message.result);
      setStatus("ready", `${state.mode === "comments" ? "Comment" : state.mode === "conversation" ? "Reply" : "Message"} copied to your clipboard.`);
      flashCopyLabel();
    }
    return;
  }

  if (message?.type === "OLLAMA_MODEL_SELECTED" && message.model) {
    if (state.settings) state.settings.ollamaModel = message.model;
    elements.providerBadge.textContent = providerLabel(state.settings || {});
    elements.providerBadge.title = elements.providerBadge.textContent;
    if (elements.providerSelect.value === "ollama") renderStoredModel();
  }
}

async function handleStorageChange(changes, areaName) {
  if (areaName !== "local") return;
  if (changes.settings || changes.resumeMeta || changes.resumeText) await loadSavedState();
  if (changes.autopilotSettings || changes.autopilotState || changes.autopilotResumeProfiles || changes.autopilotDrafts) await loadAutopilotState();
}

function acceptProfile(profile, { preserveDraft }) {
  const previousSignature = profileSignature(state.profile);
  const nextSignature = profileSignature(profile);
  const changed = Boolean(previousSignature && previousSignature !== nextSignature);

  if (state.generating && changed) {
    state.generationToken += 1;
    state.generating = false;
    setLoading(false);
  }

  state.profile = { ...profile, mode: normalizeMode(profile.mode || state.mode) };
  renderProfile();
  if (changed && !preserveDraft) clearGeneration();
}

function renderProfile() {
  const profile = state.profile;
  const hasContext = Boolean(profile?.name || profile?.description || profile?.rawText);
  elements.emptyState.classList.toggle("hidden", hasContext);
  elements.workspace.classList.toggle("hidden", !hasContext);
  elements.pinnedDraft.classList.toggle("hidden", !hasContext);
  elements.styleControls?.classList.toggle("hidden", !hasContext);
  if (!hasContext) return;

  const mode = normalizeMode(profile.mode || state.mode);
  const displayName = resolveContextDisplayName(profile, mode);
  const identityUrl = mode === "comments"
    ? (profile.parentPostProfileUrl || profile.profileUrl || profile.authorProfileUrl || profile.url || "#")
    : (profile.profileUrl || profile.authorProfileUrl || profile.url || "#");
  const role = mode === "conversation"
    ? (profile.role || profile.headline || "LinkedIn inbox contact")
    : mode === "comments"
      ? (profile.parentPostHeadline || profile.headline || "LinkedIn post author")
      : (profile.headline || "Not available");
  const contextText = resolveVisibleContextText(profile, mode);
  const secondaryContextText = resolveSecondaryContextText(profile, mode);
  const company = String(profile.company || "").trim();
  const location = String(profile.location || "").trim();

  elements.contextCard?.setAttribute("data-context-mode", mode);
  if (elements.contextCard) {
    const postUrl = mode === "comments"
      ? (profile.parentPostUrl || profile.postUrl || profile.url || "#")
      : "#";
    elements.contextCard.dataset.postUrl = postUrl;
  }
  elements.contextSubjectLabel.textContent = mode === "comments"
    ? "Reading context"
    : mode === "conversation"
      ? "Active thread"
      : "Profile";

  const avatarUrl = resolveContextAvatarUrl(profile, mode);
  elements.profileInitials.textContent = initials(displayName || (mode === "comments" ? "Post" : mode === "conversation" ? "Chat" : "IB"));
  elements.profileInitials.classList.toggle("has-avatar", Boolean(avatarUrl));
  elements.profileInitials.style.backgroundImage = avatarUrl ? `url(${JSON.stringify(avatarUrl)})` : "";
  elements.profileInitials.setAttribute("role", avatarUrl ? "img" : "presentation");
  elements.profileInitials.setAttribute("aria-label", avatarUrl ? `${displayName} profile photo` : `${displayName} initials`);
  elements.profileName.textContent = displayName;
  elements.profileName.title = displayName;
  elements.profileName.href = identityUrl;
  elements.profileName.classList.toggle("is-disabled-link", identityUrl === "#");
  elements.profileHeadline.textContent = role || "Not available";
  elements.contextCompany.textContent = company || "Not available";
  elements.contextLocation.textContent = location || (mode === "comments" ? "LinkedIn" : "Not available");

  elements.headlineLabel.textContent = mode === "comments" ? "Post owner headline" : mode === "conversation" ? "Contact role" : "Role";
  elements.companyLabel.textContent = "Company";
  elements.locationLabel.textContent = mode === "comments" ? "Source" : "Location";
  elements.headlineFact.classList.toggle("is-empty", !role);
  elements.companyFact.classList.toggle("is-empty", !company);
  elements.locationFact.classList.toggle("is-empty", mode !== "comments" && !location);

  const messageCount = Number(profile.messageCount) || 0;
  elements.profileMeta.textContent = mode === "conversation"
    ? `${messageCount ? `${messageCount} MESSAGE${messageCount === 1 ? "" : "S"} • ` : ""}${String(role || "LinkedIn contact").toUpperCase()}`
    : mode === "comments"
      ? `Post • ${String(profile.postAge || profile.parentPostAge || "LinkedIn").trim()}`
      : profileIdentityLabel(identityUrl, mode, profile.contentType);
  elements.profileMeta.href = identityUrl;
  elements.profileMeta.title = identityUrl === "#" ? "LinkedIn context" : identityUrl;

  if (elements.commentReactionCount) {
    elements.commentReactionCount.textContent = mode === "comments"
      ? normalizeEngagementCount(profile.reactionCount || profile.parentPostReactionCount)
      : "—";
  }
  if (elements.commentReplyCount) {
    elements.commentReplyCount.textContent = mode === "comments"
      ? normalizeEngagementCount(profile.commentCount || profile.parentPostCommentCount)
      : "—";
  }

  elements.recentContextLabel.textContent = mode === "comments"
    ? (profile.contentType === "comment" ? "Hovered comment" : "LinkedIn post")
    : mode === "conversation"
      ? "Last 24h"
      : "Visible context";
  if (mode === "conversation") renderConversationThread(profile, contextText);
  else {
    elements.contextBody.removeAttribute("role");
    elements.contextBody.removeAttribute("aria-label");
    elements.contextBody.removeAttribute("tabindex");
    elements.contextBody.textContent = contextText || "No recent context captured.";
  }
  elements.contextSecondaryBody.textContent = secondaryContextText;
  elements.contextSecondaryBody.classList.toggle("hidden", !secondaryContextText);
  elements.contextCard?.classList.remove("is-expanded");
  const canExpand = String(contextText || "").length > 210 || String(secondaryContextText || "").length > 170;
  elements.contextToggleButton?.classList.toggle("hidden", !canExpand);
  if (elements.contextToggleButton) {
    elements.contextToggleButton.textContent = "Show more";
    elements.contextToggleButton.setAttribute("aria-expanded", "false");
  }
  const visibleContextItems = String(contextText || "")
    .split(/(?:\n+|•)/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  elements.contextCount.textContent = mode === "conversation"
    ? (messageCount ? `${Math.min(messageCount, MAX_CONVERSATION_CONTEXT_MESSAGES)} latest` : "Latest")
    : mode === "comments"
      ? (profile.contentType === "comment" ? "LinkedIn Comment" : "LinkedIn Post")
      : String(Math.max(1, Math.min(99, visibleContextItems))).padStart(2, "0");
}

function renderConversationThread(profile, transcript) {
  if (!elements.contextBody) return;
  const messages = conversationMessagesForDisplay(profile, transcript);
  elements.contextBody.setAttribute("role", "log");
  elements.contextBody.setAttribute("aria-label", `Latest ${Math.min(messages.length, MAX_CONVERSATION_CONTEXT_MESSAGES)} conversation messages used for this reply`);
  elements.contextBody.setAttribute("tabindex", "0");
  if (!messages.length) {
    elements.contextBody.textContent = transcript || "No recent context captured.";
    return;
  }

  const fragment = document.createDocumentFragment();
  messages.slice(-MAX_CONVERSATION_CONTEXT_MESSAGES).forEach((message) => {
    const direction = message.direction === "self" ? "self" : message.direction === "contact" ? "contact" : "unknown";
    const item = document.createElement("div");
    item.className = `ib-thread-message is-${direction}`;

    if (message.timestamp) {
      const time = document.createElement("time");
      time.className = "ib-thread-time";
      time.textContent = message.timestamp;
      item.append(time);
    }

    const bubble = document.createElement("div");
    bubble.className = "ib-thread-bubble";
    bubble.textContent = message.text;
    item.append(bubble);
    fragment.append(item);
  });
  elements.contextBody.replaceChildren(fragment);
  const scrollToNewest = () => {
    elements.contextBody.scrollTop = elements.contextBody.scrollHeight;
  };
  scrollToNewest();
  requestAnimationFrame(() => requestAnimationFrame(scrollToNewest));
  setTimeout(scrollToNewest, 120);
}

function conversationMessagesForDisplay(profile, transcript) {
  const supplied = Array.isArray(profile?.conversationMessages)
    ? profile.conversationMessages
        .map((message) => ({
          direction: normalizeConversationDirection(message?.direction, message?.sender),
          text: String(message?.text || "").replace(/\s+/g, " ").trim(),
          timestamp: normalizeConversationTime(message?.timestamp || message?.time || message?.sentAt)
        }))
        .filter((message) => message.text)
    : [];
  if (supplied.length) return supplied;

  const value = String(transcript || "");
  const marker = /\[(YOU|CONTACT(?:\s*-\s*[^\]]+)?|UNKNOWN SENDER)\]\s*:\s*/gi;
  const matches = [...value.matchAll(marker)];
  return matches.map((match, index) => {
    const start = Number(match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? Number(matches[index + 1].index || value.length) : value.length;
    const sender = match[1];
    return {
      direction: normalizeConversationDirection(sender === "YOU" ? "self" : sender.startsWith("CONTACT") ? "contact" : "unknown", sender),
      text: value.slice(start, end).replace(/\s+/g, " ").trim(),
      timestamp: ""
    };
  }).filter((message) => message.text);
}

function normalizeConversationDirection(direction, sender = "") {
  const value = `${direction || ""} ${sender || ""}`.toLowerCase();
  if (/\b(?:self|you|outgoing|sent)\b/.test(value)) return "self";
  if (/\b(?:contact|incoming|received|other)\b/.test(value)) return "contact";
  return "unknown";
}

function normalizeConversationTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const direct = text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*[AP]M)?\b/i)?.[0];
  if (direct) return direct.toUpperCase().replace(/\s*([AP]M)$/i, " $1");
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(parsed);
}

function normalizeEngagementCount(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "0") return "—";
  const match = text.match(/(?:\d[\d,.]*\s*[KMB]?)/i);
  return match ? match[0].replace(/\s+/g, "") : text.slice(0, 8);
}

function updateDraftCharCount() {
  if (!elements.draftCharCount) return;
  const count = Array.from(String(elements.messageEditor?.value || "")).length;
  elements.draftCharCount.textContent = `${count} chars`;
}

function resolveContextAvatarUrl(profile, mode) {
  const candidates = mode === "comments"
    ? [
        profile?.parentPostAvatarUrl,
        profile?.postAuthorAvatarUrl,
        profile?.avatarUrl,
        profile?.profileImageUrl,
        profile?.imageUrl,
        profile?.photoUrl
      ]
    : [
        profile?.avatarUrl,
        profile?.profileImageUrl,
        profile?.imageUrl,
        profile?.photoUrl,
        profile?.pictureUrl
      ];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (/^(?:https?:|data:image\/)/i.test(value)) return value;
  }
  return "";
}

function resolveContextDisplayName(profile, mode) {
  const generic = /^(?:linkedin\s+(?:post|conversation|contact|user)|post owner|post author|comment author|contact|unknown sender|unknown)$/i;
  const candidates = (mode === "comments" ? [
    profile?.parentPostAuthor,
    profile?.postAuthorName,
    profile?.authorName,
    profile?.name
  ] : [
    profile?.authorName,
    profile?.contactName,
    profile?.participantName,
    profile?.name
  ]).map((value) => String(value || "").trim()).filter(Boolean);
  const direct = candidates.find((value) => !generic.test(value));
  if (direct) return direct;

  if (mode === "conversation") {
    const transcript = String(profile?.description || profile?.rawText || "");
    const tagged = transcript.match(/\[CONTACT(?:\s*-\s*([^\]]+))?\]\s*:/i)?.[1]?.trim();
    if (tagged && !generic.test(tagged)) return tagged;
    const latestSender = String(profile?.latestSender || "").trim();
    if (latestSender && !/^(?:you|contact|unknown)$/i.test(latestSender)) return latestSender;
    return "LinkedIn contact";
  }

  if (mode === "comments") return "Post owner";
  return candidates[0] || "LinkedIn user";
}

function resolveVisibleContextText(profile, mode) {
  if (mode === "dms" && profile?.commentText) return String(profile.commentText).trim();
  if (mode === "dms" && profile?.contextType === "post-dm" && profile?.parentPostText) return String(profile.parentPostText).trim();
  if (mode === "comments" && profile?.contentType === "comment" && profile?.parentPostText) return String(profile.parentPostText).trim();
  const description = String(profile?.description || "").trim();
  if (description) return description;
  if (mode === "conversation" && profile?.latestMessage) {
    const sender = profile.latestDirection === "self" ? "YOU" : "CONTACT";
    return `[${sender}]: ${String(profile.latestMessage).trim()}`;
  }
  return String(profile?.rawText || "").trim();
}

function resolveSecondaryContextText(profile, mode) {
  if (mode === "dms" && profile?.commentText && profile?.parentPostText) {
    return String(profile.parentPostText).trim();
  }
  if (mode === "comments" && profile?.contentType === "comment") {
    return String(profile.description || profile.commentText || "").trim();
  }
  return "";
}

function toggleContextExpansion() {
  const card = elements.contextCard;
  const button = elements.contextToggleButton;
  if (!card || !button) return;
  const expanded = !card.classList.contains("is-expanded");
  card.classList.toggle("is-expanded", expanded);
  button.textContent = expanded ? "Show less" : "Show more";
  button.setAttribute("aria-expanded", String(expanded));
}

function profileIdentityLabel(url, mode, contentType = "") {
  const value = String(url || "").trim();
  if (!value || value === "#") {
    if (mode === "conversation") return "LinkedIn conversation";
    if (mode === "comments") return "LinkedIn post";
    return "LinkedIn profile";
  }
  try {
    const parsed = new URL(value);
    const profileMatch = parsed.pathname.match(/\/in\/([^/?#]+)/i);
    if (profileMatch) return `@${decodeURIComponent(profileMatch[1])}`;
    const compactPath = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`.replace(/\/$/, "");
    return compactPath || "LinkedIn";
  } catch (_) {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
}

async function generateMessage({ source }) {
  if (isAutopilotActive()) {
    setStatus("error", "Stop Autopilot before using the manual generator.");
    return;
  }
  if (state.generating || !state.profile) return;
  if (state.mode === "dms" && !state.resumeMeta) {
    setStatus("error", "Add your résumé before generating a DM.");
    elements.resumeNotice.classList.remove("hidden");
    return;
  }

  state.generating = true;
  const token = ++state.generationToken;
  const previousMessage = source === "refresh" ? state.draft.trim() : "";
  setLoading(true);
  setStatus("busy", `Writing a fresh ${state.length} ${selectedToneLabel().toLowerCase()} ${state.mode === "comments" ? "comment" : state.mode === "conversation" ? "reply" : "message"}…`);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "GENERATE_OUTREACH",
      payload: {
        profile: { ...state.profile, mode: state.mode },
        tone: state.tone,
        length: state.length,
        force: true,
        previousMessage,
        source
      }
    });
    if (token !== state.generationToken) return;
    if (!response?.ok) throw new Error(response?.error || "Message generation failed.");
    applyGenerationResult(response.result);
  } catch (error) {
    setStatus("error", error.message || "Could not generate the message.");
    elements.messageEditor.placeholder = error.message || "Could not generate the message.";
  } finally {
    if (token === state.generationToken) {
      state.generating = false;
      setLoading(false);
    }
  }
}

function applyGenerationResult(result) {
  if (state.mode === "dms") renderMatch(result);
  else clearMatch();
  state.draft = result?.message || "";
  renderDraft();
  void persistDraftToSession();
  const score = Number(result?.matchScore || 0);
  const threshold = Number(state.settings?.matchThreshold || 45);
  elements.lowMatchActions.classList.toggle("hidden", state.mode !== "dms" || score >= threshold || !state.draft);
  const noun = state.mode === "comments" ? "comment" : state.mode === "conversation" ? "reply" : "message";
  setStatus("ready", state.draft ? `Your ${noun} is ready.` : `The AI returned no ${noun}. Use Refresh to try again.`);
}

function renderMatch(result) {
  if (state.mode !== "dms") return;
  const score = Number(result?.matchScore || 0);
  elements.matchPanel.classList.remove("hidden");
  elements.matchChip.classList.remove("hidden", "weak");
  elements.matchChip.textContent = result?.matchLabel || `${score}% match`;
  if (score < Number(state.settings?.matchThreshold || 45)) elements.matchChip.classList.add("weak");
  elements.matchScore.textContent = `${score}%`;
  elements.matchBar.style.width = `${Math.max(0, Math.min(100, score))}%`;
  elements.matchReasons.textContent = Array.isArray(result?.matchReasons) && result.matchReasons.length
    ? result.matchReasons.join(" · ")
    : "Match based on visible profile information and your saved résumé.";
}

function clearGeneration() {
  state.draft = "";
  clearMatch();
  renderDraft();
  void persistDraftToSession();
}

function clearMatch() {
  elements.matchPanel.classList.add("hidden");
  elements.matchChip.classList.add("hidden");
  elements.matchBar.style.width = "0";
  elements.lowMatchActions.classList.add("hidden");
}

function setLoading(loading) {
  elements.draftLoading.classList.toggle("hidden", !loading);
  elements.messageEditor.classList.toggle("hidden", loading);
  elements.refreshButton.disabled = loading || !state.profile;
  const unavailable = loading || !elements.messageEditor.value.trim();
  elements.copyButton.disabled = unavailable;
}

function renderDraft() {
  elements.messageEditor.value = state.draft || "";
  elements.messageEditor.placeholder = modeLabels().placeholder;
  updateDraftCharCount();
  updateCopyState();
}

function updateCopyState() {
  const unavailable = state.generating || !elements.messageEditor.value.trim();
  elements.copyButton.disabled = unavailable;
  elements.refreshButton.disabled = state.generating || !state.profile;
}

const UNICODE_BOLD_MAP = (() => {
  const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bold = [
    ...Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x1D5D4 + index)),
    ...Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x1D5EE + index)),
    ...Array.from({ length: 10 }, (_, index) => String.fromCodePoint(0x1D7EC + index))
  ].join("");
  return new Map([...normal].map((character, index) => [character, [...bold][index]]));
})();

function toUnicodeBold(text) {
  return [...String(text || "")]
    .map((character) => UNICODE_BOLD_MAP.get(character) || character)
    .join("");
}

function formatClipboardText(text) {
  let formatted = String(text || "")
    .replace(/\*\*([^*\n]+)\*\*/g, (_, phrase) => toUnicodeBold(phrase.trim()))
    .replace(/__([^_\n]+)__/g, (_, phrase) => toUnicodeBold(phrase.trim()));

  const keyPhrases = [
    "artificial intelligence", "machine learning", "deep learning",
    "generative AI", "computer vision", "natural language processing",
    "AI Engineer", "Software Engineer", "Full Stack Developer",
    "full-stack development", "frontend development", "backend development",
    "LLM applications", "large language models", "data science",
    "Python", "JavaScript", "TypeScript", "React", "Node.js",
    "TensorFlow", "PyTorch", "OpenAI", "Groq", "Ollama", "OpenRouter",
    "my CV", "attached CV", "my resume", "attached resume",
    "job opportunities", "relevant opportunities", "internship opportunities"
  ].sort((a, b) => b.length - a.length);

  for (const phrase of keyPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
    formatted = formatted.replace(pattern, (match) => toUnicodeBold(match));
  }

  return formatted;
}


let draftPersistenceTimer = null;

function scheduleDraftPersistence() {
  clearTimeout(draftPersistenceTimer);
  draftPersistenceTimer = setTimeout(() => {
    void persistDraftToSession();
  }, 120);
}

async function persistDraftToSession() {
  const text = String(elements.messageEditor?.value || state.draft || "").trim();
  try {
    await chrome.storage.session.set({
      sidePanelDraft: {
        text,
        clipboardText: text ? formatClipboardText(text) : "",
        mode: state.mode,
        profile: state.profile ? { ...state.profile, mode: state.mode } : null,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (_) {}
}

async function copyMessage() {
  const text = elements.messageEditor.value.trim();
  if (!text) return;
  const formattedText = formatClipboardText(text);
  void persistDraftToSession();
  try {
    await navigator.clipboard.writeText(formattedText);
  } catch (_) {
    const helper = document.createElement("textarea");
    helper.value = formattedText;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  setStatus("ready", `${state.mode === "comments" ? "Comment" : state.mode === "conversation" ? "Reply" : "Message"} copied with persistent bold keywords.`);
  flashCopyLabel();
}

function flashCopyLabel() {
  const label = elements.copyButtonLabel;
  const previous = label.textContent;
  label.textContent = "Copied";
  setTimeout(() => { label.textContent = previous; }, 1200);
}

async function stopAndRefresh() {
  if (isAutopilotActive()) {
    await stopAutopilot();
    return;
  }
  const wasGenerating = state.generating;
  state.generationToken += 1;
  state.generating = false;
  setLoading(false);

  try {
    await chrome.runtime.sendMessage({ type: "CANCEL_GENERATION", reason: "user-refresh" });
  } catch (_) {}

  clearGeneration();
  renderModeUI();
  updateCopyState();
  setStatus("", wasGenerating
    ? "Working stopped. Change the mode, provider, model, vibe, or length, then regenerate."
    : "Panel refreshed. Change any control, then regenerate when ready.");
}

async function captureCurrentProfile(options = {}) {
  if (isAutopilotActive()) {
    if (!options.silent) setStatus("error", "Stop Autopilot before capturing manual context.");
    return;
  }
  if (!options.silent) setStatus("busy", state.mode === "comments" ? "Reading the visible LinkedIn post…" : state.mode === "conversation" ? "Reading the open conversation…" : "Reading the current LinkedIn profile page…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !String(tab.url || "").includes("linkedin.com")) throw new Error("Open LinkedIn first.");
    const response = await sendToLinkedInTab(tab.id, {
      type: state.mode === "conversation" ? "CAPTURE_CONVERSATION_CONTEXT_V2" : "CAPTURE_CURRENT_CONTEXT"
    });
    if (!response?.ok) {
      const code = String(response?.errorCode || response?.code || "").trim();
      const detail = response?.error || "Could not read the current LinkedIn context.";
      throw new Error(code && !new RegExp(`\\b${code}\\b`, "i").test(detail) ? `[${code}] ${detail}` : detail);
    }
    acceptProfile(response.profile, { preserveDraft: false });
    if (!options.silent) setStatus("busy", "Context captured. Generating…");
    await generateMessage({ source: "capture" });
  } catch (error) {
    if (!options.silent) setStatus("error", error.message || "Could not capture the current page.");
  }
}

async function sendToLinkedInTab(tabId, message) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    if (!response && /_V2$/.test(String(message?.type || ""))) throw new Error("[E-RPL-07] Conversation Capture V2 is not installed in this tab yet.");
    return response;
  } catch (_) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        "src/backend/content/linkedin-content-styles.js",
        "src/backend/content/linkedin-content.js"
      ]
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (_) {
      const conversationRequest = /CONVERSATION/i.test(String(message?.type || ""));
      throw new Error(`${conversationRequest ? "[E-RPL-07] " : ""}IceBreaker could not connect to this LinkedIn tab. Refresh the page once and try again.`);
    }
  }
}

async function saveDefaults() {
  const next = {
    ...(state.settings || {}),
    schemaVersion: 23,
    generationMode: state.mode,
    ollamaEndpoint: normalizeOllamaEndpoint(state.settings?.ollamaEndpoint),
    defaultTone: state.tone,
    defaultLength: state.length,
    autoGenerate: state.settings?.autoGenerate !== false
  };
  state.settings = next;
  await chrome.storage.local.set({ settings: next });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function updateSegmentedControl(root, value) {
  [...root.querySelectorAll("button[data-value]")].forEach((button) => {
    button.classList.toggle("active", button.dataset.value === value);
  });
}

function setStatus(kind, text) {
  const detail = String(text || "").trim();
  elements.statusDot.className = `status-dot ${kind || ""}`;
  elements.statusText.dataset.kind = kind || "";
  elements.statusText.textContent = compactStatus(kind, detail);
  elements.statusText.title = detail;
  elements.statusText.setAttribute("aria-label", detail || compactStatus(kind, detail));
}

function compactStatus(kind, detail) {
  if (kind === "error") return errorCode(detail);
  if (kind === "busy") return "WORKING";
  if (kind === "ready") return "READY";
  return "HOVER";
}

function errorCode(detail) {
  const message = String(detail || "");
  const explicitConversationCode = message.match(/\b(E-RPL-\d{2})\b/i)?.[1];
  if (explicitConversationCode) return explicitConversationCode.toUpperCase();
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
  if (/403|blocked.*origin|rejected.*origin/i.test(message)) return "E403";
  if (/401|unauthorized|invalid api key/i.test(message)) return "E401";
  if (/402|credits|payment required/i.test(message)) return "E402";
  if (/404|model.*not found|does not exist/i.test(message)) return "E404";
  if (/408|timed out|timeout/i.test(message)) return "E408";
  if (/429|rate limit/i.test(message)) return "E429";
  if (/no final text|empty response|empty draft|returned an empty|unusably short/i.test(message)) return "E-EMPTY";
  if (/no usable.*key|no embedded|official-api-keys|could not load embedded api keys|Build-Official-Keys/i.test(message)) return "E-KEY";
  if (/400|bad request|invalid request/i.test(message)) return "E400";
  if (/5\d\d|server error|overloaded|capacity/i.test(message)) return "E5XX";
  if (/resume/i.test(message)) return "E-CV";
  if (/no usable comment/i.test(message)) return "E-CMT";
  if (/no usable conversation reply|conversation context|message thread|inbox conversation|hover over a conversation/i.test(message)) return "E-RPL";
  if (/replaced by newer LinkedIn content|newer LinkedIn content|cancelled/i.test(message)) return "E-NEW";
  if (/Failed to fetch|NetworkError|Load failed|could not reach|connection/i.test(message)) return "E-NET";
  return "E-AI";
}

function providerLabel(settings) {
  const manual = normalizeApiAccessMode(settings?.apiAccessMode) === "manual";
  if (settings?.provider === "openrouter") {
    const label = manual ? "My OpenRouter" : "OpenRouter Official";
    return settings.openRouterModel ? `${label} · ${settings.openRouterModel}` : label;
  }
  if (settings?.provider === "groq") {
    const label = manual ? "My Groq" : "Groq Official";
    return settings.groqModel ? `${label} · ${settings.groqModel}` : label;
  }
  return settings?.ollamaModel ? `Ollama · ${settings.ollamaModel}` : "Ollama";
}

function profileSignature(profile) {
  if (!profile) return "";
  return [
    profile.mode,
    profile.url,
    profile.name,
    profile.headline,
    profile.contextType,
    String(profile.description || "").slice(-1200),
    String(profile.commentText || "").slice(-1200),
    String(profile.parentPostText || "").slice(-1200)
  ].map((value) => String(value || "").trim()).join("|");
}

function initials(name) {
  return String(name || "IB")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "IB";
}
