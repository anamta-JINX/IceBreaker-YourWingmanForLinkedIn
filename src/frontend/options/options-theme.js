(() => {
  "use strict";
  const STYLE_ID = "icebreaker-options-reference-theme";
  const CSS_TEXT = `
:root {
  --ib-blue: #075f9f;
  --ib-blue-dark: #064e82;
  --ib-blue-soft: #e8f2fa;
  --ib-purple: #7156c6;
  --ib-purple-soft: #f0edfb;
  --ib-teal: #0f7c76;
  --ib-teal-soft: #e8f5f3;
  --ib-ink: #1d232d;
  --ib-muted: #66707e;
  --ib-line: #dfe3ea;
  --ib-page: #f8f8ff;
  --ib-card: #ffffff;
  --ib-danger: #ba2f3d;
  --ib-warning: #e9a51a;
  --ib-shadow: 0 3px 12px rgba(25, 34, 51, .07);
  --sidebar-width: 232px;
  --topbar-height: 64px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
html, body, #react-root { width: 100%; min-height: 100%; margin: 0; }
body {
  color: var(--ib-ink);
  background: var(--ib-page);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}
button, input, textarea, select { font: inherit; }
a { color: inherit; }
.hidden { display: none !important; }
.visually-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important; }

.topbar {
  height: var(--topbar-height);
  z-index: 100;
  border-bottom: 1px solid #cfd5de;
  background: rgba(255,255,255,.98);
  backdrop-filter: blur(14px);
}
.topbar-inner { height: 100%; padding: 0 18px; }
.brand { gap: 9px; min-width: 0; }
.brand img { width: 24px; height: 24px; border-radius: 5px; }
.brand-name { color: var(--ib-blue-dark); font-size: 18px; font-weight: 800; letter-spacing: -.35px; }
.topbar-divider { width: 1px; height: 20px; margin: 0 2px; background: #d8dce3; }
.save-status { gap: 6px; color: #3d454f; font-size: 11px; }
.save-status::before { content: "✓"; width: 16px; height: 16px; display: grid; place-items: center; border: 1px solid #6e7782; border-radius: 50%; color: #4f5964; font-size: 10px; }
.topbar-actions { gap: 12px; }
#saveButton { min-width: 112px; height: 38px; border-radius: 8px; border-color: var(--ib-blue); background: var(--ib-blue); font-size: 12px; font-weight: 750; box-shadow: 0 3px 9px rgba(7,95,159,.18); }
#saveButton:hover { border-color: var(--ib-blue-dark); background: var(--ib-blue-dark); }
.topbar-user { width: 34px; height: 34px; place-items: center; border-radius: 50%; color: #fff; background: var(--ib-blue); font-size: 16px; }

.layout { min-height: calc(100vh - var(--topbar-height)); display: grid; grid-template-columns: var(--sidebar-width) minmax(0,1fr); }
.sidebar {
  top: var(--topbar-height);
  align-self: start;
  height: calc(100vh - var(--topbar-height));
  padding: 18px 10px 14px;
  border-right: 1px solid #cfd5de;
  background: #fff;
  z-index: 50;
}
.sidebar-title { padding: 2px 12px 10px; color: #4c5561; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
.sidebar-nav { gap: 3px; }
.sidebar a { min-height: 43px; display: flex; align-items: center; gap: 11px; padding: 0 13px; border-radius: 8px; color: #282f39; font-size: 12px; font-weight: 550; text-decoration: none; }
.sidebar a:hover { color: var(--ib-blue); background: #f1f6fa; }
.sidebar a.active { color: #fff; background: linear-gradient(135deg, #0a72bd, var(--ib-blue)); box-shadow: 0 3px 9px rgba(7,95,159,.18); }
.sidebar-icon { width: 19px; display: grid; place-items: center; color: #4f5865; font-size: 16px; }
.sidebar a.active .sidebar-icon { color: #fff; }
.sidebar-completion { padding: 12px 4px 0; color: #444d58; font-size: 10px; }
.sidebar-progress { height: 5px; margin-top: 7px; overflow: hidden; border-radius: 99px; background: #e7e9ee; }
.sidebar-progress span { display: block; width: 90%; height: 100%; background: var(--ib-blue); }

.content { width: min(1020px, calc(100% - 40px)); margin: 0 auto; padding: 22px 0 80px; }
.content > section { display: none !important; }
.content > section:target { display: block !important; }
body:not(:has(.content > section:target)) #profile { display: block !important; }
.section-card { scroll-margin-top: 84px; margin: 0 0 34px; border: 0; border-radius: 14px; background: transparent; box-shadow: none; }
.section-heading { margin: 0 0 18px; }
.section-heading h2, .privacy-card h2 { margin: 3px 0 6px; color: var(--ib-ink); font-size: 22px; font-weight: 800; letter-spacing: -.35px; }
.section-heading p, .privacy-card p { max-width: 720px; margin: 0; color: var(--ib-muted); font-size: 12px; line-height: 1.45; }
.eyebrow { display: block; color: var(--ib-blue); font-size: 10px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; }

.settings-subsection, .ap-panel, .privacy-data-card, .provider-settings, .api-source-block {
  border: 1px solid #dfe3e9;
  border-radius: 13px;
  background: #fff;
  box-shadow: var(--ib-shadow);
}
.settings-subsection { margin-bottom: 22px; padding: 18px; }
.subsection-heading { margin-bottom: 17px; }
.subsection-heading > div:first-child { display: flex; gap: 11px; align-items: flex-start; }
.subsection-heading h2 { margin: 2px 0 3px; font-size: 14px; font-weight: 800; }
.subsection-heading p { max-width: 700px; margin: 0; color: var(--ib-muted); font-size: 10px; }
.step-number { width: 29px; height: 29px; place-items: center; border-radius: 50%; background: var(--ib-blue); font-size: 10px; font-weight: 800; }
.status-pill, .mini-security-badge, .source-state { padding: 5px 9px; border-radius: 999px; color: #506071; background: #eaf2f8; font-size: 9px; font-weight: 700; }

/* Profile page */
#profile { padding: 0 !important; }
#profile .profile-hero { display: none !important; }
.resume-first-panel .subsection-heading h2::before { content: "01  "; color: var(--ib-blue); }
.basic-profile-panel .subsection-heading h2::before { content: "02  "; color: var(--ib-blue); }
.connected-profile-panel .subsection-heading h2::before { content: "03  "; color: var(--ib-blue); }
.dropzone { min-height: 88px; grid-template-columns: 58px minmax(0,1fr) auto; gap: 14px; padding: 12px; border: 1px dashed #b9c8d6; border-radius: 10px; background: #fbfdff; }
.dropzone:hover { border-color: var(--ib-blue); background: #f4f9fd; }
.drop-icon, .resume-file-icon { place-items: center; border-radius: 8px; background: var(--ib-blue); font-weight: 800; }
.drop-icon { width: 52px; height: 56px; }
.dropzone strong { display: block; font-size: 12px; }
.dropzone span { display: block; margin-top: 4px; color: var(--ib-muted); font-size: 10px; }
.primary-button, .outline-button { min-height: 36px; padding: 7px 14px; border-radius: 8px !important; font-size: 11px; font-weight: 700; }
.primary-button { border-color: var(--ib-blue); background: var(--ib-blue); }
.outline-button { color: var(--ib-blue); border-color: #b7cfe1; }
.resume-file-card { grid-template-columns: 58px minmax(0,1fr) auto; padding: 12px; border-color: #dfe3e9; border-radius: 10px; box-shadow: none; }
.resume-file-icon { width: 52px; height: 58px; }
.resume-file-icon small { font-size: 7px; }
.resume-file-copy p { margin: 4px 0; color: var(--ib-muted); font-size: 10px; }
.resume-file-actions { gap: 7px; }
.profile-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
.profile-grid-wide { grid-template-columns: repeat(2, minmax(0,1fr)); }
.field-label { margin-bottom: 5px; color: #3d4652; font-size: 10px; font-weight: 650; }
.form-control, .form-select, textarea.form-control {
  min-height: 38px;
  border: 1px solid #d6dae3;
  border-radius: 7px;
  color: #26303c;
  background-color: #f1f2fb;
  font-size: 11px;
  box-shadow: none;
}
.form-control:focus, .form-select:focus { border-color: #8bb9d9; background-color: #fff; box-shadow: 0 0 0 3px rgba(7,95,159,.10); }
textarea.form-control { min-height: 72px; resize: vertical; }
.field-help { margin: 5px 0 0; color: var(--ib-muted); font-size: 9px; }
.connected-links-grid { gap: 10px; }
.link-source-card { grid-template-columns: 42px minmax(0,1fr) auto; gap: 12px; padding: 11px; border: 1px solid #dfe3e9; border-radius: 10px; box-shadow: none; }
.source-icon { width: 36px; height: 36px; place-items: center; border-radius: 7px; background: var(--ib-blue); font-size: 11px; font-weight: 800; }
.github-link-card .source-icon { background: #24272d; }
.portfolio-link-card .source-icon { background: var(--ib-teal); }
.link-source-copy strong, .link-source-copy small { display: none; }
.link-source-copy input { min-height: 34px; border: 0; background: transparent; }
.context-actions { gap: 9px; margin-top: 13px; }
.project-match-note, .context-summary-grid, .saved-context-review { display: none !important; }
.candidate-card { min-height: 92px; gap: 13px; padding: 15px; border: 0; border-radius: 12px; color: #fff; background: linear-gradient(135deg, #075f9f, #087fc9); box-shadow: 0 7px 18px rgba(7,95,159,.18); }
.candidate-avatar { width: 55px; height: 55px; place-items: center; background: #fff; color: var(--ib-blue); }
.candidate-card .eyebrow { color: #cfeaff; }
.candidate-card h2 { margin: 1px 0; font-size: 16px; }
.candidate-card p { display: inline; margin-right: 8px; color: #e5f3ff; font-size: 10px; }
.candidate-source-chips { gap: 5px; }

/* AI provider page */
#ai { display: grid; grid-template-columns: 1.08fr .92fr; gap: 18px; padding: 0 !important; }
#ai > .section-heading {
  grid-column: 1 / -1;
  min-height: 176px;
  align-items: center !important;
  padding: 28px 30px;
  overflow: hidden;
  border-radius: 14px;
  color: #fff;
  background: radial-gradient(circle at 78% 50%, rgba(255,255,255,.20) 0 22%, transparent 22.4%), linear-gradient(135deg, #075f9f, #0a4b91);
  box-shadow: 0 6px 16px rgba(7,95,159,.18);
}
#ai > .section-heading .eyebrow { color: #dceeff; }
#ai > .section-heading h2 { color: #fff; font-size: 25px; font-weight: 600; }
#ai > .section-heading p { color: #dceaf5; font-size: 13px; }
.api-source-block { grid-column: 1; padding: 18px; }
.api-source-heading strong { display: block; font-size: 14px; }
.api-source-heading span { color: var(--ib-muted); font-size: 10px; }
.api-mode-control { grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.api-mode-control label { min-height: 100px; display: flex; gap: 10px; padding: 14px; border: 1px solid #d8dde6; border-radius: 9px; background: #fff; cursor: pointer; }
.api-mode-control label:has(input:checked) { border: 2px solid var(--ib-blue); background: #f1f7fb; }
.api-mode-control strong, .api-mode-control small { display: block; }
.api-mode-control small { margin-top: 6px; color: var(--ib-muted); font-size: 10px; }
.manual-api-settings { margin-top: 13px; }
.provider-cards { grid-column: 1; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
.provider-card { min-height: 60px; gap: 8px; padding: 9px; border: 1px solid #dfe3e9; border-radius: 8px; box-shadow: none; cursor: pointer; }
.provider-card:has(input:checked) { border-color: var(--ib-blue); background: #f1f7fb; }
.provider-logo { width: 28px; height: 28px; display: grid; place-items: center; overflow: hidden; border-radius: 6px; }
.provider-logo img { width: 23px; height: 23px; object-fit: contain; }
.provider-card strong, .provider-card small { display: block; }
.provider-card strong { font-size: 11px; }
.provider-card small { color: var(--ib-muted); font-size: 8px; }
.provider-settings { grid-column: 1; padding: 16px !important; }
#ai .test-row { grid-column: 1; gap: 10px; }
#ai::after {
  content: "MESSAGE PREFERENCES\A\A Standard Tone\A Professional & Warm\A\A Target Length\A Medium (2-3 sent.)\A\A Generate automatically   ON\A\A Global Shortcut   Alt + C\A\A Minimum résumé match   45%\A\A LOGIC PREVIEW";
  grid-column: 2;
  grid-row: 2 / span 4;
  min-height: 465px;
  padding: 22px;
  white-space: pre-line;
  border: 1px solid #dfe3e9;
  border-radius: 13px;
  color: #343c47;
  background: linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg,#edf4fa,#f5f2ff) border-box;
  box-shadow: var(--ib-shadow);
  font-size: 12px;
  line-height: 1.65;
}

/* Message preferences */
#preferences { max-width: 920px; padding: 0 !important; border: 1px solid #d9dde5; border-radius: 13px; background: #fff; box-shadow: var(--ib-shadow); }
#preferences > .section-heading { padding: 24px 28px 18px; border-bottom: 1px solid var(--ib-line); }
#preferences > .profile-grid { padding: 18px 28px; }
#preferences .switch-row, #preferences .shortcut-setting-row, #preferences .range-row { padding: 16px 28px; border-top: 1px solid var(--ib-line); }
#preferences .switch-row strong, #preferences .shortcut-setting-row strong, #preferences .range-row strong { display: block; font-size: 12px; }
#preferences .switch-row small, #preferences .shortcut-setting-row small, #preferences .range-row small { display: block; margin-top: 3px; color: var(--ib-muted); font-size: 10px; }
#preferences .form-select { min-height: 50px; background-color: #fff; }
.switch { width: 36px; height: 20px; border-radius: 999px; background: #c7ccd6; }
.switch::after { content: ""; position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: .15s; }
.switch-row > input { position: absolute; opacity: 0; }
.switch-row > input:checked + .switch { background: var(--ib-blue); }
.switch-row > input:checked + .switch::after { transform: translateX(16px); }
.shortcut-setting-row kbd { padding: 6px 9px; border: 1px solid #d7dbe3; border-radius: 6px; color: #4d5561; background: #f0f1f6; font-size: 10px; }
.shortcut-help { padding: 0 28px 12px; }
.range-control { width: 42%; gap: 12px; }
#matchThresholdValue { padding: 5px 8px; border-radius: 6px; color: #fff; background: #202630; font-size: 10px; }

/* Autopilot dashboard */
#autopilot { padding: 0 !important; }
.autopilot-page-heading { min-height: 130px; padding: 25px; border: 1px solid #e1e4eb; border-radius: 13px; background: linear-gradient(135deg, #f2f4ff, #f8fbff); box-shadow: var(--ib-shadow); }
.autopilot-page-heading h2 { font-size: 21px; }
.ap-safety-banner { margin: -1px 20px 20px; padding: 13px 16px; border: 0; border-left: 4px solid #f0b325; border-radius: 0; color: #654f17 !important; background: #fff8df; }
.ap-safety-banner strong { margin-right: 9px; }
.ap-page-grid { display: flex !important; flex-direction: column; }
.ap-run-panel { order: -1; color: #fff; background: #1d2229; border-color: #1d2229; }
.ap-panel { padding: 18px; }
.ap-run-panel h3, .ap-run-panel .eyebrow { color: #fff; }
.ap-run-panel .ap-run-action { float: right; width: auto; margin-top: -44px; padding: 9px 15px; border-radius: 7px; color: #fff; background: var(--ib-blue); font-size: 11px; }
.ap-progress-track { height: 5px; margin: 20px 0 16px; background: #333941; }
.ap-progress-track span { display: block; height: 100%; background: var(--ib-blue); }
.ap-stat-grid { grid-template-columns: repeat(6, minmax(0,1fr)); }
.ap-stat-grid div { padding: 10px 0; border-right: 1px solid #343a42; }
.ap-stat-grid div:last-child { border-right: 0; }
.ap-stat-grid strong, .ap-stat-grid span { display: block; }
.ap-stat-grid strong { font-size: 18px; }
.ap-stat-grid span { color: #9fa7b2; font-size: 9px; }
.ap-fixed-targets, .ap-check-row { gap: 7px; }
.ap-fixed-targets span { padding: 5px 8px; border-radius: 999px; color: var(--ib-blue); background: var(--ib-blue-soft); font-size: 9px; }
.ap-check-row label { display: flex; gap: 8px; padding: 7px 0; color: #434c58; font-size: 10px; }
.ap-panel-actions { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ib-line); }
.ap-resume-heading, .ap-data-heading { margin: 20px 0 10px; padding: 16px; border: 1px solid #e0e3e9; border-radius: 10px; background: #fff; }
.ap-resume-heading h3, .ap-data-heading h3 { margin: 2px 0; font-size: 13px; }
.ap-draft-list, .ap-activity-list, .ap-code-reference { gap: 8px; }
.ap-code-reference { grid-template-columns: repeat(4, minmax(0,1fr)); padding: 16px; border-radius: 10px; background: #f1f4ff; }

/* Privacy */
#privacy { padding: 0 !important; }
.privacy-hero { padding: 24px 28px 8px; border: 1px solid #e1e4ea; border-bottom: 0; border-radius: 13px 13px 0 0; background: linear-gradient(135deg, #f4f8fc, #fff); }
.privacy-grid { grid-template-columns: 1fr 1fr; border: 1px solid #e1e4ea; border-top: 0; background: #fff; }
.privacy-grid > div { min-height: 130px; padding: 20px 28px; border-top: 1px solid #eceef2; }
.privacy-grid > div:nth-child(odd) { border-right: 1px solid #eceef2; }
.privacy-grid strong, .privacy-grid > div > span:last-child { display: block; }
.privacy-grid strong { margin: 9px 0 3px; font-size: 13px; }
.privacy-grid > div > span:last-child { color: #545d69; font-size: 10px; line-height: 1.45; }
.privacy-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; color: var(--ib-blue); background: var(--ib-blue-soft); }
.privacy-icon.purple { color: var(--ib-purple); background: var(--ib-purple-soft); }
.privacy-icon.teal { color: var(--ib-teal); background: var(--ib-teal-soft); }
.privacy-provider-note { padding: 12px 28px; border: 1px solid #f2e3ae; border-top: 0; border-radius: 0 0 13px 13px; color: #8b5f06; background: #fffaf0; font-size: 10px; }
.privacy-data-card { margin-top: 22px; overflow: hidden; }
.privacy-data-head { padding: 20px 28px 14px; }
.privacy-data-head h3 { margin: 2px 0 4px; font-size: 17px; }
.privacy-data-head p { margin: 0; color: var(--ib-muted); font-size: 10px; }
.privacy-data-row { min-height: 58px; display: flex; align-items: center; justify-content: space-between; padding: 10px 28px; border-top: 1px solid #eceef2; }
.privacy-data-row strong, .privacy-data-row small { display: block; }
.privacy-data-row strong { font-size: 11px; }
.privacy-data-row small { margin-top: 2px; color: var(--ib-muted); font-size: 8px; text-transform: uppercase; letter-spacing: .05em; }
.privacy-data-row .btn { color: var(--ib-danger) !important; font-size: 10px; font-weight: 700; text-decoration: none; }
.privacy-erase-button { width: calc(100% - 56px); min-height: 52px; margin: 18px 28px; border: 1px dashed #d98a93; border-radius: 8px; color: var(--ib-danger); background: #fffafa; font-size: 11px; font-weight: 800; letter-spacing: .07em; }
.privacy-erase-button:hover { color: #fff; background: var(--ib-danger); }

/* Dynamic/runtime content */
.alert { border-radius: 9px; }
code { color: #6a4dbd; }
.password-row .reveal-button { right: 4px; top: 4px; height: 30px; border: 0; font-size: 9px; }
.inline-status { margin-top: 10px; }
.test-row { margin-top: 10px; }
.ap-last-error { margin-top: 10px; padding: 10px; border-radius: 8px; color: #a92d3b; background: #fff1f2; }

@media (max-width: 900px) {
  :root { --sidebar-width: 190px; }
  .content { width: calc(100% - 28px); }
  #ai { grid-template-columns: 1fr; }
  #ai > .section-heading, #ai > * { grid-column: 1; }
  #ai::after { display: none; }
  .profile-grid, .profile-grid-wide { grid-template-columns: 1fr; }
  .ap-stat-grid { grid-template-columns: repeat(3,1fr); }
}

@media (max-width: 680px) {
  :root { --topbar-height: 58px; }
  .topbar-inner { padding-inline: 10px; }
  .save-status, .topbar-divider { display: none; }
  .layout { display: block; }
  .sidebar { position: sticky !important; top: var(--topbar-height); width: 100%; height: auto; padding: 7px; border-right: 0; border-bottom: 1px solid #d6dbe3; overflow-x: auto; }
  .sidebar-title, .sidebar-completion { display: none; }
  .sidebar-nav { flex-direction: row !important; min-width: max-content; }
  .sidebar a { min-height: 36px; padding-inline: 10px; }
  .sidebar-icon { display: none; }
  .content { width: calc(100% - 20px); padding-top: 14px; }
  .privacy-grid { grid-template-columns: 1fr; }
  .privacy-grid > div:nth-child(odd) { border-right: 0; }
  .api-mode-control, .provider-cards { grid-template-columns: 1fr; }
  .ap-stat-grid { grid-template-columns: repeat(2,1fr); }
  .topbar-user { display: none; }
}
`;
  const target = document.head || document.documentElement;
  if (!target) return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute("data-icebreaker-theme", "options-reference");
    target.appendChild(style);
  }
  style.textContent = CSS_TEXT;
})();
