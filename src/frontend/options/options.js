const DEFAULT_SETTINGS = {
  schemaVersion: 23,
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

const elements = {
  senderName: document.getElementById("senderName"),
  professionalHeadline: document.getElementById("professionalHeadline"),
  targetRoles: document.getElementById("targetRoles"),
  profileLocation: document.getElementById("profileLocation"),
  contactEmail: document.getElementById("contactEmail"),
  contactPhone: document.getElementById("contactPhone"),
  experienceLevel: document.getElementById("experienceLevel"),
  workPreference: document.getElementById("workPreference"),
  availability: document.getElementById("availability"),
  coreSkills: document.getElementById("coreSkills"),
  preferredIndustries: document.getElementById("preferredIndustries"),
  outreachGoal: document.getElementById("outreachGoal"),
  customBio: document.getElementById("customBio"),
  linkedinUrl: document.getElementById("linkedinUrl"),
  githubUrl: document.getElementById("githubUrl"),
  portfolioUrl: document.getElementById("portfolioUrl"),
  importProfileContextButton: document.getElementById("importProfileContextButton"),
  importProfileContextLabel: document.getElementById("importProfileContextLabel"),
  clearProfileContextButton: document.getElementById("clearProfileContextButton"),
  profileImportStatus: document.getElementById("profileImportStatus"),
  profileContextStatusPill: document.getElementById("profileContextStatusPill"),
  profileCompletenessText: document.getElementById("profileCompletenessText"),
  profileCompletenessBar: document.getElementById("profileCompletenessBar"),
  profileSetupHint: document.getElementById("profileSetupHint"),
  profileContextUpdated: document.getElementById("profileContextUpdated"),
  linkedinContextState: document.getElementById("linkedinContextState"),
  githubContextState: document.getElementById("githubContextState"),
  portfolioContextState: document.getElementById("portfolioContextState"),
  linkedinContextCard: document.getElementById("linkedinContextCard"),
  githubContextCard: document.getElementById("githubContextCard"),
  portfolioContextCard: document.getElementById("portfolioContextCard"),
  profileContextPreviewText: document.getElementById("profileContextPreviewText"),
  dropzone: document.getElementById("dropzone"),
  resumeFile: document.getElementById("resumeFile"),
  chooseResumeButton: document.getElementById("chooseResumeButton"),
  parseStatus: document.getElementById("parseStatus"),
  resumeText: document.getElementById("resumeText"),
  resumeFileCard: document.getElementById("resumeFileCard"),
  resumeFileName: document.getElementById("resumeFileName"),
  resumeFileType: document.getElementById("resumeFileType"),
  resumeFileMeta: document.getElementById("resumeFileMeta"),
  resumeFileBadge: document.getElementById("resumeFileBadge"),
  resumeDetectedSummary: document.getElementById("resumeDetectedSummary"),
  downloadResumeButton: document.getElementById("downloadResumeButton"),
  replaceResumeButton: document.getElementById("replaceResumeButton"),
  removeResumeButton: document.getElementById("removeResumeButton"),
  resumeStatusPill: document.getElementById("resumeStatusPill"),
  profilePreview: document.getElementById("profilePreview"),
  candidateInitials: document.getElementById("candidateInitials"),
  candidateName: document.getElementById("candidateName"),
  candidateContact: document.getElementById("candidateContact"),
  candidateRoles: document.getElementById("candidateRoles"),
  candidateSources: document.getElementById("candidateSources"),
  providerCards: document.getElementById("providerCards"),
  apiModeControl: document.getElementById("apiModeControl"),
  manualApiSettings: document.getElementById("manualApiSettings"),
  manualApiKey: document.getElementById("manualApiKey"),
  manualApiDetected: document.getElementById("manualApiDetected"),
  ollamaSettings: document.getElementById("ollamaSettings"),
  openrouterSettings: document.getElementById("openrouterSettings"),
  groqSettings: document.getElementById("groqSettings"),
  ollamaEndpoint: document.getElementById("ollamaEndpoint"),
  ollamaModel: document.getElementById("ollamaModel"),
  loadOllamaModels: document.getElementById("loadOllamaModels"),
  openRouterApiKey: document.getElementById("openRouterApiKey"),
  openRouterModel: document.getElementById("openRouterModel"),
  groqApiKey: document.getElementById("groqApiKey"),
  groqModel: document.getElementById("groqModel"),
  testProviderButton: document.getElementById("testProviderButton"),
  providerTestStatus: document.getElementById("providerTestStatus"),
  defaultTone: document.getElementById("defaultTone"),
  defaultLength: document.getElementById("defaultLength"),
  autoGenerate: document.getElementById("autoGenerate"),
  shortcutKey: document.getElementById("shortcutKey"),
  regenerateShortcutKey: document.getElementById("regenerateShortcutKey"),
  matchThreshold: document.getElementById("matchThreshold"),
  matchThresholdValue: document.getElementById("matchThresholdValue"),
  saveButton: document.getElementById("saveButton"),
  saveStatus: document.getElementById("saveStatus")
};

let currentResumeMeta = null;
let currentResumeFileRecord = null;
let resumeRemoved = false;
let storedSettings = { ...DEFAULT_SETTINGS };
let savedProfileContext = createEmptyProfileContext();

initialize();

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

async function initialize() {
  bindEvents();
  const stored = await chrome.storage.local.get(["settings", "resumeText", "resumeMeta", "profileContext"]);
  storedSettings = {
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {}),
    schemaVersion: 23,
    autoGenerate: stored.settings?.autoGenerate !== false,
    ollamaEndpoint: normalizeOllamaEndpoint(stored.settings?.ollamaEndpoint || DEFAULT_SETTINGS.ollamaEndpoint),
    apiAccessMode: normalizeApiAccessMode(stored.settings?.apiAccessMode),
    manualApiKey: migrateManualApiKey(stored.settings || {}),
    manualApiProvider: detectApiProvider(migrateManualApiKey(stored.settings || {}))
  };
  currentResumeMeta = stored.resumeMeta || null;
  try {
    currentResumeFileRecord = await window.IceBreakerResumeStore.get();
  } catch (_) {
    currentResumeFileRecord = null;
  }
  savedProfileContext = normalizeStoredProfileContext(stored.profileContext);
  populateSettings(storedSettings);
  elements.resumeText.value = stored.resumeText || "";
  renderResumeState();
  renderProfileContextState();
  renderCandidatePreview();
  renderProfileCompleteness();
  initialiseSettingsNavigation();
  await loadShortcut();

  if (storedSettings.provider === "ollama") {
    setTimeout(() => loadOllamaModels({ silent: true }), 150);
  }
}

