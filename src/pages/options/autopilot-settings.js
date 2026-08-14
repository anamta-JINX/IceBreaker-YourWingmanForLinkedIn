(() => {
  const FIXED_TARGETS = [
    "Recruiter",
    "Technical Recruiter",
    "Talent Acquisition",
    "HR / People",
    "Hiring Manager",
    "Founder / CEO / CTO",
    "Engineering Manager",
    "Team / Technical Lead"
  ];

  const DEFAULTS = {
    selectionMode: "all_connections",
    targetTags: FIXED_TARGETS,
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
    minimiseComposer: false,
    highlightCurrentCard: true,
    vibe: "professional",
    length: "medium"
  };

  const el = {
    statusPill: document.getElementById("apPageStatusPill"),
    selectionMode: document.getElementById("apSelectionMode"),
    draftLimit: document.getElementById("apDraftLimit"),
    timeSpan: document.getElementById("apTimeSpan"),
    desiredRoles: document.getElementById("apDesiredRoles"),
    includeTitles: document.getElementById("apIncludeTitles"),
    excludeKeywords: document.getElementById("apExcludeKeywords"),
    companyKeywords: document.getElementById("apCompanyKeywords"),
    locationKeywords: document.getElementById("apLocationKeywords"),
    minMatchScore: document.getElementById("apMinMatchScore"),
    maxPerCompany: document.getElementById("apMaxPerCompany"),
    consecutiveErrorLimit: document.getElementById("apConsecutiveErrorLimit"),
    connectionsOnly: document.getElementById("apConnectionsOnly"),
    skipPreviouslyDrafted: document.getElementById("apSkipPreviouslyDrafted"),
    skipPreviouslyChecked: document.getElementById("apSkipPreviouslyChecked"),
    skipExistingDraft: document.getElementById("apSkipExistingDraft"),
    skipExistingConversation: document.getElementById("apSkipExistingConversation"),
    vibe: document.getElementById("apVibe"),
    length: document.getElementById("apLength"),
    skipDuplicates: document.getElementById("apSkipDuplicates"),
    stopProvider: document.getElementById("apStopProvider"),
    minimiseComposer: document.getElementById("apMinimiseComposer"),
    stopRecipient: document.getElementById("apStopRecipient"),
    saveSettings: document.getElementById("apSaveSettings"),
    saveStatus: document.getElementById("apSettingsSaveStatus"),
    runTitle: document.getElementById("apRunTitle"),
    runAction: document.getElementById("apRunAction"),
    progressBar: document.getElementById("apProgressBar"),
    draftCount: document.getElementById("apDraftCount"),
    queueCount: document.getElementById("apQueueCount"),
    checkedCount: document.getElementById("apCheckedCount"),
    matchedCount: document.getElementById("apMatchedCount"),
    skippedCount: document.getElementById("apSkippedCount"),
    errorCount: document.getElementById("apErrorCount"),
    errorCode: document.getElementById("apLastErrorCode"),
    errorBox: document.getElementById("apLastErrorBox"),
    errorText: document.getElementById("apLastErrorText"),
    resumeCount: document.getElementById("apResumeCount"),
    resumeProfiles: document.getElementById("apResumeProfiles"),
    draftList: document.getElementById("apDraftList"),
    activityList: document.getElementById("apActivityList"),
    diagnosticReference: document.getElementById("apDiagnosticReference"),
    clearDrafts: document.getElementById("apClearDrafts"),
    clearLogs: document.getElementById("apClearLogs"),
    clearMemory: document.getElementById("apClearMemory"),
    memorySummary: document.getElementById("apMemorySummary")
  };

  if (!el.saveSettings) return;

  let settings = { ...DEFAULTS };
  let state = normalizeState(null);
  let aiResume = null;
  let drafts = [];
  let profileMemory = [];

  initialise().catch((error) => setSaveStatus(error.message || "Could not load Autopilot settings.", true));

  async function initialise() {
    bindEvents();
    await loadAll();
    if (location.hash === "#autopilot") {
      setTimeout(() => document.getElementById("autopilot")?.scrollIntoView({ block: "start" }), 80);
    }
  }

  function bindEvents() {
    el.saveSettings.addEventListener("click", saveSettings);
    el.clearDrafts.addEventListener("click", clearDrafts);
    el.clearLogs.addEventListener("click", clearActivity);
    el.clearMemory.addEventListener("click", clearProfileMemory);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.autopilotSettings || changes.autopilotState || changes.autopilotResumeProfiles || changes.autopilotDrafts || changes.autopilotProfileMemory) {
        void loadAll(false);
      }
    });
  }

  async function loadAll(populateForm = true) {
    const stored = await chrome.storage.local.get([
      "autopilotSettings",
      "autopilotState",
      "autopilotResumeProfiles",
      "autopilotDrafts",
      "autopilotProfileMemory"
    ]);

    settings = normalizeSettings(stored.autopilotSettings);
    state = normalizeState(stored.autopilotState);
    aiResume = chooseStoredAiResume(stored.autopilotResumeProfiles);
    drafts = Array.isArray(stored.autopilotDrafts) ? stored.autopilotDrafts.slice(-200) : [];
    profileMemory = Array.isArray(stored.autopilotProfileMemory) ? stored.autopilotProfileMemory : [];

    if (aiResume) {
      await chrome.storage.local.set({ autopilotResumeProfiles: [aiResume] });
    }

    if (populateForm) populateSettingsForm();
    renderRun();
    renderResume();
    renderDrafts();
    renderActivity();
    renderMemory();
    renderDiagnosticReference();
  }

  function normalizeSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    const roles = Array.isArray(source.desiredRoles) ? source.desiredRoles : splitList(source.desiredRole || "");
    return {
      ...DEFAULTS,
      ...source,
      selectionMode: ["all_connections", "hiring_contacts", "custom_titles"].includes(source.selectionMode)
        ? source.selectionMode
        : "all_connections",
      targetTags: Array.isArray(source.targetTags) && source.targetTags.length ? uniqueList(source.targetTags) : [...FIXED_TARGETS],
      targetTitles: uniqueList(Array.isArray(source.targetTitles) ? source.targetTitles : splitList(source.targetTitles || "")),
      includeTitleKeywords: uniqueList(Array.isArray(source.includeTitleKeywords) ? source.includeTitleKeywords : splitList(source.includeTitles || "")),
      excludeKeywords: uniqueList(Array.isArray(source.excludeKeywords) ? source.excludeKeywords : splitList(source.excludeTitles || "")),
      companyKeywords: uniqueList(Array.isArray(source.companyKeywords) ? source.companyKeywords : splitList(source.targetCompanies || "")),
      locationKeywords: uniqueList(Array.isArray(source.locationKeywords) ? source.locationKeywords : splitList(source.targetLocations || "")),
      desiredRoles: uniqueList(roles).slice(0, 3).length ? uniqueList(roles).slice(0, 3) : ["AI Engineer"],
      draftLimit: clamp(source.draftLimit || DEFAULTS.draftLimit, 1, 20),
      timeSpanMinutes: 5,
      minMatchScore: [35, 65, 100].includes(Number(source.minMatchScore)) ? Number(source.minMatchScore) : DEFAULTS.minMatchScore,
      maxDraftsPerCompany: clamp(source.maxDraftsPerCompany || DEFAULTS.maxDraftsPerCompany, 1, 10),
      consecutiveErrorLimit: clamp(source.consecutiveErrorLimit || DEFAULTS.consecutiveErrorLimit, 1, 10),
      connectionsOnly: source.connectionsOnly !== false,
      skipPreviouslyDrafted: source.skipPreviouslyDrafted !== false,
      skipPreviouslyChecked: source.skipPreviouslyChecked !== false,
      skipExistingDraft: source.skipExistingDraft !== false,
      skipExistingConversation: source.skipExistingConversation === true,
      exactTitleOnly: false,
      attachResume: true,
      safeAssistMode: false,
      skipDuplicates: source.skipDuplicates !== false,
      stopOnProviderFailure: false,
      stopOnRecipientFailure: source.stopOnRecipientFailure !== false,
      minimiseComposer: true,
      highlightCurrentCard: source.highlightCurrentCard !== false,
      vibe: ["professional", "neutral", "engaging"].includes(source.vibe) ? source.vibe : "professional",
      length: ["short", "medium", "long"].includes(source.length) ? source.length : "medium"
    };
  }

  function normalizeState(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      status: source.status || "stopped",
      queueSize: Number(source.queueSize || 0),
      current: source.current || {},
      progress: source.progress || {},
      lastDiagnostic: source.lastDiagnostic || "",
      lastDiagnosticCode: source.lastDiagnosticCode || "",
      diagnosticCounts: source.diagnosticCounts && typeof source.diagnosticCounts === "object" ? { ...source.diagnosticCounts } : {},
      lastError: source.lastError || "",
      lastErrorCode: source.lastErrorCode || "",
      rootCauseCode: source.rootCauseCode || "",
      rootCauseMessage: source.rootCauseMessage || "",
      activityLog: Array.isArray(source.activityLog) ? source.activityLog : [],
      failedProfiles: Array.isArray(source.failedProfiles) ? source.failedProfiles : []
    };
  }

  function normalizeResume(profile) {
    if (!profile || typeof profile !== "object") return null;
    const normalized = {
      id: String(profile.id || "resume-ai"),
      label: "AI Resume",
      fileName: String(profile.fileName || "").trim(),
      type: String(profile.type || "application/octet-stream"),
      size: Math.max(0, Number(profile.size || 0)),
      base64: String(profile.base64 || ""),
      extractedText: String(profile.extractedText || "").trim().slice(0, 100000),
      roleTitles: uniqueList(profile.roleTitles?.length ? profile.roleTitles : ["AI Engineer", "Machine Learning Engineer"]),
      savedAt: profile.savedAt || new Date().toISOString()
    };
    return normalized.extractedText ? normalized : null;
  }

  function chooseStoredAiResume(value) {
    const profiles = (Array.isArray(value) ? value : []).map(normalizeResume).filter(Boolean);
    if (!profiles.length) return null;
    const pattern = /(^|\b)(ai|artificial intelligence|machine learning|ml)(\b|$)/i;
    return profiles.find((profile) => pattern.test(`${profile.fileName} ${(profile.roleTitles || []).join(" ")}`)) || profiles[0];
  }

  function populateSettingsForm() {
    if (el.selectionMode) el.selectionMode.value = settings.selectionMode;
    el.draftLimit.value = settings.draftLimit;
    el.timeSpan.value = "5";
    el.desiredRoles.value = settings.desiredRoles[0] || "AI Engineer";
    el.includeTitles.value = settings.includeTitleKeywords.join(", ");
    el.excludeKeywords.value = settings.excludeKeywords.join(", ");
    el.companyKeywords.value = settings.companyKeywords.join(", ");
    el.locationKeywords.value = settings.locationKeywords.join(", ");
    el.minMatchScore.value = String(settings.minMatchScore);
    el.maxPerCompany.value = settings.maxDraftsPerCompany;
    el.consecutiveErrorLimit.value = settings.consecutiveErrorLimit;
    el.connectionsOnly.checked = settings.connectionsOnly;
    el.skipPreviouslyDrafted.checked = settings.skipPreviouslyDrafted;
    el.skipPreviouslyChecked.checked = settings.skipPreviouslyChecked;
    el.skipExistingDraft.checked = settings.skipExistingDraft;
    el.skipExistingConversation.checked = settings.skipExistingConversation;
    el.vibe.value = settings.vibe;
    el.length.value = settings.length;
    el.skipDuplicates.checked = settings.skipDuplicates;
    el.stopProvider.checked = true;
    el.minimiseComposer.checked = settings.minimiseComposer;
    el.stopRecipient.checked = settings.stopOnRecipientFailure;
  }

  function collectSettings() {
    return normalizeSettings({
      selectionMode: el.selectionMode?.value || "all_connections",
      desiredRoles: splitList(el.desiredRoles.value),
      includeTitleKeywords: splitList(el.includeTitles.value),
      excludeKeywords: splitList(el.excludeKeywords.value),
      companyKeywords: splitList(el.companyKeywords.value),
      locationKeywords: splitList(el.locationKeywords.value),
      draftLimit: clamp(el.draftLimit.value, 1, 20),
      timeSpanMinutes: 5,
      minMatchScore: Number(el.minMatchScore.value),
      maxDraftsPerCompany: clamp(el.maxPerCompany.value, 1, 10),
      consecutiveErrorLimit: clamp(el.consecutiveErrorLimit.value, 1, 10),
      connectionsOnly: el.connectionsOnly.checked,
      skipPreviouslyDrafted: el.skipPreviouslyDrafted.checked,
      skipPreviouslyChecked: el.skipPreviouslyChecked.checked,
      skipExistingDraft: el.skipExistingDraft.checked,
      skipExistingConversation: el.skipExistingConversation.checked,
      skipDuplicates: el.skipDuplicates.checked,
      stopOnProviderFailure: false,
      stopOnRecipientFailure: el.stopRecipient.checked,
      minimiseComposer: true,
      highlightCurrentCard: true,
      vibe: el.vibe.value,
      length: el.length.value,
      attachResume: true
    });
  }

  async function saveSettings() {
    const next = collectSettings();
    if (!next.desiredRoles.length) return setSaveStatus("Add the role you are applying for.", true);
    if (!aiResume?.base64 || !aiResume?.fileName) return setSaveStatus("Upload the AI Resume file before saving Autopilot settings.", true);

    aiResume = {
      ...aiResume,
      label: "AI Resume",
      roleTitles: uniqueList([next.desiredRoles[0], "AI Engineer", "Machine Learning Engineer"]),
      savedAt: new Date().toISOString()
    };

    el.saveSettings.disabled = true;
    setSaveStatus("Saving Autopilot settings…");
    try {
      await chrome.storage.local.set({ autopilotResumeProfiles: [aiResume] });
      const response = await chrome.runtime.sendMessage({ type: "SAVE_AUTOPILOT_SETTINGS", settings: next });
      if (!response?.ok) throw new Error(response?.error || "Could not save Autopilot settings.");
      settings = normalizeSettings(response.settings);
      setSaveStatus("Autopilot settings and AI Resume saved.");
    } catch (error) {
      setSaveStatus(error.message || "Could not save Autopilot settings.", true);
    } finally {
      el.saveSettings.disabled = false;
    }
  }

  function renderRun() {
    const progress = state.progress || {};
    const labels = {
      stopped: "Autopilot stopped",
      starting: "Autopilot starting",
      running: "Autopilot running",
      paused: "Autopilot paused",
      completed: "Draft plan completed",
      "stopped-by-user": "Autopilot stopped",
      error: "Autopilot error"
    };
    el.runTitle.textContent = labels[state.status] || "Autopilot stopped";
    el.statusPill.textContent = String(state.status || "stopped").replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase());
    el.statusPill.classList.toggle("saved", ["running", "completed"].includes(state.status));
    el.runAction.textContent = state.current?.action || "Open LinkedIn My Network → Connections or a People search filtered to 1st-degree connections, then start Autopilot from the side panel.";
    el.draftCount.textContent = Number(progress.draftsPrepared || 0);
    el.queueCount.textContent = Math.max(1, Number(settings.draftLimit || 1));
    el.checkedCount.textContent = Number(progress.checked || 0);
    el.matchedCount.textContent = Number(progress.matched || 0);
    el.skippedCount.textContent = Number(progress.skipped || 0);
    el.errorCount.textContent = Number(progress.errors || 0);
    const target = Math.max(1, Number(settings.draftLimit || 1));
    el.progressBar.style.width = `${Math.min(100, (Number(progress.draftsPrepared || 0) / target) * 100)}%`;
    const code = state.lastErrorCode || state.lastDiagnosticCode || "";
    let detail = state.lastError || state.lastDiagnostic || "";
    const rootCode = state.rootCauseCode || (code === "AP-E301" ? state.lastDiagnosticCode : "");
    const rootMessage = state.rootCauseMessage || (code === "AP-E301" ? state.lastDiagnostic : "");
    if (code === "AP-E301" && rootCode && rootCode !== code) {
      detail = `${detail}\n\nUnderlying failure: ${rootCode} — ${rootMessage || "Open Activity for the original failure."}`;
    }
    const recentFailures = (state.failedProfiles || []).slice(-3).map((failure) => `${failure.name || failure.profileName || "Unknown profile"}: ${failure.code || "AP-E999"}${failure.stage ? ` at ${failure.stage}` : ""}`);
    if (recentFailures.length && code === "AP-E301") detail += `\n\nRecent failures:\n${recentFailures.join("\n")}`;
    const hasDiagnostic = Boolean(code || detail);
    el.errorCode.classList.toggle("hidden", !hasDiagnostic);
    el.errorCode.textContent = code || "AP-E999";
    el.errorBox.classList.toggle("hidden", !hasDiagnostic);
    el.errorText.textContent = detail || "No details were saved for this diagnostic.";
  }

  function renderMemory() {
    if (!el.memorySummary) return;
    const counts = profileMemory.reduce((summary, record) => {
      const outcome = ["saved", "rejected", "failed", "skipped"].includes(record?.outcome) ? record.outcome : "skipped";
      summary[outcome] = Number(summary[outcome] || 0) + 1;
      return summary;
    }, {});
    el.memorySummary.textContent = profileMemory.length
      ? `${profileMemory.length.toLocaleString()} remembered · ${Number(counts.saved || 0)} saved · ${Number(counts.rejected || 0)} rejected · ${Number(counts.failed || 0)} failed. Future runs skip these profiles until memory is cleared.`
      : "No saved profile memory yet. Every checked profile will be remembered after the next run.";
  }

  async function clearProfileMemory() {
    const confirmed = window.confirm("Clear all remembered Autopilot profiles? Future runs may check these people again.");
    if (!confirmed) return;
    await chrome.storage.local.set({ autopilotProfileMemory: [] });
    profileMemory = [];
    renderMemory();
    setSaveStatus("Autopilot profile memory cleared.");
  }

  function renderResume() {
    el.resumeProfiles.replaceChildren();
    el.resumeCount.textContent = aiResume?.base64 ? "Saved" : "Missing";
    el.resumeCount.classList.toggle("saved", Boolean(aiResume?.base64));

    const card = document.createElement("article");
    card.className = `ap-resume-card${aiResume ? " has-file" : ""}`;

    const head = document.createElement("div");
    head.className = "ap-resume-slot-head";
    const title = document.createElement("strong");
    title.textContent = "AI Resume";
    const badge = document.createElement("span");
    badge.className = "ap-slot-number";
    badge.textContent = "AI";
    head.append(title, badge);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
    fileInput.hidden = true;

    const fileRow = document.createElement("div");
    fileRow.className = "ap-file-row";
    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "ap-small-button primary";
    choose.textContent = aiResume ? "Replace AI Resume" : "Upload AI Resume";
    const fileName = document.createElement("span");
    fileName.className = "ap-file-name";
    fileName.textContent = aiResume?.fileName || "PDF, DOC, DOCX, or TXT";
    fileRow.append(choose, fileName);

    if (aiResume) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ap-remove-resume";
      remove.textContent = "×";
      remove.title = "Remove AI Resume";
      remove.addEventListener("click", async () => {
        aiResume = null;
        await chrome.storage.local.set({ autopilotResumeProfiles: [] });
        renderResume();
        setSaveStatus("AI Resume removed.", true);
      });
      fileRow.append(remove);
    }

    const note = document.createElement("p");
    note.className = "ap-resume-note";
    note.textContent = aiResume
      ? `${formatBytes(aiResume.size)} · ${aiResume.extractedText.length.toLocaleString()} extracted characters · attached to every completed draft`
      : "Autopilot cannot start until an attachable AI Resume is saved.";

    choose.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      choose.disabled = true;
      choose.textContent = "Reading…";
      try {
        if (file.size > 6 * 1024 * 1024) throw new Error("Use an AI Resume smaller than 6 MB.");
        const extractedText = await window.IceBreakerParsers.extractResumeText(file);
        const base64 = await readFileAsBase64(file);
        aiResume = {
          id: "resume-ai",
          label: "AI Resume",
          fileName: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          base64,
          extractedText,
          roleTitles: uniqueList([el.desiredRoles.value || "AI Engineer", "AI Engineer", "Machine Learning Engineer"]),
          savedAt: new Date().toISOString()
        };
        await chrome.storage.local.set({ autopilotResumeProfiles: [aiResume] });
        setSaveStatus(`${file.name} saved as the Autopilot AI Resume.`);
        renderResume();
      } catch (error) {
        setSaveStatus(error.message || "Could not read the AI Resume.", true);
      } finally {
        choose.disabled = false;
        fileInput.value = "";
      }
    });

    card.append(head, fileInput, fileRow, note);
    el.resumeProfiles.append(card);
  }

  function renderDrafts() {
    el.draftList.replaceChildren();
    if (!drafts.length) {
      el.draftList.append(emptyData("No Autopilot draft records yet. Start Autopilot from the side panel on LinkedIn My Network → Connections."));
      return;
    }
    [...drafts].reverse().forEach((draft) => el.draftList.append(createDraftCard(draft)));
  }

  function createDraftCard(draft) {
    const card = document.createElement("article");
    card.className = "ap-draft-card";
    const top = document.createElement("div");
    top.className = "ap-draft-top";
    const person = document.createElement("div");
    person.className = "ap-draft-person";
    const name = document.createElement("strong");
    name.textContent = draft.profileName || "LinkedIn profile";
    const details = document.createElement("span");
    details.textContent = [draft.profileHeadline, formatDate(draft.createdAt)].filter(Boolean).join(" · ");
    person.append(name, details);
    top.append(person);

    const meta = document.createElement("div");
    meta.className = "ap-draft-meta";
    [draft.contactMatch, draft.desiredRole, draft.resumeName || "AI Resume"].filter(Boolean).forEach((value) => {
      const chip = document.createElement("span");
      chip.textContent = value;
      meta.append(chip);
    });

    const message = document.createElement("p");
    message.className = "ap-draft-message";
    message.textContent = draft.message || "";

    const actions = document.createElement("div");
    actions.className = "ap-draft-actions";
    const copy = smallButton("Copy text", "primary");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(draft.message || "");
        copy.textContent = "Copied";
        setTimeout(() => { copy.textContent = "Copy text"; }, 1200);
      } catch (_) {
        setSaveStatus("Chrome could not copy this draft. Select the text manually.", true);
      }
    });
    if (draft.profileUrl) {
      const open = smallButton("Open profile");
      open.addEventListener("click", () => chrome.tabs.create({ url: draft.profileUrl }));
      actions.append(open);
    }
    const remove = smallButton("Delete", "danger");
    remove.addEventListener("click", async () => {
      drafts = drafts.filter((item) => item.id !== draft.id);
      await chrome.storage.local.set({ autopilotDrafts: drafts });
      renderDrafts();
    });
    actions.append(copy, remove);
    card.append(top, meta, message, actions);
    return card;
  }

  function renderActivity() {
    el.activityList.replaceChildren();
    const logs = [...(state.activityLog || [])].reverse();
    if (!logs.length) {
      el.activityList.append(emptyData("No Autopilot activity has been recorded."));
      return;
    }
    logs.forEach((log) => {
      const item = document.createElement("article");
      item.className = `ap-activity-item ${log.level || "info"}`;
      const code = document.createElement("span");
      code.className = "ap-log-code";
      code.textContent = log.code || "INFO";
      const copy = document.createElement("div");
      copy.className = "ap-log-copy";
      const title = document.createElement("strong");
      title.textContent = log.profileName || log.code || "Autopilot";
      const message = document.createElement("span");
      message.textContent = log.message || "";
      copy.append(title, message);
      const time = document.createElement("time");
      time.className = "ap-log-time";
      time.textContent = formatDate(log.at);
      item.append(code, copy, time);
      el.activityList.append(item);
    });
  }

  function renderDiagnosticReference() {
    if (!el.diagnosticReference) return;
    const codes = [
      ['AP-W001', 'Scan ended because LinkedIn loaded no additional cards.'],
      ['AP-W002', 'Text draft saved, but résumé attachment was not confirmed.'],
      ['AP-W003', 'Direct compose failed; the card-level Message fallback is being tried.'],
      ['AP-S101', 'Not verified as a 1st-degree connection.'],
      ['AP-S102', 'Previously drafted profile.'],
      ['AP-S103', 'The connection did not match the selected contact mode or filters.'],
      ['AP-S104', 'Role confidence below the chosen threshold.'],
      ['AP-S105', 'Per-company draft limit reached.'],
      ['AP-S106', 'Relevant person detected, but no supported Message action was found.'],
      ['AP-S107', 'Existing conversation protected.'],
      ['AP-S108', 'Existing draft text protected.'],
      ['AP-W003', 'Cloud AI was rate-limited or unavailable; a local personalised draft was used.'],
      ['AP-E201', 'AI provider and local fallback both failed.'],
      ['AP-E202', 'LinkedIn composer did not open.'],
      ['AP-E203', 'Recipient verification failed.'],
      ['AP-E204', 'Message editor not found.'],
      ['AP-E205', 'Message insertion failed.'],
      ['AP-E206', 'Saved résumé missing.'],
      ['AP-E207', 'Résumé attachment failed.'],
      ['AP-E208', 'Final draft verification failed.'],
      ['AP-E209', 'LinkedIn rate-limit or temporary block detected.'],
      ['AP-E210', 'LinkedIn card/composer structure is unsupported.'],
      ['AP-E211', 'Résumé file input not found.'],
      ['AP-E212', 'Résumé could not be injected into the file input.'],
      ['AP-E213', 'Résumé upload was not confirmed.'],
      ['AP-E214', 'LinkedIn did not preserve the message as a stable draft.'],
      ['AP-E215', 'Wrong or stale composer opened.'],
      ['AP-E216', 'Message action became stale before it was clicked.'],
      ['AP-E217', 'All composer-opening retry methods failed for one profile; the run continues.'],
      ['AP-E218', 'Direct LinkedIn compose page could not preserve the draft; the run continues.'],
      ['AP-E301', 'Consecutive-error safety limit reached; the underlying code remains visible.'],
      ['AP-E900', 'Content-script communication failed.'],
      ['AP-E999', 'Unexpected Autopilot error.']
    ];
    el.diagnosticReference.replaceChildren();
    codes.forEach(([code, message]) => {
      const item = document.createElement('article');
      item.className = 'ap-code-reference-item';
      const label = document.createElement('code');
      label.textContent = code;
      const copy = document.createElement('span');
      copy.textContent = message;
      item.append(label, copy);
      el.diagnosticReference.append(item);
    });
  }

  async function clearDrafts() {
    drafts = [];
    await chrome.storage.local.set({ autopilotDrafts: [] });
    renderDrafts();
    setSaveStatus("Saved Autopilot draft records cleared.");
  }

  async function clearActivity() {
    state.activityLog = [];
    state.failedProfiles = [];
    state.lastError = "";
    state.lastErrorCode = "";
    state.lastDiagnostic = "";
    state.lastDiagnosticCode = "";
    state.rootCauseCode = "";
    state.rootCauseMessage = "";
    state.diagnosticCounts = {};
    await chrome.storage.local.set({ autopilotState: state });
    renderRun();
    renderActivity();
    setSaveStatus("Autopilot activity and error history cleared.");
  }

  function smallButton(text, extra = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ap-small-button ${extra}`.trim();
    button.textContent = text;
    return button;
  }

  function emptyData(text) {
    const empty = document.createElement("div");
    empty.className = "ap-empty-data";
    empty.textContent = text;
    return empty;
  }

  function splitList(value) {
    return uniqueList(String(value || "").split(/[,\n;]+/));
  }

  function uniqueList(items) {
    return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 50);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value || min)));
  }

  function setSaveStatus(text, error = false) {
    el.saveStatus.textContent = text;
    el.saveStatus.style.color = error ? "#b42318" : "#057642";
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(new Error("The AI Resume file could not be read."));
      reader.readAsDataURL(file);
    });
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return "Text profile";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
})();
