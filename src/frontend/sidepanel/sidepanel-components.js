(() => {
  "use strict";

  const h = React.createElement;

  const icon = (path, className = "") => h(
    "svg",
    { className, viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" },
    h("path", { d: path })
  );

  const modeIcon = (type) => {
    const base = {
      className: `ib-mode-icon ib-mode-icon-${type}`,
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      focusable: "false"
    };

    if (type === "dms") {
      return h(
        "svg",
        { ...base, fill: "none", stroke: "currentColor", strokeWidth: "2.15", strokeLinecap: "round", strokeLinejoin: "round" },
        h("path", { d: "M5.5 4h10A2.5 2.5 0 0 1 18 6.5v6A2.5 2.5 0 0 1 15.5 15H9l-4 3v-3.55A2.5 2.5 0 0 1 3 12V6.5A2.5 2.5 0 0 1 5.5 4ZM18 8h.75A2.25 2.25 0 0 1 21 10.25V17l-3.2-2.35" })
      );
    }

    if (type === "comments") {
      return h(
        "svg",
        { ...base, fill: "none", stroke: "currentColor", strokeWidth: "2.05", strokeLinecap: "round", strokeLinejoin: "round" },
        h("path", { d: "M5.25 4.25h13.5A2.25 2.25 0 0 1 21 6.5v8.25A2.25 2.25 0 0 1 18.75 17H9l-5 3.75V6.5a2.25 2.25 0 0 1 1.25-2.25Z" })
      );
    }

    return h(
      "svg",
      { ...base, fill: "currentColor" },
      h("path", { d: "M12 3.5a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5ZM5.2 6.15a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2Zm13.6 0a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2ZM7.15 18v-1.15c0-2.35 2.17-4.25 4.85-4.25s4.85 1.9 4.85 4.25V18h-9.7ZM1.2 18v-.85c0-1.95 1.8-3.55 4-3.55.83 0 1.6.23 2.24.62A5.45 5.45 0 0 0 5.7 18H1.2Zm21.6 0v-.85c0-1.95-1.8-3.55-4-3.55-.83 0-1.6.23-2.24.62A5.45 5.45 0 0 1 18.3 18h4.5Z" })
    );
  };

  const clickTarget = (id) => {
    const target = document.getElementById(id);
    if (target && !target.disabled) target.click();
  };

  function AppHeader() {
    return h(
      "header",
      { className: "ib-header d-flex align-items-center justify-content-between" },
      h(
        "div",
        { className: "ib-brand d-flex align-items-center" },
        h(
          "span",
          { className: "ib-logo d-grid", "aria-hidden": "true" },
          h("img", { src: "../../../assets/icons/icon128.png", alt: "" })
        ),
        h(
          "span",
          { className: "ib-brand-copy d-flex flex-column" },
          h("strong", { className: "ib-brand-name" }, "IceBreaker"),
          h("span", { className: "ib-brand-slogan" }, "Your Wingman For LinkedIn")
        )
      ),
      h(
        "div",
        { className: "ib-header-actions d-flex align-items-center" },
        h(
          "span",
          { className: "ib-ready-pill d-inline-flex align-items-center rounded-pill", title: "IceBreaker status", "aria-live": "polite" },
          h("span", { id: "statusDot", className: "status-dot rounded-circle" }),
          h("span", { id: "statusText" }, "READY")
        ),
        h(
          "button",
          { id: "settingsButton", className: "ib-icon-button btn p-0", type: "button", title: "Open settings", "aria-label": "Open settings" },
          icon("M19.4 13a7.8 7.8 0 0 0 .05-1 7.8 7.8 0 0 0-.05-1l2.1-1.65-2-3.46-2.5 1a8 8 0 0 0-1.73-1L14.9 3h-4l-.38 2.9a8 8 0 0 0-1.73 1l-2.5-1-2 3.46L6.4 11a7.8 7.8 0 0 0-.05 1 7.8 7.8 0 0 0 .05 1l-2.1 1.65 2 3.46 2.5-1a8 8 0 0 0 1.73 1l.38 2.9h4l.38-2.9a8 8 0 0 0 1.73-1l2.5 1 2-3.46L19.4 13ZM13 15.5A3.5 3.5 0 1 1 13 8a3.5 3.5 0 0 1 0 7.5Z")
        )
      )
    );
  }

  function ModeTabs() {
    const modes = [
      ["dms", "DMs"],
      ["comments", "Comments"],
      ["conversation", "Conversation"]
    ];
    return h(
      "nav",
      { className: "ib-mode-tabs", "aria-label": "Generation mode" },
      h(
        "div",
        { id: "modeControl", className: "ib-mode-control d-grid", role: "group", "aria-label": "Generation mode" },
        ...modes.map(([value, label]) => h(
          "button",
          { key: value, type: "button", "data-value": value, title: label },
          modeIcon(value),
          h("span", null, label)
        ))
      )
    );
  }

  function ProviderAndModelBar() {
    return h(
      "section",
      { className: "ib-engine-bar d-grid align-items-center", "aria-label": "AI provider and model" },
      h(
        "div",
        { className: "ib-provider-shell position-relative" },
        h(
          "div",
          { id: "providerControl", className: "ib-provider-control", role: "group", "aria-label": "AI provider" },
          h("button", { type: "button", "data-provider": "groq", title: "Use Groq" }, h("span", { className: "provider-logo" }, h("img", { src: "../../../assets/providers/provider-groq.svg", alt: "" })), h("span", null, "Groq")),
          h("button", { type: "button", "data-provider": "ollama", title: "Use Ollama" }, h("span", { className: "provider-logo" }, h("img", { src: "../../../assets/providers/provider-ollama.png", alt: "" })), h("span", null, "Ollama")),
          h("button", { type: "button", "data-provider": "openrouter", title: "Use OpenRouter" }, h("span", { className: "provider-logo" }, h("img", { src: "../../../assets/providers/provider-openrouter.png", alt: "" })), h("span", null, "OpenRouter")),
          h("button", { id: "userApiProviderButton", className: "user-api-provider", type: "button", "data-provider": "userapi", title: "Use your saved API key" }, h("span", { id: "userApiProviderLogo", className: "provider-logo" }, h("img", { id: "userApiProviderIcon", src: "../../../assets/providers/provider-groq.svg", alt: "" })), h("span", { id: "userApiProviderLabel" }, "My API"))
        ),
        h("select", { id: "providerSelect", className: "visually-hidden form-select", tabIndex: -1, "aria-hidden": "true" },
          h("option", { value: "groq" }, "Groq"),
          h("option", { value: "ollama" }, "Ollama"),
          h("option", { value: "openrouter" }, "OpenRouter"),
          h("option", { value: "userapi" }, "My API")
        )
      ),
      h(
        "label",
        { className: "ib-model-shell position-relative", htmlFor: "modelSelect" },
        h("img", { id: "modelProviderIcon", className: "ib-model-provider-icon", src: "../../../assets/providers/provider-ollama.png", alt: "" }),
        h("select", { id: "modelSelect", className: "form-select", "aria-label": "AI model", title: "Selected AI model" }, h("option", { value: "" }, "Loading models…"))
      ),
      h("button", { id: "reloadModelsButton", className: "ib-engine-action btn p-0", type: "button", title: "Reload models", "aria-label": "Reload models" }, icon("M17.65 6.35A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h8V3l-3.35 3.35Z")),
      h("button", { id: "testEngineButton", className: "ib-engine-action btn p-0", type: "button", title: "Test connection", "aria-label": "Test connection" }, icon("M9 2h6v2l-1 4.5 5.2 8.3A3.4 3.4 0 0 1 16.3 22H7.7a3.4 3.4 0 0 1-2.9-5.2L10 8.5 9 4V2Zm2.05 8-4.55 7.3c-.55.9.1 2.05 1.2 2.05h8.6c1.1 0 1.75-1.15 1.2-2.05L12.95 10h-1.9Z")),
      h("span", { id: "engineStatus", className: "visually-hidden", "aria-live": "polite" }, "READY"),
      h("span", { id: "providerBadge", className: "visually-hidden" }, "Ollama"),
      h("button", { id: "openProviderSettings", className: "hidden", type: "button", tabIndex: -1 }, "Settings"),
      h("button", { id: "copyOllamaFixButton", className: "hidden", type: "button", tabIndex: -1 }, "Copy setup")
    );
  }

  function AutopilotCard() {
    return h(
      "section",
      { id: "autopilotCard", className: "hidden", "aria-hidden": "true" },
      h(
        "div",
        { className: "ib-autopilot-top d-flex align-items-start justify-content-between" },
        h(
          "div",
          { className: "ib-autopilot-title d-flex align-items-start" },
          h("span", { className: "ib-autopilot-icon d-grid" }, icon("M12 2 9.8 7.2 4 8l4.2 4-1 5.8L12 15l4.8 2.8-1-5.8L20 8l-5.8-.8L12 2Z")),
          h("div", null,
            h("strong", null, "Autopilot"),
            h("span", { id: "autopilotStatus", className: "ib-autopilot-status d-block" }, "STOPPED")
          )
        ),
        h("span", { className: "ib-manual-badge rounded-pill" }, "MANUAL MODE")
      ),
      h("p", { id: "autopilotSupporting" }, "Automatically scan your recent DMs to generate personalized follow-ups based on lead behavior."),
      h(
        "div",
        { className: "ib-autopilot-actions d-grid" },
        h("button", { id: "autopilotStartButton", className: "btn btn-primary", type: "button", title: "Start Autopilot" }, icon("M8 5v14l11-7L8 5Z"), h("span", null, "Start Autopilot")),
        h("button", { id: "autopilotPauseButton", className: "btn btn-outline-secondary hidden", type: "button" }, "Pause"),
        h("button", { id: "autopilotStopButton", className: "btn btn-outline-danger hidden", type: "button" }, "Stop"),
        h("button", { id: "autopilotSettingsButton", className: "ib-autopilot-settings btn", type: "button", title: "Open Autopilot drafts and settings", "aria-label": "Open Autopilot drafts and settings" }, icon("M19.4 13a7.8 7.8 0 0 0 .05-1 7.8 7.8 0 0 0-.05-1l2.1-1.65-2-3.46-2.5 1a8 8 0 0 0-1.73-1L14.9 3h-4l-.38 2.9a8 8 0 0 0-1.73 1l-2.5-1-2 3.46L6.4 11a7.8 7.8 0 0 0-.05 1 7.8 7.8 0 0 0 .05 1l-2.1 1.65 2 3.46 2.5-1a8 8 0 0 0 1.73 1l.38 2.9h4l.38-2.9a8 8 0 0 0 1.73-1l2.5 1 2-3.46L19.4 13ZM13 15.5A3.5 3.5 0 1 1 13 8a3.5 3.5 0 0 1 0 7.5Z"), h("span", { className: "visually-hidden" }, "Settings"))
      ),
      h(
        "div",
        { id: "autopilotProgress", className: "ib-autopilot-progress hidden" },
        h("div", { className: "autopilot-current d-flex flex-column" },
          h("strong", { id: "autopilotCurrentProfile" }, "Waiting for a profile"),
          h("span", { id: "autopilotCurrentTitle" }),
          h("span", { id: "autopilotCurrentAction" }, "Ready"),
          h("code", { id: "autopilotErrorCode", className: "hidden" }, "—")
        ),
        h("div", { className: "autopilot-meter overflow-hidden rounded-pill" }, h("span", { id: "autopilotProgressBar" })),
        h("div", { className: "autopilot-stats d-grid" },
          h("span", null, h("strong", { id: "autopilotDrafts" }, "0"), " drafts"),
          h("span", null, h("strong", { id: "autopilotChecked" }, "0"), " checked"),
          h("span", null, h("strong", { id: "autopilotMatched" }, "0"), " matched"),
          h("span", null, h("strong", { id: "autopilotSkipped" }, "0"), " skipped"),
          h("span", null, h("strong", { id: "autopilotErrors" }, "0"), " errors")
        )
      )
    );
  }

  function StyleControls() {
    return h(
      "div",
      { className: "ib-style-controls" },
      h("div", { id: "toneControl", className: "ib-tone-control d-grid", role: "group", "aria-label": "Message vibe" },
        h("button", { type: "button", "data-value": "professional" }, "Professional"),
        h("button", { type: "button", "data-value": "neutral" }, "Casual"),
        h("button", { type: "button", "data-value": "funny" }, "Funny"),
        h("button", { type: "button", "data-value": "engaging" }, "Engaging")
      ),
      h("div", { id: "lengthControl", className: "ib-length-control d-grid", role: "group", "aria-label": "Message length" },
        h("button", { type: "button", "data-value": "short" }, "Short"),
        h("button", { type: "button", "data-value": "medium" }, "Medium"),
        h("button", { type: "button", "data-value": "long" }, "Long")
      )
    );
  }

  function ResumeNotice() {
    return h(
      "section",
      { id: "resumeNotice", className: "ib-resume-notice hidden" },
      h("div", null, h("strong", null, "Add your résumé for more relevant DMs")),
      h("button", { id: "openResumeSettings", className: "btn btn-link", type: "button" }, "Add résumé")
    );
  }

  function EmptyState() {
    return h(
      "section",
      { id: "emptyState", className: "ib-empty-wrap" },
      h(
        "div",
        { className: "ib-empty-card card text-center" },
        h(
          "div",
          { className: "ib-empty-illustration d-grid", "aria-hidden": "true" },
          h(
            "svg",
            { viewBox: "0 0 48 48", focusable: "false" },
            h("path", { d: "M18.8 15.2 13 21a5.6 5.6 0 0 0 7.9 7.9l3.1-3.1 3.1 3.1A5.6 5.6 0 0 0 35 21l-5.8-5.8a5.6 5.6 0 0 0-7.9 0L19 17.5l2.7 2.7 2.3-2.3a1.8 1.8 0 0 1 2.5 0l5.8 5.8a1.8 1.8 0 1 1-2.5 2.5L24 20.4l-5.8 5.8a1.8 1.8 0 1 1-2.5-2.5l5.8-5.8-2.7-2.7Z" })
          )
        ),
        h("strong", { id: "emptyTitle" }, "Hover a LinkedIn profile"),
        h("p", { id: "emptyDescription" }, "Point your cursor at any name in your feed or inbox to instantly draft a personalized icebreaker."),
        h("button", { id: "captureCurrentButtonEmpty", className: "btn btn-primary", type: "button" }, icon("M5 3h10l4 4v14H5V3Zm9 2H7v14h10V8h-3V5Zm-5 7h6v2H9v-2Zm0 4h6v2H9v-2Z"), h("span", { id: "captureEmptyLabel" }, "Read current page")),
        h("div", { className: "ib-shortcut-pill d-inline-flex align-items-center", "aria-label": "Keyboard shortcuts: Alt G to generate, Alt C to copy" },
          h("kbd", { id: "regenerateShortcutKey" }, "Alt + G"),
          h("span", { className: "ib-shortcut-label" }, "GENERATE"),
          h("kbd", { id: "shortcutKey", className: "ib-copy-shortcut" }, "Alt + C"),
          h("span", { id: "shortcutDescription", className: "ib-shortcut-label" }, "COPY")
        )
      ),
      h("div", { className: "ib-empty-benefits d-grid" },
        h("article", { className: "card" }, h("span", { className: "benefit-icon blue" }, "ϟ"), h("strong", null, "Instant Drafts"), h("p", null, "AI analyzes public profile data.")),
        h("article", { className: "card" }, h("span", { className: "benefit-icon purple" }, "✦"), h("strong", null, "Smart Context"), h("p", null, "Detects shared history or posts."))
      )
    );
  }

  function Workspace() {
    return h(
      "section",
      { id: "workspace", className: "ib-workspace hidden" },
      h(
        "article",
        { className: "context-card card" },
        h("div", { className: "ib-context-eyebrow d-flex align-items-center justify-content-between" },
          h("span", { id: "contextSubjectLabel" }, "Profile")
        ),
        h(
          "div",
          { className: "context-header d-grid align-items-center" },
          h("div", { id: "profileInitials", className: "profile-initials d-grid" }, "IB"),
          h("div", { className: "context-title" },
            h("a", { id: "profileName", href: "#", target: "_blank", rel: "noreferrer" }, "LinkedIn user"),
            h("a", { id: "profileMeta", className: "identity-link d-block", href: "#", target: "_blank", rel: "noreferrer" }, "linkedin.com"),
            h("span", { id: "matchChip", className: "match-chip badge rounded-pill hidden" }, "—")
          ),
          h("button", { id: "captureCurrentButton", className: "ib-capture-button btn p-0", type: "button", title: "Read current LinkedIn page", "aria-label": "Read current LinkedIn page" }, icon("M14 3h7v7h-2V6.4l-7.3 7.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z")),
          h("span", { id: "captureButtonLabel", className: "visually-hidden" }, "Read page")
        ),
        h("div", { className: "context-facts d-grid" },
          h("div", { id: "headlineFact", className: "context-fact" }, h("span", { id: "headlineLabel" }, "Role"), h("strong", { id: "profileHeadline" }, "Not available")),
          h("div", { id: "companyFact", className: "context-fact" }, h("span", { id: "companyLabel" }, "Company"), h("strong", { id: "contextCompany" }, "Not available")),
          h("div", { id: "locationFact", className: "context-fact" }, h("span", { id: "locationLabel" }, "Location"), h("strong", { id: "contextLocation" }, "Not available"))
        ),
        h("div", { className: "recent-context" },
          h("div", { className: "recent-context-header d-flex align-items-center justify-content-between" },
            h("span", { id: "recentContextLabel" }, "Visible context"),
            h("span", { id: "contextCount", className: "ib-context-chip rounded-pill" }, "Profile")
          ),
          h("div", { id: "contextBody", className: "context-body" }, "No recent context captured."),
          h("div", { id: "contextSecondaryBody", className: "context-secondary-body hidden" }),
          h(
            "div",
            { className: "ib-comment-footer d-flex align-items-center justify-content-between" },
            h(
              "span",
              { className: "ib-comment-stats d-inline-flex align-items-center", "aria-label": "Post engagement" },
              h("span", { className: "ib-comment-stat d-inline-flex align-items-center" },
                h("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" },
                  h("path", { d: "M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 0 0 0-7.8Z" })
                ),
                h("span", { id: "commentReactionCount" }, "—")
              ),
              h("span", { className: "ib-comment-stat d-inline-flex align-items-center" },
                h("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" },
                  h("path", { d: "M4 4h16v12H8l-4 4V4Z" }),
                  h("path", { d: "M8 8h8M8 12h6" })
                ),
                h("span", { id: "commentReplyCount" }, "—")
              )
            ),
            h(
              "button",
              {
                className: "ib-view-post btn btn-link",
                type: "button",
                onClick: () => {
                  const card = document.querySelector("#workspace > .context-card");
                  const url = String(card?.dataset?.postUrl || "").trim();
                  if (url && url !== "#") window.open(url, "_blank", "noopener,noreferrer");
                }
              },
              h("span", null, "View Post"),
              h("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                h("path", { d: "M14 4h6v6M20 4l-9 9" }),
                h("path", { d: "M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" })
              )
            )
          ),
          h("div", { className: "context-footer d-flex justify-content-end" }, h("button", { id: "contextToggleButton", className: "context-toggle btn btn-link hidden", type: "button", "aria-expanded": "false" }, "Show more"))
        )
      ),
      h("details", { id: "matchPanel", className: "hidden" },
        h("summary", null, h("span", { id: "matchPanelLabel" }, "Profile match"), h("strong", { id: "matchScore" }, "—")),
        h("div", { className: "match-meter overflow-hidden" }, h("span", { id: "matchBar" })),
        h("p", { id: "matchReasons" })
      )
    );
  }

  function PinnedDraft() {
    return h(
      "section",
      { id: "pinnedDraft", className: "ib-draft-card card hidden", "aria-label": "Editable generated text" },
      h("div", { className: "ib-draft-head d-flex align-items-center justify-content-between" },
        h("div", { className: "d-flex align-items-center" }, h("span", { className: "ib-spark-icon" }, "✦"), h("strong", { id: "draftTitle" }, "Message"), h("span", { id: "draftEyebrow", className: "visually-hidden" }, "Editable before copying")),
        h("button", { className: "ib-regenerate-proxy btn btn-link", type: "button", onClick: () => clickTarget("refreshButton") }, icon("M17.65 6.35A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h8V3l-3.35 3.35Z"), h("span", null, "Regenerate"))
      ),
      h(StyleControls),
      h("div", { id: "draftLoading", className: "draft-loading hidden", "aria-label": "Generating text" }, h("span"), h("span"), h("span"), h("em", null, "Working")),
      h("div", { className: "ib-editor-shell position-relative" },
        h("textarea", { className: "form-control", id: "messageEditor", "aria-label": "Generated text", placeholder: "Your generated text will appear here and remain editable." }),
        h("span", { id: "draftCharCount", className: "ib-char-hint" }, "0 chars")
      ),
      h("div", { id: "lowMatchActions", className: "low-match-actions hidden" }, "Review this lower-match draft before using it.")
    );
  }

  function ActionDock() {
    return h(
      "div",
      { className: "action-dock d-grid", role: "group", "aria-label": "Text actions" },
      h("button", { id: "refreshButton", className: "refresh-button btn btn-link", type: "button", title: "Create a new version (Alt+G)", "aria-label": "Create a new version" }, icon("M17.65 6.35A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h8V3l-3.35 3.35Z"), h("span", null, "Regenerate")),
      h("button", { id: "copyButton", className: "copy-button btn btn-primary", type: "button", title: "Copy generated text (Alt+C)", "aria-label": "Copy generated text", disabled: true }, icon("M16 1H5a2 2 0 0 0-2 2v13h2V3h11V1Zm3 4H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H9V7h10v14Z"), h("span", { id: "copyButtonLabel" }, "Copy Message")),
      h("button", { id: "stopRefreshButton", className: "stop-refresh-button btn btn-light", type: "button", title: "Stop current work and reset the draft", "aria-label": "Stop current work and refresh the panel" }, icon("M4 4v6h6L7.7 7.7A6 6 0 1 1 6 12H4a8 8 0 1 0 2.3-5.7L4 4Z"), h("span", { id: "stopRefreshButtonLabel" }, "Reset"))
    );
  }

  function SidepanelApp() {
    return h(
      "div",
      { className: "react-page-root", "data-react-page": "sidepanel" },
      h(AppHeader),
      h(ModeTabs),
      h(ProviderAndModelBar),
      h(ActionDock),
      h(AutopilotCard),
      h("main", { id: "panelScroll" }, h(ResumeNotice), h(EmptyState), h(Workspace)),
      h(PinnedDraft)
    );
  }

  window.IceBreakerSidepanel = Object.freeze({ App: SidepanelApp });
})();