function bindEvents() {
  elements.chooseResumeButton.addEventListener("click", () => elements.resumeFile.click());
  elements.dropzone.addEventListener("click", (event) => {
    if (!event.target.closest("button")) elements.resumeFile.click();
  });
  elements.dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.resumeFile.click();
    }
  });
  elements.resumeFile.addEventListener("change", () => processResumeFile(elements.resumeFile.files?.[0]));
  elements.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("dragging");
  });
  elements.dropzone.addEventListener("dragleave", () => elements.dropzone.classList.remove("dragging"));
  elements.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("dragging");
    processResumeFile(event.dataTransfer.files?.[0]);
  });

  elements.removeResumeButton.addEventListener("click", removeResume);
  elements.replaceResumeButton.addEventListener("click", () => elements.resumeFile.click());
  elements.downloadResumeButton.addEventListener("click", downloadStoredResume);
  elements.importProfileContextButton.addEventListener("click", importProfileContext);
  elements.clearProfileContextButton.addEventListener("click", clearProfileContext);

  elements.resumeText.addEventListener("input", () => {
    resumeRemoved = !elements.resumeText.value.trim();
    renderResumeState();
    renderCandidatePreview();
    markUnsaved();
  });

  elements.providerCards.addEventListener("change", () => {
    const provider = selectedProvider();
    updateProviderVisibility(provider);
    markUnsaved();
    if (provider === "ollama") loadOllamaModels({ silent: true });
  });
  elements.apiModeControl.addEventListener("change", () => {
    updateApiModeVisibility();
    if (selectedApiAccessMode() === "manual") updateManualApiDetection({ selectProvider: true });
    markUnsaved();
  });
  elements.manualApiKey.addEventListener("input", () => {
    updateManualApiDetection({ selectProvider: true });
    markUnsaved();
  });

  elements.loadOllamaModels.addEventListener("click", () => loadOllamaModels({ silent: false }));
  elements.testProviderButton.addEventListener("click", testProvider);
  elements.saveButton.addEventListener("click", saveAll);
  elements.matchThreshold.addEventListener("input", () => {
    elements.matchThresholdValue.textContent = `${elements.matchThreshold.value}%`;
    markUnsaved();
  });

  document.querySelectorAll(".reveal-button").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      button.textContent = hidden ? "Hide" : "Show";
    });
  });

  document.querySelectorAll("input, textarea, select").forEach((control) => {
    if (control === elements.resumeFile || control === elements.matchThreshold || control.type === "radio") return;
    control.addEventListener("input", () => {
      if ([elements.senderName, elements.professionalHeadline, elements.targetRoles, elements.profileLocation, elements.contactEmail, elements.contactPhone, elements.coreSkills].includes(control)) renderCandidatePreview();
      if ([elements.linkedinUrl, elements.githubUrl, elements.portfolioUrl].includes(control)) renderProfileContextState();
      renderProfileCompleteness();
      markUnsaved();
    });
    control.addEventListener("change", () => { renderCandidatePreview(); renderProfileCompleteness(); markUnsaved(); });
  });
}

function populateSettings(settings) {
  elements.senderName.value = settings.senderName || "";
  elements.professionalHeadline.value = settings.professionalHeadline || "";
  elements.targetRoles.value = settings.targetRoles || "";
  elements.profileLocation.value = settings.profileLocation || "";
  elements.contactEmail.value = settings.contactEmail || "";
  elements.contactPhone.value = settings.contactPhone || "";
  elements.experienceLevel.value = settings.experienceLevel || "";
  elements.workPreference.value = settings.workPreference || "";
  elements.availability.value = settings.availability || "";
  elements.coreSkills.value = settings.coreSkills || "";
  elements.preferredIndustries.value = settings.preferredIndustries || "";
  elements.outreachGoal.value = settings.outreachGoal || "opportunities";
  elements.customBio.value = settings.customBio || "";
  elements.linkedinUrl.value = settings.linkedinUrl || savedProfileContext.linkedin?.url || "";
  elements.githubUrl.value = settings.githubUrl || savedProfileContext.github?.url || "";
  elements.portfolioUrl.value = settings.portfolioUrl || savedProfileContext.portfolio?.url || "";
  elements.ollamaEndpoint.value = normalizeOllamaEndpoint(settings.ollamaEndpoint);
  renderOllamaModelOptions([], settings.ollamaModel);
  elements.manualApiKey.value = migrateManualApiKey(settings);
  const apiModeRadio = document.querySelector(`input[name="apiAccessMode"][value="${normalizeApiAccessMode(settings.apiAccessMode)}"]`)
    || document.querySelector('input[name="apiAccessMode"][value="official"]');
  apiModeRadio.checked = true;
  elements.openRouterApiKey.value = settings.openRouterApiKey || "";
  elements.openRouterModel.value = settings.openRouterModel;
  elements.groqApiKey.value = settings.groqApiKey;
  elements.groqModel.value = settings.groqModel;
  elements.defaultTone.value = settings.defaultTone;
  elements.defaultLength.value = settings.defaultLength;
  elements.autoGenerate.checked = settings.autoGenerate !== false;
  elements.matchThreshold.value = Number(settings.matchThreshold ?? 45);
  elements.matchThresholdValue.textContent = `${elements.matchThreshold.value}%`;

  const radio = document.querySelector(`input[name="provider"][value="${settings.provider}"]`)
    || document.querySelector('input[name="provider"][value="ollama"]');
  radio.checked = true;
  updateProviderVisibility(radio.value);
  updateApiModeVisibility();
  updateManualApiDetection({ selectProvider: normalizeApiAccessMode(settings.apiAccessMode) === "manual" });
}

async function loadShortcut() {
  try {
    const commands = await chrome.commands.getAll();
    const copyCommand = commands.find((item) => item.name === "force-generate-and-copy");
    const regenerateCommand = commands.find((item) => item.name === "regenerate-current-text");
    elements.shortcutKey.textContent = copyCommand?.shortcut || "Alt+C";
    if (elements.regenerateShortcutKey) elements.regenerateShortcutKey.textContent = regenerateCommand?.shortcut || "Alt+G";
  } catch (_) {
    elements.shortcutKey.textContent = "Alt+C";
    if (elements.regenerateShortcutKey) elements.regenerateShortcutKey.textContent = "Alt+G";
  }
}

async function processResumeFile(file) {
  if (!file) return;
  const lowerName = String(file.name || "").toLowerCase();
  if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx")) {
    setParseStatus("error", "Please choose a PDF or DOCX résumé.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setParseStatus("error", "Please use a résumé file smaller than 10 MB.");
    return;
  }

  setParseStatus("", `Reading ${file.name} locally and building your profile…`);
  elements.chooseResumeButton.disabled = true;
  elements.replaceResumeButton.disabled = true;

  try {
    const text = await window.IceBreakerParsers.extractResumeText(file);
    const cleanedText = window.IceBreakerParsers.cleanResumeText(text).slice(0, 100000);
    if (cleanedText.length < 80) throw new Error("Very little readable text was found. Use a text-based PDF or DOCX rather than a scanned image.");

    currentResumeFileRecord = await window.IceBreakerResumeStore.save(file);
    const derived = deriveCandidateInfo(cleanedText);
    elements.resumeText.value = cleanedText;
    applyResumeProfile(derived);

    currentResumeMeta = {
      fileName: file.name,
      sizeBytes: file.size,
      type: file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      uploadedAt: currentResumeFileRecord.uploadedAt,
      savedAt: new Date().toISOString(),
      characters: cleanedText.length,
      originalFileStored: true,
      derived
    };
    resumeRemoved = false;

    const settings = collectSettings();
    storedSettings = { ...storedSettings, ...settings, schemaVersion: 23 };
    await chrome.storage.local.set({
      settings: storedSettings,
      resumeText: cleanedText,
      resumeMeta: currentResumeMeta,
      profileContext: reconcileProfileContextWithSettings(savedProfileContext, storedSettings)
    });

    const detectedLinks = [derived.linkedIn, derived.github, derived.portfolio].filter(Boolean).length;
    const linkMessage = detectedLinks
      ? ` ${detectedLinks} profile link${detectedLinks === 1 ? " was" : "s were"} inserted into empty fields once.`
      : "";
    setParseStatus("success", `${file.name} is saved locally and your professional profile was built.${linkMessage}`);
    setSaveStatus("success", "Résumé and detected profile details were saved automatically. Review or adjust anything below.");
    renderResumeState();
    renderProfileContextState();
    renderCandidatePreview();
    renderProfileCompleteness();
  } catch (error) {
    setParseStatus("error", error.message || "The résumé could not be read.");
  } finally {
    elements.chooseResumeButton.disabled = false;
    elements.replaceResumeButton.disabled = false;
    elements.resumeFile.value = "";
  }
}

async function removeResume() {
  elements.resumeText.value = "";
  currentResumeMeta = null;
  currentResumeFileRecord = null;
  resumeRemoved = true;
  try {
    await window.IceBreakerResumeStore.remove();
    await chrome.storage.local.remove(["resumeText", "resumeMeta"]);
    setParseStatus("", "Résumé file and hidden résumé context were removed from this Chrome profile.");
  } catch (error) {
    setParseStatus("error", error.message || "The résumé could not be removed completely.");
  }
  renderResumeState();
  renderCandidatePreview();
  renderProfileCompleteness();
  setSaveStatus("success", "Résumé file and hidden résumé context were removed locally.");
}

async function downloadStoredResume() {
  try {
    await window.IceBreakerResumeStore.download();
  } catch (error) {
    setParseStatus("error", error.message || "The original résumé file is unavailable.");
  }
}

function applyResumeProfile(derived) {
  const fillEmpty = (control, value) => {
    if (!control || control.value.trim() || !String(value || "").trim()) return false;
    control.value = String(value).trim();
    return true;
  };

  fillEmpty(elements.senderName, derived.name);
  fillEmpty(elements.professionalHeadline, derived.headline);
  fillEmpty(elements.targetRoles, derived.targetRoles);
  fillEmpty(elements.profileLocation, derived.location);
  fillEmpty(elements.contactEmail, derived.email);
  fillEmpty(elements.contactPhone, derived.phone);
  fillEmpty(elements.coreSkills, derived.skills.join(", "));
  fillEmpty(elements.experienceLevel, derived.experienceLevel);
  fillEmpty(elements.linkedinUrl, derived.linkedIn);
  fillEmpty(elements.githubUrl, derived.github);
  fillEmpty(elements.portfolioUrl, derived.portfolio);

  elements.profileSetupHint.textContent = "Filled from résumé";
  if ([derived.linkedIn, derived.github, derived.portfolio].some(Boolean)) {
    setProfileImportStatus("warning", "Links detected from the résumé. Import the sources once to save their context.");
  }
}

function renderResumeState() {
  const hasText = Boolean(elements.resumeText.value.trim());
  const hasOriginalFile = Boolean(currentResumeFileRecord?.blob || currentResumeMeta?.originalFileStored);
  elements.resumeStatusPill.textContent = hasOriginalFile ? "File saved" : hasText ? "Context saved" : "No résumé";
  elements.resumeStatusPill.classList.toggle("saved", hasText);
  elements.removeResumeButton.disabled = !hasText;
  elements.downloadResumeButton.disabled = !currentResumeFileRecord?.blob;
  elements.dropzone.classList.toggle("hidden", hasText);
  elements.resumeFileCard.classList.toggle("hidden", !hasText);

  if (!hasText) return;

  const derived = currentResumeMeta?.derived || deriveCandidateInfo(elements.resumeText.value);
  const fileName = currentResumeFileRecord?.name || currentResumeMeta?.fileName || "Saved résumé context";
  const sizeBytes = currentResumeFileRecord?.size || currentResumeMeta?.sizeBytes || 0;
  const uploadedAt = currentResumeFileRecord?.uploadedAt || currentResumeMeta?.uploadedAt || currentResumeMeta?.savedAt || "";
  const extension = fileName.includes(".") ? fileName.split(".").pop().toUpperCase() : "CV";

  elements.resumeFileName.textContent = fileName;
  elements.resumeFileType.textContent = extension;
  elements.resumeFileBadge.textContent = currentResumeFileRecord?.blob ? "Original saved locally" : "Hidden context saved";
  elements.resumeFileBadge.className = currentResumeFileRecord?.blob ? "source-state ready" : "source-state stale";
  elements.resumeFileMeta.textContent = [sizeBytes ? formatBytes(sizeBytes) : "", uploadedAt ? `Added ${formatProfileDate(uploadedAt)}` : "", `${Number(currentResumeMeta?.characters || elements.resumeText.value.length).toLocaleString()} readable characters`].filter(Boolean).join(" · ");

  const detected = [];
  if (derived.name) detected.push("Name detected");
  if (derived.email) detected.push("Email detected");
  if (derived.skills?.length) detected.push(`${derived.skills.length} skills detected`);
  const linkCount = [derived.linkedIn, derived.github, derived.portfolio].filter(Boolean).length;
  if (linkCount) detected.push(`${linkCount} profile link${linkCount === 1 ? "" : "s"} detected`);
  if (!currentResumeFileRecord?.blob) detected.push("Replace once to preserve the original PDF/DOCX");
  elements.resumeDetectedSummary.innerHTML = detected.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
}

function renderCandidatePreview() {
  const text = elements.resumeText.value.trim();
  const sourceCount = countSavedProfileSources();
  const hasProfile = Boolean(text || sourceCount || elements.senderName.value.trim());
  if (!hasProfile) {
    elements.profilePreview.classList.add("hidden");
    return;
  }

  const derived = deriveCandidateInfo(text);
  const name = elements.senderName.value.trim() || derived.name || savedProfileContext.linkedin?.name || savedProfileContext.github?.name || "Candidate";
  const headline = elements.professionalHeadline.value.trim();
  const contact = [elements.contactEmail.value.trim() || derived.email, elements.contactPhone.value.trim() || derived.phone, elements.profileLocation.value.trim()].filter(Boolean).join(" · ") || "Saved context is ready for personalised outreach.";
  const roles = [headline, elements.targetRoles.value.trim()].filter(Boolean).join(" — ") || "Add your professional headline and target roles.";

  elements.profilePreview.classList.remove("hidden");
  elements.candidateInitials.textContent = initials(name);
  elements.candidateName.textContent = name;
  elements.candidateContact.textContent = contact;
  elements.candidateRoles.textContent = roles;
  elements.candidateSources.innerHTML = [
    text ? "Résumé" : "",
    elements.coreSkills.value.trim() ? "Skills" : "",
    sourceIsCurrent("linkedin") ? "LinkedIn" : "",
    sourceIsCurrent("github") ? "GitHub projects" : "",
    sourceIsCurrent("portfolio") ? "Portfolio" : ""
  ].filter(Boolean).map((label) => `<span>${escapeHtml(label)}</span>`).join("");
}

function renderProfileCompleteness() {
  const checks = [
    Boolean(elements.resumeText.value.trim()),
    Boolean(elements.senderName.value.trim()),
    Boolean(elements.professionalHeadline.value.trim()),
    Boolean(elements.targetRoles.value.trim()),
    Boolean(elements.coreSkills.value.trim()),
    Boolean(elements.contactEmail.value.trim()),
    Boolean(elements.profileLocation.value.trim()),
    Boolean(elements.linkedinUrl.value.trim() || elements.githubUrl.value.trim() || elements.portfolioUrl.value.trim()),
    Boolean(countSavedProfileSources()),
    Boolean(elements.experienceLevel.value || elements.availability.value.trim())
  ];
  const completed = checks.filter(Boolean).length;
  const percent = Math.round((completed / checks.length) * 100);
  elements.profileCompletenessText.textContent = `${percent}% complete`;
  elements.profileCompletenessBar.style.width = `${percent}%`;
  elements.profileContextStatusPill.textContent = percent >= 80 ? "Profile ready" : percent >= 40 ? "Profile in progress" : "Profile setup";
  elements.profileContextStatusPill.classList.toggle("saved", percent >= 80);
  elements.profileContextUpdated.textContent = percent >= 80
    ? "Your saved profile is ready for receiver-aware DMs."
    : !elements.resumeText.value.trim()
      ? "Upload your résumé to build the profile automatically."
      : "Complete the highlighted professional details and import detected links.";
}

function deriveCandidateInfo(text) {
  const source = String(text || "");
  const lines = source.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const email = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = source.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s+/g, " ") || "";
  const linkedIn = normalizeDetectedUrl(source.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%.-]+\/?/i)?.[0] || "");
  const github = normalizeDetectedUrl(source.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/?/i)?.[0] || "");
  const allUrls = extractDetectedUrls(source);
  const emailDomain = String(email.split("@")[1] || "").toLowerCase();
  const portfolio = allUrls.find((url) => {
    const hostname = safeUrl(url)?.hostname.replace(/^www\./i, "").toLowerCase() || "";
    return hostname && hostname !== emailDomain && !/linkedin\.com|github\.com|mailto:|gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|medium\.com|leetcode\.com|hackerrank\.com|coursera\.org|udemy\.com|facebook\.com|instagram\.com|x\.com/i.test(url);
  }) || "";
  const name = lines.find((line) =>
    line.length >= 3 && line.length <= 60 &&
    !line.includes("@") &&
    !/linkedin|github|resume|curriculum|vitae|engineer|developer|student|phone|email|portfolio/i.test(line) &&
    /^[A-Za-z][A-Za-z .'-]+$/.test(line)
  ) || "";
  const rolePattern = /engineer|developer|designer|analyst|scientist|researcher|student|intern|consultant|manager|specialist|architect|founder/i;
  const headline = lines.slice(0, 18).find((line) => line !== name && line.length <= 110 && rolePattern.test(line) && !/experience|education|summary|objective|skills/i.test(line)) || "";
  const locationLine = lines.slice(0, 22).find((line) => /(?:Pakistan|India|United Kingdom|UK|United States|USA|Canada|Australia|UAE|Dubai|Lahore|Karachi|Islamabad|Rawalpindi|Peshawar|Faisalabad|Multan|Remote)$/i.test(line) && line.length <= 140) || "";
  const location = locationLine
    ? (locationLine.split(/[|•]/).map((item) => item.trim()).reverse().find((item) => /(?:Pakistan|India|United Kingdom|UK|United States|USA|Canada|Australia|UAE|Dubai|Lahore|Karachi|Islamabad|Rawalpindi|Peshawar|Faisalabad|Multan|Remote)$/i.test(item)) || locationLine)
    : "";
  const skills = detectResumeSkills(source);
  const targetRoles = headline ? headline.split(/[|•·]/).map((item) => item.trim()).filter((item) => rolePattern.test(item)).slice(0, 4).join(", ") : "";
  const experienceLevel = /\bstudent\b/i.test(source) ? "student" : /\bintern(?:ship)?\b/i.test(source) ? "intern" : "";

  return { name, email, phone, linkedIn, github, portfolio, headline, targetRoles, location, skills, experienceLevel };
}

function extractDetectedUrls(text) {
  const matches = String(text || "").match(/(?:https?:\/\/|www\.)[^\s<>"')\]]+|\b[A-Za-z0-9.-]+\.(?:com|dev|io|me|app|site|tech|pk)(?:\/[^\s<>"')\]]*)?/gi) || [];
  return [...new Set(matches.map(normalizeDetectedUrl).filter(Boolean))];
}

function normalizeDetectedUrl(value) {
  const cleaned = String(value || "").trim().replace(/[.,;:]+$/, "");
  if (!cleaned) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned.replace(/^www\./i, "www.")}`);
    if (!url.hostname.includes(".")) return "";
    url.hash = "";
    return url.toString();
  } catch (_) {
    return "";
  }
}

function detectResumeSkills(text) {
  const catalogue = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "PHP", "SQL", "HTML", "CSS",
    "React", "Next.js", "Node.js", "Express", "Flask", "Django", "FastAPI", "Tailwind CSS", "Bootstrap",
    "TensorFlow", "Keras", "PyTorch", "Scikit-learn", "OpenCV", "Pandas", "NumPy", "Machine Learning",
    "Deep Learning", "Computer Vision", "Natural Language Processing", "LLMs", "Generative AI", "RAG",
    "MySQL", "PostgreSQL", "MongoDB", "Supabase", "Firebase", "Docker", "Git", "GitHub", "REST APIs",
    "Chrome Extensions", "VS Code Extensions", "AWS", "Azure", "Vercel", "Linux", "n8n"
  ];
  const source = String(text || "").toLowerCase();
  return catalogue.filter((skill) => {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(source);
  }).slice(0, 24);
}

function formatProfileDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function createEmptyProfileContext() {
  return { version: 1, updatedAt: "", linkedin: null, github: null, portfolio: null };
}

function normalizeStoredProfileContext(value) {
  const context = value && typeof value === "object" ? value : {};
  return {
    version: 1,
    updatedAt: String(context.updatedAt || ""),
    linkedin: normalizeContextSource(context.linkedin),
    github: normalizeContextSource(context.github),
    portfolio: normalizeContextSource(context.portfolio)
  };
}

function normalizeContextSource(source) {
  if (!source || typeof source !== "object" || !String(source.text || "").trim()) return null;
  return {
    ...source,
    url: normalizeOptionalUrl(source.url),
    importedAt: String(source.importedAt || source.updatedAt || new Date().toISOString()),
    text: String(source.text || "").trim().slice(0, 60000),
    summary: String(source.summary || "").trim().slice(0, 800)
  };
}

function normalizeOptionalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    url.hash = "";
    return url.toString();
  } catch (_) {
    return raw;
  }
}

function normalizeLinkedInProfileUrl(value) {
  const normalized = normalizeOptionalUrl(value);
  const url = safeUrl(normalized);
  if (!url) return normalized;
  const match = url.pathname.match(/^\/in\/([^/]+)/i);
  if (!match) return normalized;
  return `${url.origin}/in/${match[1]}/`;
}

function normalizeGitHubProfileUrl(value) {
  const normalized = normalizeOptionalUrl(value);
  const url = safeUrl(normalized);
  const username = githubUsername(url);
  return username ? `https://github.com/${username}` : normalized;
}

function canonicalUrl(value) {
  try {
    const url = new URL(normalizeOptionalUrl(value));
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch (_) {
    return String(value || "").trim().replace(/\/+$/, "").toLowerCase();
  }
}

function sourceIsCurrent(key) {
  const source = savedProfileContext[key];
  const field = elements[`${key}Url`];
  const currentUrl = normalizeOptionalUrl(field?.value || "");
  return Boolean(source?.text && currentUrl && canonicalUrl(source.url) === canonicalUrl(currentUrl));
}

function countSavedProfileSources() {
  return ["linkedin", "github", "portfolio"].filter(sourceIsCurrent).length;
}

function reconcileProfileContextWithSettings(context, settings) {
  const next = normalizeStoredProfileContext(context);
  for (const key of ["linkedin", "github", "portfolio"]) {
    const settingKey = `${key}Url`;
    const current = normalizeOptionalUrl(settings[settingKey]);
    if (!current || !next[key] || canonicalUrl(next[key].url) !== canonicalUrl(current)) next[key] = null;
  }
  next.updatedAt = [next.linkedin, next.github, next.portfolio]
    .filter(Boolean)
    .map((source) => source.importedAt)
    .sort()
    .at(-1) || "";
  return next;
}

function renderProfileContextState() {
  const definitions = {
    linkedin: { label: "LinkedIn", card: elements.linkedinContextCard, state: elements.linkedinContextState, empty: "Waiting for a LinkedIn profile link.", note: "Posts and activity are excluded." },
    github: { label: "GitHub", card: elements.githubContextCard, state: elements.githubContextState, empty: "Waiting for a GitHub profile link.", note: "Repository descriptions are preserved." },
    portfolio: { label: "Portfolio", card: elements.portfolioContextCard, state: elements.portfolioContextState, empty: "Waiting for a portfolio link.", note: "Permission is limited to this website." }
  };

  for (const [key, definition] of Object.entries(definitions)) {
    const source = savedProfileContext[key];
    const url = normalizeOptionalUrl(elements[`${key}Url`]?.value || "");
    const current = sourceIsCurrent(key);
    definition.card.classList.toggle("ready", current);
    definition.card.classList.toggle("stale", Boolean(source && url && !current));
    definition.state.className = `source-state${current ? " ready" : source && url ? " stale" : ""}`;
    definition.state.textContent = current ? "Saved" : source && url ? "Import again" : "Not imported";
    const paragraph = definition.card.querySelector("p");
    const small = definition.card.querySelector("small");
    if (current) {
      paragraph.textContent = source.summary || `${source.text.length.toLocaleString()} characters saved.`;
      small.textContent = `Imported ${formatImportedDate(source.importedAt)}.`;
    } else if (source && url) {
      paragraph.textContent = "The link changed. Import again before this source is used.";
      small.textContent = definition.note;
    } else {
      paragraph.textContent = url ? "Ready to import." : definition.empty;
      small.textContent = definition.note;
    }
  }

  const count = countSavedProfileSources();
  if (!elements.importProfileContextButton.classList.contains("working")) {
    elements.importProfileContextLabel.textContent = count ? "Refresh imported sources" : "Import detected sources once";
  }
  elements.clearProfileContextButton.disabled = ![savedProfileContext.linkedin, savedProfileContext.github, savedProfileContext.portfolio].some(Boolean);
  elements.profileContextPreviewText.value = buildProfileContextPreview();
  renderCandidatePreview();
  renderProfileCompleteness();
}

function buildProfileContextPreview() {
  const parts = [];
  for (const key of ["linkedin", "github", "portfolio"]) {
    if (!sourceIsCurrent(key)) continue;
    const source = savedProfileContext[key];
    parts.push(`${key.toUpperCase()}\nURL: ${source.url}\nImported: ${formatImportedDate(source.importedAt)}\n\n${source.text}`);
  }
  return parts.join("\n\n────────────────────────────────\n\n").slice(0, 120000);
}

function formatImportedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "previously" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

async function importProfileContext() {
  let links;
  try {
    links = validateProfileLinks();
  } catch (_) {
    return;
  }
  if (!links.linkedin && !links.github && !links.portfolio) {
    setProfileImportStatus("error", "Add at least one LinkedIn, GitHub, or portfolio link first.");
    return;
  }

  elements.importProfileContextButton.disabled = true;
  elements.importProfileContextButton.classList.add("working");
  elements.importProfileContextLabel.textContent = "Importing context…";
  setProfileImportStatus("", "Preparing a one-time import. Keep this settings page open.");

  const next = normalizeStoredProfileContext(savedProfileContext);
  for (const key of ["linkedin", "github", "portfolio"]) {
    const url = links[key];
    if (!url || (next[key] && canonicalUrl(next[key].url) !== canonicalUrl(url))) next[key] = null;
  }
  const successes = [];
  const failures = [];

  try {
    if (links.portfolio) {
      const allowed = await requestPortfolioPermission(links.portfolio);
      if (!allowed) failures.push("Portfolio permission was not granted");
    }

    const jobs = [
      ["linkedin", links.linkedin, importLinkedInContext],
      ["github", links.github, importGitHubContext],
      ["portfolio", links.portfolio, importPortfolioContext]
    ];

    for (const [key, url, importer] of jobs) {
      if (!url) {
        next[key] = null;
        continue;
      }
      if (key === "portfolio" && failures.some((item) => item.startsWith("Portfolio permission"))) continue;
      setProfileImportStatus("", `Reading ${key === "linkedin" ? "LinkedIn (posts excluded)" : key === "github" ? "GitHub projects" : "your portfolio"}…`);
      setSourceLoading(key, true);
      try {
        const source = await importer(url);
        next[key] = normalizeContextSource(source);
        successes.push(key === "linkedin" ? "LinkedIn" : key === "github" ? "GitHub" : "Portfolio");
      } catch (error) {
        failures.push(`${key === "linkedin" ? "LinkedIn" : key === "github" ? "GitHub" : "Portfolio"}: ${error.message || "Import failed"}`);
      } finally {
        setSourceLoading(key, false);
      }
    }

    next.updatedAt = new Date().toISOString();
    savedProfileContext = next;
    const existing = await chrome.storage.local.get("settings");
    storedSettings = {
      ...DEFAULT_SETTINGS,
      ...(existing.settings || {}),
      linkedinUrl: links.linkedin,
      githubUrl: links.github,
      portfolioUrl: links.portfolio,
      schemaVersion: 23
    };
    await chrome.storage.local.set({ settings: storedSettings, profileContext: savedProfileContext });
    await chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED" }).catch(() => {});
    renderProfileContextState();
    if (successes.length) {
      setProfileImportStatus(failures.length ? "warning" : "success", `${successes.join(", ")} saved for future DMs.${failures.length ? ` ${failures.join(" · ")}` : ""}`);
      setSaveStatus("success", "Profile links and imported context were saved locally.");
    } else {
      setProfileImportStatus("error", failures.join(" · ") || "No profile context could be imported.");
    }
  } finally {
    elements.importProfileContextButton.disabled = false;
    elements.importProfileContextButton.classList.remove("working");
    elements.importProfileContextLabel.textContent = countSavedProfileSources() ? "Refresh saved context" : "Import profile context";
  }
}

function validateProfileLinks() {
  const values = {
    linkedin: normalizeLinkedInProfileUrl(elements.linkedinUrl.value),
    github: normalizeGitHubProfileUrl(elements.githubUrl.value),
    portfolio: normalizeOptionalUrl(elements.portfolioUrl.value)
  };
  if (values.linkedin) {
    const url = safeUrl(values.linkedin);
    if (!url || !/(^|\.)linkedin\.com$/i.test(url.hostname) || !/^\/in\//i.test(url.pathname)) {
      throwProfileLinkError(elements.linkedinUrl, "Use a LinkedIn profile link containing linkedin.com/in/.");
    }
  }
  if (values.github) {
    const url = safeUrl(values.github);
    if (!url || !/(^|\.)github\.com$/i.test(url.hostname) || !githubUsername(url)) {
      throwProfileLinkError(elements.githubUrl, "Use a GitHub profile link such as https://github.com/username.");
    }
  }
  if (values.portfolio) {
    const url = safeUrl(values.portfolio);
    if (!url || !["http:", "https:"].includes(url.protocol)) {
      throwProfileLinkError(elements.portfolioUrl, "Use a complete public portfolio URL.");
    }
  }
  elements.linkedinUrl.value = values.linkedin;
  elements.githubUrl.value = values.github;
  elements.portfolioUrl.value = values.portfolio;
  return values;
}

function throwProfileLinkError(element, message) {
  setProfileImportStatus("error", message);
  element.focus();
  throw new Error(message);
}

function safeUrl(value) {
  try { return new URL(value); } catch (_) { return null; }
}

function githubUsername(url) {
  const first = String(url?.pathname || "").split("/").filter(Boolean)[0] || "";
  return /^(?!settings$|marketplace$|features$|topics$|collections$)[A-Za-z0-9-]{1,39}$/.test(first) ? first : "";
}

async function requestPortfolioPermission(value) {
  const url = safeUrl(value);
  if (!url) return false;
  if (url.hostname.endsWith("linkedin.com") || url.hostname.endsWith("github.com")) return true;
  const originPattern = `${url.origin}/*`;
  const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });
  if (hasPermission) return true;
  return chrome.permissions.request({ origins: [originPattern] });
}

async function importLinkedInContext(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForTabComplete(tab.id, 25000);
    const firstResponse = await sendTabMessageWithRetry(tab.id, { type: "CAPTURE_SAVED_PROFILE_CONTEXT" }, 8, 600);
    if (!firstResponse?.ok || !firstResponse?.context?.text) throw new Error(firstResponse?.error || "LinkedIn profile text was not available. Make sure you are signed in.");

    const contexts = [firstResponse.context];
    const detailUrls = (Array.isArray(firstResponse.context.detailUrls) ? firstResponse.context.detailUrls : [])
      .filter(isAllowedLinkedInDetailUrl)
      .slice(0, 12);

    for (let index = 0; index < detailUrls.length; index += 1) {
      const detailUrl = detailUrls[index];
      setProfileImportStatus("", `Reading LinkedIn details ${index + 1}/${detailUrls.length} — posts remain excluded…`);
      try {
        await chrome.tabs.update(tab.id, { url: detailUrl, active: false });
        await waitForTabComplete(tab.id, 25000);
        const response = await sendTabMessageWithRetry(tab.id, { type: "CAPTURE_SAVED_PROFILE_CONTEXT" }, 6, 650);
        if (response?.ok && response?.context?.text) contexts.push(response.context);
      } catch (_) {
        // Keep the successfully captured main profile and continue with other visible detail links.
      }
    }

    const sections = contexts.flatMap((context) => Array.isArray(context.sections) ? context.sections : []);
    const uniqueSections = sections.filter((section, index, list) => {
      const signature = `${String(section?.heading || "").toLowerCase()}|${String(section?.text || "").slice(0, 500).toLowerCase()}`;
      return signature !== "|" && list.findIndex((candidate) => `${String(candidate?.heading || "").toLowerCase()}|${String(candidate?.text || "").slice(0, 500).toLowerCase()}` === signature) === index;
    });
    const textParts = contexts.map((context) => String(context.text || "").trim()).filter(Boolean);
    const uniqueTextParts = textParts.filter((text, index, list) => list.findIndex((candidate) => candidate.slice(0, 700) === text.slice(0, 700)) === index);
    const main = contexts[0];
    return {
      url,
      importedAt: new Date().toISOString(),
      name: main.name || "",
      headline: main.headline || "",
      summary: [main.name, main.headline, `${uniqueSections.length} profile sections`, detailUrls.length ? `${contexts.length - 1}/${detailUrls.length} detailed pages read` : "main profile read"].filter(Boolean).join(" · "),
      sections: uniqueSections.slice(0, 80),
      detailedPagesRead: Math.max(0, contexts.length - 1),
      text: uniqueTextParts.join("\n\n──────────────── LINKEDIN DETAIL PAGE ────────────────\n\n").slice(0, 60000),
      excludesPosts: true
    };
  } finally {
    if (tab?.id) await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

function isAllowedLinkedInDetailUrl(value) {
  const url = safeUrl(value);
  if (!url || !/(^|\.)linkedin\.com$/i.test(url.hostname)) return false;
  return /^\/in\/[^/]+\/details\/(experience|education|certifications|skills|projects|courses|honors|recommendations|publications|volunteering|languages|organizations|patents|test-scores|interests)\/?/i.test(url.pathname)
    && !/recent-activity|posts?|comments?/i.test(url.pathname);
}

async function importGitHubContext(url) {
  const parsed = safeUrl(url);
  const username = githubUsername(parsed);
  if (!username) throw new Error("Could not identify the GitHub username.");
  const headers = { Accept: "application/vnd.github+json" };
  const [profileResponse, reposResponse] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`, { headers })
  ]);
  if (!profileResponse.ok) throw new Error(`GitHub profile request failed (${profileResponse.status}).`);
  if (!reposResponse.ok) throw new Error(`GitHub projects request failed (${reposResponse.status}).`);
  const profile = await profileResponse.json();
  const repositories = (await reposResponse.json())
    .filter((repo) => !repo.archived)
    .slice(0, 100)
    .map((repo) => ({
      name: repo.name || "",
      description: repo.description || "No description provided",
      url: repo.html_url || "",
      homepage: repo.homepage || "",
      language: repo.language || "",
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      stars: Number(repo.stargazers_count || 0),
      forks: Number(repo.forks_count || 0),
      fork: Boolean(repo.fork),
      updatedAt: repo.updated_at || ""
    }));
  const ownProjects = repositories.filter((repo) => !repo.fork);
  const lines = [
    `GitHub profile: ${profile.name || profile.login || username}`,
    profile.bio ? `Bio: ${profile.bio}` : "",
    profile.company ? `Company: ${profile.company}` : "",
    profile.location ? `Location: ${profile.location}` : "",
    profile.blog ? `Website: ${profile.blog}` : "",
    `Public repositories: ${profile.public_repos ?? repositories.length}`,
    "",
    "PROJECTS AND REPOSITORIES",
    ...ownProjects.map((repo) => [
      `Project: ${repo.name}`,
      `Description: ${repo.description}`,
      repo.language ? `Primary language: ${repo.language}` : "",
      repo.topics.length ? `Topics: ${repo.topics.join(", ")}` : "",
      repo.homepage ? `Live/demo: ${repo.homepage}` : "",
      repo.url ? `Repository: ${repo.url}` : "",
      `Stars: ${repo.stars}; Forks: ${repo.forks}`
    ].filter(Boolean).join("\n"))
  ].filter(Boolean);
  const described = ownProjects.filter((repo) => repo.description && repo.description !== "No description provided").length;
  return {
    url,
    importedAt: new Date().toISOString(),
    username,
    name: profile.name || profile.login || username,
    repositories: ownProjects,
    summary: `${ownProjects.length} projects saved · ${described} with descriptions`,
    text: lines.join("\n\n").slice(0, 60000)
  };
}

async function importPortfolioContext(url) {
  const parsed = safeUrl(url);
  const originPattern = `${parsed.origin}/*`;
  const allowed = await chrome.permissions.contains({ origins: [originPattern] });
  if (!allowed) throw new Error("Website permission was not granted.");
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForTabComplete(tab.id, 25000);
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractPortfolioPageContext });
    if (!result?.text || result.text.length < 40) throw new Error("The portfolio did not expose enough readable public text.");
    return {
      url,
      importedAt: new Date().toISOString(),
      title: result.title || "Portfolio",
      description: result.description || "",
      sections: result.sections || [],
      summary: `${result.sections?.length || 0} sections · ${result.text.length.toLocaleString()} characters saved`,
      text: String(result.text).slice(0, 60000)
    };
  } finally {
    if (tab?.id) await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function waitForTabComplete(tabId, timeoutMs = 20000) {
  const existing = await chrome.tabs.get(tabId);
  if (existing.status === "complete") return existing;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("The page took too long to load."));
    }, timeoutMs);
    const listener = (updatedId, changeInfo, tab) => {
      if (updatedId !== tabId || changeInfo.status !== "complete") return;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(tab);
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendTabMessageWithRetry(tabId, message, attempts = 6, delayMs = 500) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError || new Error("The page reader did not start.");
}

async function extractPortfolioPageContext() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const originalY = window.scrollY;
  const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  for (let step = 1; step <= 6; step += 1) {
    window.scrollTo(0, Math.round((height * step) / 6));
    await sleep(180);
  }
  window.scrollTo(0, originalY);
  await sleep(100);

  const root = document.querySelector("main") || document.querySelector('[role="main"]') || document.body;
  const clone = root.cloneNode(true);
  clone.querySelectorAll("script, style, noscript, svg, canvas, iframe, form, nav, header, footer, dialog, [aria-hidden='true'], [hidden]").forEach((node) => node.remove());
  const clean = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
  const title = clean(document.querySelector("h1")?.innerText || document.title);
  const description = clean(document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || "");
  const sections = [...root.querySelectorAll("section, article")].map((section) => {
    const heading = clean(section.querySelector("h1, h2, h3")?.innerText);
    const text = clean(section.innerText).slice(0, 7000);
    return heading && text.length > heading.length + 20 ? { heading, text } : null;
  }).filter(Boolean).filter((section, index, array) => array.findIndex((item) => item.heading === section.heading && item.text === section.text) === index).slice(0, 30);
  const bodyText = clean(clone.innerText).slice(0, 50000);
  const projectSections = sections.filter((section) => /project|work|case stud|portfolio|experience/i.test(section.heading));
  const text = clean([
    title ? `Portfolio: ${title}` : "",
    description ? `Description: ${description}` : "",
    projectSections.length ? `PROJECT / WORK SECTIONS\n${projectSections.map((section) => `${section.heading}\n${section.text}`).join("\n\n")}` : "",
    `FULL PUBLIC PORTFOLIO TEXT\n${bodyText}`
  ].filter(Boolean).join("\n\n"));
  return { title, description, sections, text };
}

async function clearProfileContext() {
  savedProfileContext = createEmptyProfileContext();
  await chrome.storage.local.remove("profileContext");
  renderProfileContextState();
  setProfileImportStatus("success", "Saved LinkedIn, GitHub, and portfolio context was cleared.");
  setSaveStatus("", "Links remain in the form. Import again whenever you want fresh context.");
}

function setSourceLoading(key, loading) {
  const card = elements[`${key}ContextCard`];
  const state = elements[`${key}ContextState`];
  card?.classList.toggle("loading", loading);
  if (loading && state) {
    state.className = "source-state loading";
    state.textContent = "Reading…";
  }
}

function setProfileImportStatus(kind, text) {
  elements.profileImportStatus.className = `context-action-status ${kind || ""}`;
  elements.profileImportStatus.textContent = text;
}

function initialiseSettingsNavigation() {
  const links = [...document.querySelectorAll(".sidebar a[href^='#']")];
  const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-18% 0px -66% 0px", threshold: [0.05, 0.25, 0.5] });
  sections.forEach((section) => observer.observe(section));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function normalizeApiAccessMode(value) {
  return value === "manual" ? "manual" : "official";
}

function selectedApiAccessMode() {
  return document.querySelector('input[name="apiAccessMode"]:checked')?.value === "manual" ? "manual" : "official";
}

function detectApiProvider(value) {
  const key = sanitizeKeyForStorage(value);
  if (/^gsk_/i.test(key)) return "groq";
  if (/^sk-or-/i.test(key)) return "openrouter";
  return "";
}

function migrateManualApiKey(settings) {
  return sanitizeKeyForStorage(settings?.manualApiKey || settings?.groqApiKey || settings?.openRouterApiKey || "");
}

function updateApiModeVisibility() {
  const manual = selectedApiAccessMode() === "manual";
  elements.manualApiSettings.classList.toggle("hidden", !manual);
  updateManualApiDetection();
}

function updateManualApiDetection({ selectProvider = false } = {}) {
  const manual = selectedApiAccessMode() === "manual";
  const provider = detectApiProvider(elements.manualApiKey.value);
  elements.manualApiDetected.classList.remove("manual", "invalid");
  if (!manual) {
    elements.manualApiDetected.textContent = "Official keys";
    return;
  }
  if (provider) {
    const label = provider === "groq" ? "My Groq key" : "My OpenRouter key";
    elements.manualApiDetected.textContent = label;
    elements.manualApiDetected.classList.add("manual");
    if (selectProvider) {
      const radio = document.querySelector(`input[name="provider"][value="${provider}"]`);
      if (radio) {
        radio.checked = true;
        updateProviderVisibility(provider);
      }
    }
  } else {
    elements.manualApiDetected.textContent = elements.manualApiKey.value.trim() ? "Key not recognised" : "Add your key";
    elements.manualApiDetected.classList.add("invalid");
  }
}

function selectedProvider() {
  return document.querySelector('input[name="provider"]:checked')?.value || "ollama";
}

function updateProviderVisibility(provider) {
  elements.ollamaSettings.classList.toggle("hidden", provider !== "ollama");
  elements.openrouterSettings.classList.toggle("hidden", provider !== "openrouter");
  elements.groqSettings.classList.toggle("hidden", provider !== "groq");
}

function collectSettings() {
  return {
    provider: selectedProvider(),
    senderName: elements.senderName.value.trim(),
    professionalHeadline: elements.professionalHeadline.value.trim(),
    targetRoles: elements.targetRoles.value.trim(),
    profileLocation: elements.profileLocation.value.trim(),
    contactEmail: elements.contactEmail.value.trim(),
    contactPhone: elements.contactPhone.value.trim(),
    experienceLevel: elements.experienceLevel.value,
    workPreference: elements.workPreference.value,
    availability: elements.availability.value.trim(),
    coreSkills: elements.coreSkills.value.trim(),
    preferredIndustries: elements.preferredIndustries.value.trim(),
    outreachGoal: elements.outreachGoal.value,
    customBio: elements.customBio.value.trim(),
    linkedinUrl: normalizeOptionalUrl(elements.linkedinUrl.value),
    githubUrl: normalizeOptionalUrl(elements.githubUrl.value),
    portfolioUrl: normalizeOptionalUrl(elements.portfolioUrl.value),
    ollamaEndpoint: normalizeOllamaEndpoint(elements.ollamaEndpoint.value),
    ollamaModel: elements.ollamaModel.value.trim(),
    ollamaKeepAlive: storedSettings.ollamaKeepAlive || "-1",
    apiAccessMode: selectedApiAccessMode(),
    manualApiKey: sanitizeKeyForStorage(elements.manualApiKey.value),
    manualApiProvider: detectApiProvider(elements.manualApiKey.value),
    openRouterApiKey: "",
    openRouterModel: elements.openRouterModel.value.trim(),
    groqApiKey: "",
    groqModel: elements.groqModel.value.trim(),
    schemaVersion: 23,
    generationMode: ["dms", "comments", "conversation"].includes(storedSettings.generationMode) ? storedSettings.generationMode : "dms",
    defaultTone: elements.defaultTone.value,
    defaultLength: elements.defaultLength.value,
    autoGenerate: elements.autoGenerate.checked,
    hoverDelay: 850,
    matchThreshold: Number(elements.matchThreshold.value)
  };
}

async function saveAll() {
  const settings = collectSettings();
  const resumeText = window.IceBreakerParsers.cleanResumeText(elements.resumeText.value).slice(0, 100000);
  savedProfileContext = reconcileProfileContextWithSettings(savedProfileContext, settings);

  if (!settings.senderName) {
    setSaveStatus("error", "Add your name before saving.");
    elements.senderName.focus();
    return;
  }
  if (!settings.targetRoles) {
    setSaveStatus("error", "Add at least one target role before saving.");
    elements.targetRoles.focus();
    return;
  }
  if (settings.apiAccessMode === "manual" && settings.provider !== "ollama" && !settings.manualApiProvider) {
    setSaveStatus("error", "Add a valid Groq (gsk_) or OpenRouter (sk-or-) API key for Manual API mode.");
    elements.manualApiKey.focus();
    return;
  }
  if (settings.apiAccessMode === "manual" && settings.provider !== "ollama" && settings.manualApiProvider !== settings.provider) {
    setSaveStatus("error", `This key belongs to ${settings.manualApiProvider === "groq" ? "Groq" : "OpenRouter"}. Select the matching provider.`);
    return;
  }

  elements.saveButton.disabled = true;
  setSaveStatus("", "Saving résumé, provider, and API source locally…");

  try {
    if (resumeText) {
      const derived = deriveCandidateInfo(resumeText);
      currentResumeMeta = {
        ...(currentResumeMeta || {}),
        fileName: currentResumeMeta?.fileName || "Legacy résumé context",
        uploadedAt: currentResumeMeta?.uploadedAt || new Date().toISOString(),
        savedAt: new Date().toISOString(),
        characters: resumeText.length,
        originalFileStored: Boolean(currentResumeFileRecord?.blob || currentResumeMeta?.originalFileStored),
        derived
      };
      await chrome.storage.local.set({ settings, resumeText, resumeMeta: currentResumeMeta, profileContext: savedProfileContext });
      resumeRemoved = false;
    } else {
      await chrome.storage.local.set({ settings, profileContext: savedProfileContext });
      await chrome.storage.local.remove(["resumeText", "resumeMeta"]);
      currentResumeMeta = null;
      resumeRemoved = true;
    }

    storedSettings = settings;
    await chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED" }).catch(() => {});
    setSaveStatus("success", "Saved locally. DMs now use your structured profile, hidden résumé context, and imported sources together.");
    renderResumeState();
    renderProfileContextState();
    renderCandidatePreview();
    renderProfileCompleteness();
  } catch (error) {
    setSaveStatus("error", error.message || "Could not save settings.");
  } finally {
    elements.saveButton.disabled = false;
  }
}

async function loadOllamaModels({ silent = false } = {}) {
  if (!elements.ollamaEndpoint.value.trim()) return;

  await saveProviderFieldsOnly();
  elements.loadOllamaModels.disabled = true;
  elements.loadOllamaModels.textContent = "Detecting…";
  if (!silent) setProviderTestStatus("", "Detecting installed Ollama models…");

  try {
    const response = await chrome.runtime.sendMessage({ type: "LIST_OLLAMA_MODELS" });
    if (!response?.ok) throw new Error(response?.error || "Could not list Ollama models.");

    const models = Array.isArray(response.models) ? response.models : [];
    const preferred = elements.ollamaModel.value || storedSettings.ollamaModel || "";
    const chosen = chooseModel(models, preferred);
    renderOllamaModelOptions(models, chosen);

    if (chosen) {
      elements.ollamaModel.value = chosen;
      await saveProviderFieldsOnly();
    }

    setProviderTestStatus(
      models.length ? "success" : "",
      models.length
        ? `Detected ${models.length} installed model${models.length === 1 ? "" : "s"}. Selected: ${chosen}.`
        : "Ollama is running, but no installed models were found. Run: ollama pull llama3.2"
    );
  } catch (error) {
    renderOllamaModelOptions([], elements.ollamaModel.value || storedSettings.ollamaModel);
    setProviderTestStatus("error", error.message || "Could not reach Ollama.");
  } finally {
    elements.loadOllamaModels.disabled = false;
    elements.loadOllamaModels.textContent = "Refresh models";
  }
}

function chooseModel(models, preferred) {
  if (!models.length) return "";
  const exact = models.find((model) => model.name === preferred);
  if (exact) return exact.name;
  const base = preferred ? preferred.split(":")[0] : "";
  const baseMatch = base ? models.find((model) => model.name.split(":")[0] === base) : null;
  return baseMatch?.name || models[0].name;
}

function renderOllamaModelOptions(models, selected) {
  elements.ollamaModel.innerHTML = "";

  if (!models.length) {
    const option = document.createElement("option");
    option.value = selected || "";
    option.textContent = selected ? `${selected} (not currently detected)` : "No installed models detected";
    elements.ollamaModel.appendChild(option);
    return;
  }

  for (const model of models) {
    const option = document.createElement("option");
    option.value = model.name;
    const details = [model.parameterSize, model.quantization, model.size ? formatBytes(model.size) : ""].filter(Boolean);
    option.textContent = details.length ? `${model.name} · ${details.join(" · ")}` : model.name;
    option.selected = model.name === selected;
    elements.ollamaModel.appendChild(option);
  }
}

async function testProvider() {
  await saveProviderFieldsOnly();
  elements.testProviderButton.disabled = true;
  elements.testProviderButton.textContent = "Testing…";
  setProviderTestStatus("", "Sending a small test request…");

  try {
    const response = await chrome.runtime.sendMessage({ type: "TEST_PROVIDER" });
    if (!response?.ok) throw new Error(response?.error || "Connection test failed.");
    setProviderTestStatus("success", `Connected. ${String(response.result || "").slice(0, 90)} ${selectedApiAccessMode() === "manual" ? "Your manual API key is active." : "The official rotating key pool is active."}`);

    if (selectedProvider() === "ollama") {
      await loadOllamaModels({ silent: true });
    }
  } catch (error) {
    setProviderTestStatus("error", error.message || "Connection test failed.");
  } finally {
    elements.testProviderButton.disabled = false;
    elements.testProviderButton.textContent = "Test connection";
  }
}

async function saveProviderFieldsOnly() {
  const existing = await chrome.storage.local.get("settings");
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(existing.settings || {}),
    ...collectSettings(),
    schemaVersion: 23,
    autoGenerate: elements.autoGenerate.checked
  };
  storedSettings = settings;
  await chrome.storage.local.set({ settings });
}

function sanitizeKeyForStorage(value) {
  return String(value || "")
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
}

function setParseStatus(kind, text) {
  elements.parseStatus.className = `inline-status ${kind || ""}`;
  elements.parseStatus.textContent = text;
  elements.parseStatus.classList.toggle("hidden", !text);
}

function setProviderTestStatus(kind, text) {
  elements.providerTestStatus.className = kind || "";
  elements.providerTestStatus.textContent = text;
}

function setSaveStatus(kind, text) {
  elements.saveStatus.className = kind || "";
  elements.saveStatus.textContent = text;
}

function markUnsaved() {
  setSaveStatus("", "You have unsaved changes.");
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

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
