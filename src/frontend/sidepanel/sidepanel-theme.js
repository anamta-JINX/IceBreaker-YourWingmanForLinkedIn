(() => {
  "use strict";
  const STYLE_ID = "icebreaker-sidepanel-reference-theme";
  const CSS_TEXT = `
:root {
  --ib-blue: #0a66c2;
  --ib-blue-dark: #004182;
  --ib-blue-soft: #e8f3ff;
  --ib-purple: #7357c8;
  --ib-purple-soft: #f0edfb;
  --ib-teal: #0d7d76;
  --ib-teal-soft: #e6f5f3;
  --ib-ink: #1b202b;
  --ib-muted: #707886;
  --ib-line: #e4e6ed;
  --ib-page: #f8f7ff;
  --ib-card: #ffffff;
  --ib-soft: #f1f1fb;
  --ib-danger: #bd3342;
  --ib-shadow: 0 3px 10px rgba(21, 30, 48, .08);
  --ib-radius: 14px;
}

* { box-sizing: border-box; }
html, body, #react-root { width: 100%; min-width: 300px; height: 100%; margin: 0; }
body {
  overflow: hidden;
  color: var(--ib-ink);
  background: var(--ib-page);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
}
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
svg { width: 20px; height: 20px; fill: currentColor; }
.hidden { display: none !important; }
#autopilotCard { display: none !important; }
.visually-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }

.react-page-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ib-page);
}

.ib-header {
  order: 1;
  min-height: 60px;
  padding: 7px 15px;
  border-bottom: 1px solid var(--ib-line);
  background: #fff;
}
.ib-brand { gap: 9px; min-width: 0; }
.ib-logo {
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ib-blue);
  box-shadow: 0 3px 8px rgba(10, 102, 194, .22);
}
.ib-logo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.ib-brand-copy { min-width: 0; line-height: 1; }
.ib-brand-name { color: var(--ib-blue); font-size: 16.5px; font-weight: 850; letter-spacing: -.35px; }
.ib-brand-slogan { margin-top: 3px; color: #697386; font-size: 8.5px; font-weight: 650; letter-spacing: .015em; white-space: nowrap; }
.ib-header-actions { gap: 12px; }
.ib-ready-pill {
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid #dfe1ea;
  color: #343b47;
  background: #f1f0fa;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: .08em;
}
.status-dot { width: 7px; height: 7px; background: #22c76b; box-shadow: 0 0 0 2px rgba(34, 199, 107, .12); }
.ib-icon-button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  color: #444b56;
  background: transparent;
}
.ib-icon-button:hover { color: var(--ib-blue); background: var(--ib-blue-soft); border-radius: 8px; }

.ib-mode-tabs {
  order: 2;
  min-height: 60px;
  border-bottom: 1px solid var(--ib-line);
  background: #fff;
}
.ib-mode-control { height: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ib-mode-control button {
  position: relative;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px 8px;
  border: 0;
  color: #9096a2;
  background: transparent;
  font-size: 11px;
  font-weight: 650;
}
.ib-mode-control button svg { width: 19px; height: 19px; }
.ib-mode-control button:hover { color: var(--ib-blue); background: #fbfdff; }
.ib-mode-control button.active { color: var(--ib-blue); font-weight: 800; }
.ib-mode-control button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: var(--ib-blue);
}

.ib-engine-bar {
  order: 3;
  min-height: 43px;
  grid-template-columns: 132px minmax(0, 1fr) 32px 32px;
  gap: 3px;
  padding: 3px 13px;
  border-bottom: 1px solid var(--ib-line);
  background: #fff;
  box-shadow: 0 2px 5px rgba(28, 35, 49, .03);
  z-index: 20;
}
.ib-provider-shell { height: 36px; }
.ib-provider-control {
  position: absolute;
  inset: 0 auto auto 0;
  width: 130px;
  min-height: 36px;
  border-radius: 9px;
  background: #fff;
  z-index: 30;
}
.ib-provider-control button {
  width: 100%;
  min-height: 36px;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 5px 7px;
  border: 0;
  color: #313741;
  background: #fff;
  text-align: left;
  font-weight: 550;
}
.ib-provider-control button.active { display: flex; }
.ib-provider-control button.active::after {
  content: "⌄";
  margin-left: auto;
  color: #646c78;
  font-size: 15px;
}
.ib-provider-control:hover,
.ib-provider-control:focus-within { box-shadow: var(--ib-shadow); border: 1px solid var(--ib-line); overflow: hidden; }
.ib-provider-control:hover button,
.ib-provider-control:focus-within button { display: flex; }
.ib-provider-control:hover button.active::after,
.ib-provider-control:focus-within button.active::after { content: ""; }
.ib-provider-control button:hover { color: var(--ib-blue); background: var(--ib-blue-soft); }
.provider-logo {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: #f5f6f8;
}
.provider-logo img { width: 16px; height: 16px; object-fit: contain; }
.ib-model-shell { min-width: 0; }
.ib-model-shell .form-select {
  height: 36px;
  padding: 5px 27px 5px 31px;
  border: 0;
  border-radius: 8px;
  color: #353a45;
  background-color: #fff;
  font-size: 11.5px;
  box-shadow: none;
}
.ib-model-provider-icon {
  position: absolute;
  left: 7px;
  top: 9px;
  width: 17px;
  height: 17px;
  object-fit: contain;
  z-index: 2;
}
.ib-engine-action {
  width: 32px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  color: #4b525e;
  background: transparent;
  border-radius: 8px;
}
.ib-engine-action:hover { color: var(--ib-blue); background: var(--ib-blue-soft); }

.ib-autopilot-card {
  order: 4;
  margin: 2px 23px 0;
  padding: 14px;
  border: 1px solid #e6e7ee;
  border-radius: var(--ib-radius);
  background: #fff;
  box-shadow: var(--ib-shadow);
}
.ib-autopilot-top { gap: 10px; }
.ib-autopilot-title { gap: 12px; min-width: 0; }
.ib-autopilot-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 9px;
  color: var(--ib-blue);
  background: var(--ib-blue-soft);
}
.ib-autopilot-icon svg { width: 19px; height: 19px; }
.ib-autopilot-title strong { display: block; font-size: 16px; line-height: 1.05; }
.ib-autopilot-status { margin-top: 3px; color: #343a45; font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
.ib-autopilot-status::before { content: ""; display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 50%; background: #cfd4df; }
body.autopilot-running .ib-autopilot-status::before { background: #1ec66c; }
.ib-manual-badge { padding: 5px 10px; color: #555c68; background: #f0f0f8; font-size: 9px; letter-spacing: .10em; }
.ib-autopilot-card > p { margin: 10px 0 12px; color: #424953; font-size: 12px; line-height: 1.42; }
.ib-autopilot-actions { grid-template-columns: minmax(0, 1fr) 43px; gap: 10px; }
.ib-autopilot-actions > .btn { min-height: 42px; border-radius: 9px; font-size: 12px; font-weight: 750; }
#autopilotStartButton { display: flex; align-items: center; justify-content: center; gap: 8px; border-color: var(--ib-blue); background: var(--ib-blue); }
#autopilotStartButton:hover { border-color: var(--ib-blue-dark); background: var(--ib-blue-dark); }
.ib-autopilot-settings { display: grid; place-items: center; padding: 0; color: #3f4752; background: #f2f1fa; }
.ib-autopilot-settings:hover { color: var(--ib-blue); background: var(--ib-blue-soft); }
.ib-autopilot-settings svg { width: 21px; height: 21px; }
.ib-autopilot-progress { margin-top: 10px; padding: 9px; border-radius: 9px; background: #f7f9fc; }
.autopilot-meter { height: 5px; margin: 8px 0; background: #e4e8ee; }
.autopilot-meter span { display: block; height: 100%; background: var(--ib-blue); }
.autopilot-stats { grid-template-columns: repeat(5, 1fr); gap: 4px; color: var(--ib-muted); font-size: 8px; }

#panelScroll {
  order: 5;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 10px 23px 16px;
  scrollbar-width: thin;
  scrollbar-color: #d5d8e2 transparent;
}
#panelScroll::-webkit-scrollbar { width: 6px; }
#panelScroll::-webkit-scrollbar-thumb { border-radius: 6px; background: #d5d8e2; }
.ib-resume-notice { margin-bottom: 9px; padding: 8px 10px; border-radius: 9px; background: #fff6de; color: #6c5615; }
.ib-resume-notice .btn { float: right; padding: 0; color: var(--ib-blue); font-size: 11px; }

.ib-empty-wrap { min-height: 100%; padding-top: 27px; }
.ib-empty-card {
  min-height: 358px;
  padding: 38px 25px 14px;
  border: 1px solid #ececf2;
  border-radius: 16px;
  background: rgba(255, 255, 255, .9);
  box-shadow: 0 2px 8px rgba(30, 36, 52, .04);
}
.ib-empty-illustration {
  width: 86px;
  height: 86px;
  margin: 0 auto 12px;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(106, 96, 219, .13) 0 37%, rgba(106, 96, 219, .06) 38% 65%, transparent 66%);
}
.ib-empty-illustration svg { opacity: .72; }
.ib-empty-card > strong { font-size: 18px; letter-spacing: -.25px; }
.ib-empty-card > p { max-width: 320px; margin: 6px auto 15px; color: #565d69; font-size: 14px; line-height: 1.3; }
#captureCurrentButtonEmpty { min-height: 42px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px; border-radius: 9px; border-color: var(--ib-blue); background: var(--ib-blue); font-size: 13px; font-weight: 750; }
.ib-shortcut-pill { align-self: center; gap: 7px; margin-top: 20px; padding: 5px 10px; border: 1px solid #dedfe9; border-radius: 999px; color: #3b414c; background: #f2f1f9; font-size: 9.5px; font-weight: 800; white-space: nowrap; }
.ib-shortcut-pill kbd { padding: 4px 7px; border: 0; border-radius: 5px; color: #555c68; background: #e5e5ee; box-shadow: 0 1px 2px rgba(0,0,0,.08); font-size: 9.5px; }
.ib-shortcut-pill .ib-copy-shortcut { margin-left: 3px; padding-left: 13px; position: relative; }
.ib-shortcut-pill .ib-copy-shortcut::before { content: ""; position: absolute; left: 1px; top: 3px; bottom: 3px; width: 1px; background: #cfd2dd; }
.ib-shortcut-label { letter-spacing: .01em; }
.ib-empty-benefits { grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
.ib-empty-benefits article { min-height: 99px; padding: 12px; border: 0; border-radius: 13px; background: #f0f1fc; line-height: 1.2; }
.ib-empty-benefits strong { display: block; margin: 3px 0 5px; font-size: 13px; }
.ib-empty-benefits p { margin: 0; color: #555c68; font-size: 11px; line-height: 1.35; }
.benefit-icon { font-size: 18px; font-weight: 800; line-height: 1; }
.benefit-icon.blue { color: var(--ib-blue); }
.benefit-icon.purple { color: var(--ib-purple); }

.ib-workspace { min-height: 0; }
.context-card {
  overflow: hidden;
  border: 1px solid #e5e6ed;
  border-radius: var(--ib-radius);
  background: #fff;
  box-shadow: var(--ib-shadow);
}
.ib-context-eyebrow { padding: 13px 14px 8px; color: #343a45; font-size: 10px; font-weight: 800; letter-spacing: .10em; text-transform: uppercase; }
.ib-context-chip { padding: 4px 9px; color: #56606d; background: #edf0f4; font-size: 9px; letter-spacing: 0; text-transform: none; }
.context-header { grid-template-columns: 46px minmax(0, 1fr) 30px; gap: 10px; padding: 10px 14px; }
.profile-initials {
  width: 44px;
  height: 44px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #6f86a5, #1f5c85);
  font-size: 11.5px;
  font-weight: 800;
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px #e9ebf0;
}
.profile-initials::after { content: ""; position: absolute; width: 10px; height: 10px; margin: 31px 0 0 31px; border: 2px solid #fff; border-radius: 50%; background: #1ec66c; }
.context-title { min-width: 0; }
#profileName { display: block; overflow: hidden; color: var(--ib-ink); font-size: 16px; font-weight: 800; line-height: 1.2; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
#profileMeta { margin-top: 2px; overflow: hidden; color: var(--ib-blue); font-size: 11px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.ib-capture-button { width: 29px; height: 29px; display: grid; place-items: center; border: 0; color: #58616d; background: transparent; }
.ib-capture-button:hover { color: var(--ib-blue); background: var(--ib-blue-soft); border-radius: 8px; }
.ib-capture-button svg { width: 19px; height: 19px; }
.context-facts { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; padding: 0 14px 12px; }
.context-fact { min-width: 0; padding: 10px 7px; border-radius: 8px; text-align: center; background: #f0f1fb; }
.context-fact span { display: block; color: #4d5360; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.context-fact strong { display: block; margin-top: 3px; overflow: hidden; color: #353b46; font-size: 11px; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
.recent-context { margin: 0 14px 14px; padding-top: 10px; border-top: 1px solid #e8e9ef; }
.recent-context-header { margin-bottom: 7px; color: #3f4652; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.context-body, .context-secondary-body { color: #4d5360; font-size: 12px; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere; }
.context-body { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 4; }
.context-secondary-body { margin-top: 6px; padding-top: 6px; border-top: 1px solid #ececf1; color: #676f7d; font-size: 11px; }
.context-card.is-expanded .context-body { display: block; max-height: 210px; overflow: auto; }
.context-toggle { padding: 2px 0; color: var(--ib-blue); font-size: 10px; text-decoration: none; }
.ib-comment-footer { display: none !important; }
body[data-mode="comments"] .ib-comment-footer { display: flex !important; margin: 10px -13px 0; padding: 9px 13px; border-top: 1px solid #ececf2; color: #6651b3; font-size: 10px; }
.ib-comment-stats { color: #6557a9; letter-spacing: .02em; }
.ib-view-post { display: inline-flex; align-items: center; gap: 4px; padding: 0; color: #6651b3; font-size: 10px; font-weight: 750; text-decoration: none; }
body[data-mode="comments"] .context-footer { display: none !important; }
.match-chip { display: none !important; }

.ib-draft-card {
  order: 6;
  flex: 0 0 auto;
  margin: 0 23px 10px;
  padding: 13px 14px 14px;
  border: 1px solid #e8e8ef;
  border-radius: var(--ib-radius);
  background: #fff;
  box-shadow: var(--ib-shadow);
}
.ib-draft-head { min-height: 28px; margin-bottom: 9px; }
.ib-draft-head > div { gap: 7px; }
.ib-spark-icon { color: var(--ib-purple); font-size: 20px; }
#draftTitle { font-size: 16px; letter-spacing: -.15px; }
.ib-regenerate-proxy { display: inline-flex; align-items: center; gap: 4px; padding: 3px 0; color: var(--ib-blue); font-size: 11px; font-weight: 700; text-decoration: none; }
.ib-regenerate-proxy svg { width: 16px; height: 16px; }
.ib-style-controls { margin-bottom: 11px; padding: 3px; border: 1px solid #e7e7ee; border-radius: 9px; background: #f1f1f8; }
.ib-tone-control, .ib-length-control { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ib-tone-control button, .ib-length-control button { min-width: 0; padding: 6px 5px; border: 0; border-radius: 7px; color: #4f5662; background: transparent; font-size: 10px; }
.ib-tone-control button.active, .ib-length-control button.active { color: #232935; background: #fff; box-shadow: 0 2px 5px rgba(31, 38, 52, .08); font-weight: 700; }
.ib-length-control { margin-top: 3px; }
.ib-editor-shell { min-height: 110px; }
#messageEditor {
  min-height: 110px;
  max-height: 225px;
  padding: 12px 13px 25px;
  resize: vertical;
  border: 1px solid #dcdee6;
  border-radius: 12px;
  color: #242a35;
  background: #fff;
  font-size: 13px;
  line-height: 1.45;
  box-shadow: inset 0 1px 2px rgba(25, 31, 44, .03);
}
#messageEditor:focus { border-color: #9ec5e0; box-shadow: 0 0 0 3px rgba(7, 95, 159, .10); }
.ib-char-hint { position: absolute; right: 10px; bottom: 7px; color: #a0a5af; font-size: 9px; }
.draft-loading { min-height: 80px; align-items: center; justify-content: center; gap: 5px; }
.draft-loading span { width: 7px; height: 7px; border-radius: 50%; background: var(--ib-blue); animation: ib-bounce 1s infinite alternate; }
.draft-loading span:nth-child(2) { animation-delay: .15s; }
.draft-loading span:nth-child(3) { animation-delay: .3s; }
.draft-loading em { margin-left: 6px; color: var(--ib-muted); font-style: normal; }
@keyframes ib-bounce { to { transform: translateY(-5px); opacity: .45; } }

.action-dock {
  order: 7;
  flex: 0 0 auto;
  grid-template-areas: "copy reset";
  grid-template-columns: minmax(0, 1.45fr) minmax(0, .9fr);
  gap: 0;
  padding: 0 23px 14px;
  background: linear-gradient(to top, var(--ib-page) 75%, rgba(248,247,255,0));
  z-index: 10;
}
.action-dock .btn { min-height: 50px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 11px; font-size: 12px; font-weight: 750; }
.refresh-button { display: none !important; }
.copy-button { grid-area: copy; border-color: var(--ib-blue); background: var(--ib-blue); border-radius: 11px 0 0 11px !important; box-shadow: 0 5px 13px rgba(7, 95, 159, .20); }
.copy-button:hover:not(:disabled) { border-color: var(--ib-blue-dark); background: var(--ib-blue-dark); }
.copy-button:disabled { border-color: #9db8cd; background: #9db8cd; opacity: .7; cursor: not-allowed; }
.stop-refresh-button { grid-area: reset; border: 0; border-radius: 0 11px 11px 0 !important; color: #4e5561; background: #eeedf8; }
.stop-refresh-button:hover { color: var(--ib-blue); background: #e5eafb; }

/* Comments mode */
body[data-mode="comments"] .action-dock { order: 4; grid-template-areas: "reset copy"; grid-template-columns: .78fr 1.45fr; gap: 10px; padding: 14px 23px 0; background: var(--ib-page); }
body[data-mode="comments"] .copy-button, body[data-mode="comments"] .stop-refresh-button { border-radius: 10px !important; }
body[data-mode="comments"] .ib-autopilot-card { order: 5; margin: 10px 8px 0; padding: 0; border: 0; background: transparent; box-shadow: none; }
body[data-mode="comments"] .ib-autopilot-top,
body[data-mode="comments"] .ib-autopilot-card > p { display: none !important; }
body[data-mode="comments"] .ib-autopilot-actions { grid-template-columns: minmax(0, 1fr) 43px; }
body[data-mode="comments"] #panelScroll { order: 6; }
body[data-mode="comments"] .ib-draft-card { order: 7; }
body[data-mode="comments"] .context-card { overflow: visible; padding-top: 32px; border: 0; background: transparent; box-shadow: none; }
body[data-mode="comments"] .context-card::before { content: ""; position: absolute; inset: 32px 0 0; border: 1px solid #e5e6ed; border-radius: var(--ib-radius); background: #fff; box-shadow: var(--ib-shadow); z-index: 0; }
body[data-mode="comments"] .context-card > * { position: relative; z-index: 1; }
body[data-mode="comments"] .ib-context-eyebrow { position: absolute; top: 0; left: 0; right: 0; min-height: 23px; padding: 0; }
body[data-mode="comments"] .context-header { grid-template-columns: 44px minmax(0,1fr) 30px; padding-top: 5px; }
body[data-mode="comments"] .context-facts { display: none !important; }
body[data-mode="comments"] .recent-context { position: static !important; margin: 0 14px 0; padding: 9px 13px 0; border-top: 0; border-left: 4px solid #c8b6ea; background: transparent; }
body[data-mode="comments"] .recent-context-header { display: flex !important; min-height: 0; margin: 0; }
body[data-mode="comments"] #recentContextLabel { display: none !important; }
body[data-mode="comments"] .context-body { -webkit-line-clamp: 4; color: #343a45; font-size: 13px; line-height: 1.55; }
body[data-mode="comments"] .ib-draft-card { margin-top: 0; border: 0; background: transparent; box-shadow: none; padding: 0 23px 16px; }
body[data-mode="comments"] #panelScroll { flex: 0 0 auto; overflow: visible; padding-bottom: 10px; }
body[data-mode="comments"] .ib-draft-card { display: flex; flex-direction: column; }
body[data-mode="comments"] .ib-draft-head { order: 1; }
body[data-mode="comments"] .ib-editor-shell, body[data-mode="comments"] .draft-loading { order: 2; }
body[data-mode="comments"] .ib-style-controls { order: 3; }
body[data-mode="comments"] .ib-draft-head { margin: 0 0 8px; }
body[data-mode="comments"] .ib-spark-icon { display: none; }
body[data-mode="comments"] #draftTitle { font-size: 16px; }
body[data-mode="comments"] .ib-regenerate-proxy { display: none; }
body[data-mode="comments"] .ib-editor-shell { padding: 0; border-radius: 12px; background: #fff; box-shadow: var(--ib-shadow); }
body[data-mode="comments"] #messageEditor { min-height: 126px; border-color: #e0e1e8; }
body[data-mode="comments"] .ib-style-controls { display: flex; gap: 9px; margin: 12px 0 0; padding: 0; border: 0; background: transparent; }
body[data-mode="comments"] .ib-tone-control { width: 100%; gap: 9px; }
body[data-mode="comments"] .ib-tone-control button { min-height: 58px; border-radius: 10px; background: #eff0f8; font-size: 11px; font-weight: 700; }
body[data-mode="comments"] .ib-tone-control button:nth-child(1)::before { content: "☺"; display: block; margin-bottom: 3px; font-size: 17px; }
body[data-mode="comments"] .ib-tone-control button:nth-child(2)::before { content: "♙"; display: block; margin-bottom: 3px; font-size: 17px; }
body[data-mode="comments"] .ib-tone-control button:nth-child(3)::before { content: "◆"; display: block; margin-bottom: 3px; font-size: 14px; }
body[data-mode="comments"] .ib-tone-control button.active { color: var(--ib-purple); border: 1px solid #cfc4ef; background: var(--ib-purple-soft); box-shadow: none; }
body[data-mode="comments"] .ib-tone-control button { font-size: 0; }
body[data-mode="comments"] .ib-tone-control button::after { display: block; font-size: 11px; }
body[data-mode="comments"] .ib-tone-control button:nth-child(1)::after { content: "Friendly"; }
body[data-mode="comments"] .ib-tone-control button:nth-child(2)::after { content: "Insightful"; }
body[data-mode="comments"] .ib-tone-control button:nth-child(3)::after { content: "Supportive"; }
body[data-mode="comments"] .ib-length-control { display: none !important; }

/* Conversation mode */
body[data-mode="conversation"] .ib-autopilot-card { display: none !important; }
body[data-mode="conversation"] #panelScroll { order: 4; flex: 0 0 auto; overflow: visible; padding-top: 14px; padding-bottom: 0; }
body[data-mode="conversation"] .ib-draft-card { order: 5; margin: 12px 23px 0; border-bottom: 0; border-radius: var(--ib-radius) var(--ib-radius) 0 0; box-shadow: none; }
body[data-mode="conversation"] .action-dock { order: 6; margin: 0 23px 14px; padding: 0 12px 12px; border: 1px solid #e8e8ef; border-top: 0; border-radius: 0 0 var(--ib-radius) var(--ib-radius); background: #fff; box-shadow: var(--ib-shadow); }
body[data-mode="conversation"] .ib-context-eyebrow { color: #38404b; }
body[data-mode="conversation"] .ib-context-chip { color: var(--ib-teal); background: transparent; font-size: 11px; font-weight: 800; }
body[data-mode="conversation"] .context-card { border-left: 4px solid var(--ib-teal); }
body[data-mode="conversation"] .context-facts { display: none !important; }
body[data-mode="conversation"] .recent-context { margin: 0; padding: 5px 14px 14px; border: 0; }
body[data-mode="conversation"] .recent-context-header { display: none; }
body[data-mode="conversation"] .context-body {
  display: block;
  max-height: 290px;
  overflow: auto;
  padding: 8px 10px;
  border-radius: 10px;
  color: #303742;
  background: linear-gradient(180deg, #e3f4f1 0 43%, #f0f1fc 43% 100%);
  font-size: 11.5px;
  line-height: 1.55;
  white-space: pre-line;
}
body[data-mode="conversation"] .ib-spark-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 7px; color: var(--ib-teal); background: var(--ib-teal-soft); }
body[data-mode="conversation"] .ib-regenerate-proxy, body[data-mode="conversation"] .ib-style-controls { display: none !important; }
body[data-mode="conversation"] #messageEditor { min-height: 170px; background: #fbfbff; }

body:has(#emptyState:not(.hidden)) .action-dock,
body:has(#emptyState:not(.hidden)) .ib-autopilot-card { display: none !important; }
body:has(#emptyState:not(.hidden)) #panelScroll { padding: 0 16px 16px 24px; }

/* Final reference-fit refinements. */
.context-card { position: relative; }
body[data-mode="dms"] .ib-context-eyebrow { display: none !important; }
body[data-mode="dms"] .recent-context-header { display: flex !important; }
body[data-mode="comments"] .ib-context-chip,
body[data-mode="conversation"] .ib-context-chip { position: absolute; top: 10px; right: 13px; z-index: 2; }
body[data-mode="conversation"] .recent-context-header { min-height: 0; }
body[data-mode="comments"] .ib-context-eyebrow,
body[data-mode="conversation"] .ib-context-eyebrow { padding-right: 94px; }
.ib-empty-illustration svg { width: 42px; height: 42px; fill: none; stroke: #78b8ea; stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; }
.ib-empty-illustration svg path { fill: none; }

@media (max-width: 380px) {
  .ib-header { padding-inline: 12px; }
  .ib-engine-bar { grid-template-columns: 104px minmax(0,1fr) 29px 29px; padding-inline: 8px; }
  .ib-provider-control { width: 103px; }
  .ib-autopilot-card, .ib-draft-card { margin-inline: 10px; }
  #panelScroll { padding-inline: 10px; }
  .action-dock, body[data-mode="comments"] .action-dock { padding-inline: 10px; }
  .ib-brand-name { font-size: 15px; }
  .ib-ready-pill { padding-inline: 9px; }
  .context-facts { gap: 5px; padding-inline: 10px; }
  .context-fact { padding-inline: 4px; }
  .ib-empty-card { padding-inline: 20px; }
}

@media (max-height: 720px) {
  .ib-empty-wrap { padding-top: 12px; }
  .ib-empty-card { min-height: 252px; padding-top: 22px; }
  .ib-empty-benefits { margin-top: 12px; }
  #messageEditor { min-height: 84px; }
}

/* v1.4.96 — PDF-scale navigation, controls and empty-state geometry. */
.ib-header { min-height: 46px; padding: 4px 14px; }
.ib-brand { gap: 7px; }
.ib-logo { width: 25px; height: 25px; border-radius: 7px; box-shadow: 0 2px 6px rgba(10, 102, 194, .18); }
.ib-brand-name { font-size: 14.5px; letter-spacing: -.28px; }
.ib-brand-slogan { margin-top: 2px; font-size: 7.2px; }
.ib-header-actions { gap: 8px; }
.ib-ready-pill { gap: 5px; padding: 3px 8px; font-size: 8.8px; }
.status-dot { width: 6px; height: 6px; }
.ib-icon-button { width: 24px; height: 24px; }
.ib-icon-button svg { width: 17px; height: 17px; }

.ib-mode-tabs { min-height: 42px; }
.ib-mode-control button { min-height: 42px; gap: 1px; padding: 3px 3px 5px; font-size: 10.5px; line-height: 1.08; }
.ib-mode-control button svg { width: 17px; height: 17px; }
.ib-mode-control button .ib-mode-icon-dms { width: 19px; height: 18px; }
.ib-mode-control button .ib-mode-icon-conversation { width: 19px; height: 18px; }
.ib-mode-control button.active::after { height: 2.5px; }
.ib-mode-icon-dms, .ib-mode-icon-comments { fill: none; }
.ib-mode-icon-conversation { fill: currentColor; }

.ib-engine-bar { min-height: 34px; grid-template-columns: 116px minmax(0, 1fr) 27px 27px; gap: 2px; padding: 2px 12px; }
.ib-provider-shell { height: 29px; }
.ib-provider-control { width: 114px; min-height: 29px; border-radius: 7px; }
.ib-provider-control button { min-height: 29px; gap: 6px; padding: 3px 5px; font-size: 10.5px; }
.ib-provider-control button.active::after { font-size: 13px; }
.provider-logo { width: 19px; height: 19px; flex-basis: 19px; border-radius: 5px; }
.provider-logo img { width: 13px; height: 13px; }
.ib-model-shell .form-select { height: 29px; padding: 3px 22px 3px 26px; border-radius: 7px; font-size: 10.5px; }
.ib-model-provider-icon { left: 6px; top: 7px; width: 14px; height: 14px; }
.ib-engine-action { width: 27px; height: 29px; border-radius: 7px; }
.ib-engine-action svg { width: 17px; height: 17px; }

#panelScroll { padding: 8px 17px 13px; }
.ib-autopilot-card { margin-inline: 17px; padding: 11px; border-radius: 12px; }
.ib-autopilot-icon { width: 32px; height: 32px; flex-basis: 32px; border-radius: 8px; }
.ib-autopilot-icon svg { width: 17px; height: 17px; }
.ib-autopilot-title { gap: 9px; }
.ib-autopilot-title strong { font-size: 14px; }
.ib-manual-badge { padding: 4px 8px; font-size: 8px; }
.ib-autopilot-card > p { margin: 7px 0 9px; font-size: 10.8px; line-height: 1.35; }
.ib-autopilot-actions { grid-template-columns: minmax(0, 1fr) 38px; gap: 8px; }
.ib-autopilot-actions > .btn { min-height: 37px; border-radius: 8px; font-size: 10.8px; }
.ib-autopilot-settings svg { width: 18px; height: 18px; }

body:has(#emptyState:not(.hidden)) #panelScroll { padding: 0 17px 14px; }
.ib-empty-wrap { padding-top: 16px; }
.ib-empty-card { min-height: 258px; padding: 25px 22px 12px; border-radius: 15px; }
.ib-empty-illustration { width: 68px; height: 68px; margin-bottom: 9px; }
.ib-empty-illustration svg { width: 34px; height: 34px; stroke-width: 2.1; }
.ib-empty-card > strong { font-size: 16px; letter-spacing: -.2px; }
.ib-empty-card > p { max-width: 306px; margin: 5px auto 13px; font-size: 12.5px; line-height: 1.28; }
#captureCurrentButtonEmpty { min-height: 38px; gap: 7px; border-radius: 8px; font-size: 11.5px; }
#captureCurrentButtonEmpty svg { width: 16px; height: 16px; }
.ib-shortcut-pill { gap: 5px; margin-top: 15px; padding: 4px 8px; font-size: 8.3px; }
.ib-shortcut-pill kbd { padding: 3px 6px; border-radius: 4px; font-size: 8.3px; }
.ib-shortcut-pill .ib-copy-shortcut { margin-left: 2px; padding-left: 10px; }
.ib-empty-benefits { gap: 10px; margin-top: 16px; }
.ib-empty-benefits article { min-height: 76px; padding: 10px; border-radius: 12px; }
.ib-empty-benefits strong { margin: 2px 0 4px; font-size: 12px; }
.ib-empty-benefits p { font-size: 10px; line-height: 1.3; }
.benefit-icon { font-size: 16px; }

.context-header { grid-template-columns: 40px minmax(0, 1fr) 25px; gap: 8px; padding: 8px 11px; }
.profile-initials { width: 38px; height: 38px; font-size: 10px; }
.profile-initials::after { width: 9px; height: 9px; margin: 27px 0 0 27px; }
#profileName { font-size: 14px; }
#profileMeta { font-size: 10px; }
.ib-capture-button { width: 25px; height: 25px; }
.ib-capture-button svg { width: 16px; height: 16px; }
.context-facts { gap: 6px; padding: 0 11px 10px; }
.context-fact { padding: 8px 5px; }
.context-fact span { font-size: 8px; }
.context-fact strong { font-size: 10px; }
.recent-context { margin: 0 11px 11px; padding-top: 8px; }
.context-body, .context-secondary-body { font-size: 10.8px; line-height: 1.42; }

.ib-draft-card { margin-inline: 17px; padding: 10px 11px 11px; border-radius: 12px; }
.ib-draft-head { min-height: 24px; margin-bottom: 7px; }
#draftTitle { font-size: 14px; }
.ib-spark-icon { font-size: 17px; }
.ib-style-controls { margin-bottom: 8px; }
.ib-tone-control button, .ib-length-control button { padding: 5px 4px; font-size: 9px; }
.ib-editor-shell, #messageEditor { min-height: 94px; }
#messageEditor { padding: 10px 11px 22px; border-radius: 10px; font-size: 11.5px; line-height: 1.42; }
.action-dock { padding: 0 17px 11px; }
.action-dock .btn { min-height: 42px; gap: 6px; border-radius: 9px; font-size: 10.8px; }
.action-dock .btn svg { width: 17px; height: 17px; }

body[data-mode="comments"] .action-dock { gap: 8px; padding: 10px 17px 0; }
body[data-mode="comments"] .ib-autopilot-card { margin: 8px 7px 0; }
body[data-mode="comments"] .ib-autopilot-actions { grid-template-columns: minmax(0, 1fr) 38px; }
body[data-mode="comments"] .ib-context-eyebrow { min-height: 20px; }
body[data-mode="comments"] .context-card { padding-top: 27px; }
body[data-mode="comments"] .context-card::before { inset: 27px 0 0; }
body[data-mode="comments"] .ib-draft-card { padding: 0 17px 12px; }
body[data-mode="comments"] #messageEditor { min-height: 106px; }
body[data-mode="comments"] .ib-tone-control button { min-height: 49px; font-size: 0; }
body[data-mode="comments"] .ib-tone-control button::after { font-size: 10px; }
body[data-mode="comments"] .ib-tone-control button:nth-child(1)::before,
body[data-mode="comments"] .ib-tone-control button:nth-child(2)::before { font-size: 15px; }
body[data-mode="comments"] .ib-tone-control button:nth-child(3)::before { font-size: 12px; }

body[data-mode="conversation"] #panelScroll { padding-top: 10px; }
body[data-mode="conversation"] .ib-draft-card { margin: 9px 17px 0; }
body[data-mode="conversation"] .action-dock { margin: 0 17px 11px; padding: 0 10px 10px; }
body[data-mode="conversation"] .context-body { max-height: 248px; font-size: 10.5px; line-height: 1.45; }
body[data-mode="conversation"] #messageEditor { min-height: 142px; }

/* v1.4.97 - Exact PDF-matched DMs area below the provider/model bar. */
body[data-mode="dms"] .react-page-root {
  overflow-x: hidden;
  overflow-y: auto;
}

body[data-mode="dms"] .ib-autopilot-card {
  margin: 3px 24px 0;
  min-height: 164px;
  padding: 12px;
  border: 1px solid #e7e8ef;
  border-radius: 14px;
  box-shadow: 0 2px 7px rgba(25, 32, 48, .055);
}
body[data-mode="dms"] .ib-autopilot-top { gap: 10px; }
body[data-mode="dms"] .ib-autopilot-title { gap: 12px; }
body[data-mode="dms"] .ib-autopilot-icon {
  width: 40px;
  height: 40px;
  flex-basis: 40px;
  border-radius: 9px;
}
body[data-mode="dms"] .ib-autopilot-icon svg { width: 21px; height: 21px; }
body[data-mode="dms"] .ib-autopilot-title strong { font-size: 16px; line-height: 1.05; }
body[data-mode="dms"] .ib-autopilot-status { margin-top: 3px; font-size: 10.5px; }
body[data-mode="dms"] .ib-manual-badge { padding: 5px 10px; font-size: 9px; }
body[data-mode="dms"] .ib-autopilot-card > p {
  margin: 10px 0 12px;
  font-size: 13px;
  line-height: 1.38;
}
body[data-mode="dms"] .ib-autopilot-actions {
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 8px;
}
body[data-mode="dms"] .ib-autopilot-actions > .btn {
  min-height: 40px;
  border-radius: 9px;
  font-size: 12px;
}
body[data-mode="dms"] .ib-autopilot-settings svg { width: 20px; height: 20px; }

body[data-mode="dms"] #panelScroll {
  flex: 0 0 auto;
  overflow: visible;
  padding: 12px 24px 0;
}
body[data-mode="dms"] .ib-workspace { width: 100%; }
body[data-mode="dms"] .context-card {
  min-height: 232px;
  border-radius: 14px;
  box-shadow: 0 2px 7px rgba(25, 32, 48, .055);
}
body[data-mode="dms"] .context-header {
  grid-template-columns: 44px minmax(0, 1fr) 28px;
  gap: 10px;
  padding: 12px 12px 10px;
}
body[data-mode="dms"] .profile-initials {
  width: 42px;
  height: 42px;
  font-size: 11px;
}
body[data-mode="dms"] .profile-initials::after {
  width: 10px;
  height: 10px;
  margin: 30px 0 0 30px;
}
body[data-mode="dms"] #profileName { font-size: 16px; line-height: 1.16; }
body[data-mode="dms"] #profileMeta { margin-top: 2px; font-size: 11px; }
body[data-mode="dms"] .ib-capture-button { width: 28px; height: 28px; }
body[data-mode="dms"] .ib-capture-button svg { width: 18px; height: 18px; }
body[data-mode="dms"] .context-facts {
  gap: 7px;
  padding: 0 12px 12px;
}
body[data-mode="dms"] .context-fact {
  min-height: 47px;
  padding: 9px 6px;
  border-radius: 9px;
}
body[data-mode="dms"] .context-fact span { font-size: 9px; }
body[data-mode="dms"] .context-fact strong { margin-top: 3px; font-size: 11px; }
body[data-mode="dms"] .recent-context {
  margin: 0 12px 14px;
  padding-top: 11px;
}
body[data-mode="dms"] .recent-context-header {
  margin-bottom: 9px;
  font-size: 10.5px;
}
body[data-mode="dms"] .ib-context-chip {
  padding: 4px 8px;
  border-radius: 6px !important;
  color: #07599f;
  background: #e7f0f7;
  font-size: 10px;
  font-weight: 800;
}
body[data-mode="dms"] .context-body,
body[data-mode="dms"] .context-secondary-body {
  font-size: 12px;
  line-height: 1.48;
}
body[data-mode="dms"] .context-body { -webkit-line-clamp: 4; }

body[data-mode="dms"] .ib-draft-card {
  margin: 12px 24px 8px;
  min-height: 248px;
  padding: 13px 12px 12px;
  border-radius: 14px;
  box-shadow: 0 2px 7px rgba(25, 32, 48, .055);
}
body[data-mode="dms"] .ib-draft-head {
  min-height: 28px;
  margin-bottom: 9px;
}
body[data-mode="dms"] .ib-draft-head > div { gap: 7px; }
body[data-mode="dms"] .ib-spark-icon { font-size: 20px; }
body[data-mode="dms"] #draftTitle { font-size: 16px; }
body[data-mode="dms"] .ib-regenerate-proxy { font-size: 11px; }
body[data-mode="dms"] .ib-regenerate-proxy svg { width: 16px; height: 16px; }
body[data-mode="dms"] .ib-style-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  margin-bottom: 11px;
  padding: 3px;
  border: 1px solid #e7e7ee;
  border-radius: 9px;
  background: #f1f1f8;
}
body[data-mode="dms"] .ib-tone-control,
body[data-mode="dms"] .ib-length-control {
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}
body[data-mode="dms"] .ib-length-control {
  padding-top: 3px;
  border-top: 1px solid #dedfe8;
}
body[data-mode="dms"] #toneControl button:nth-child(3),
body[data-mode="dms"] #lengthControl button:nth-child(3) {
  display: block !important;
}
body[data-mode="dms"] .ib-tone-control button,
body[data-mode="dms"] .ib-length-control button {
  min-width: 0;
  min-height: 23px;
  padding: 3px 4px;
  overflow: hidden;
  border-radius: 7px;
  font-size: 9.5px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="dms"] .ib-editor-shell,
body[data-mode="dms"] #messageEditor {
  min-height: 120px;
  height: 120px;
}
body[data-mode="dms"] #messageEditor {
  max-height: 120px;
  padding: 12px 13px 25px;
  resize: none;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.45;
}
body[data-mode="dms"] .ib-char-hint { right: 10px; bottom: 7px; font-size: 9px; }

body[data-mode="dms"] .action-dock {
  flex: 0 0 auto;
  padding: 0 24px;
  background: transparent;
}
body[data-mode="dms"] .action-dock .btn {
  min-height: 48px;
  gap: 8px;
  font-size: 12px;
}
body[data-mode="dms"] .action-dock .btn svg { width: 19px; height: 19px; }
body[data-mode="dms"] .copy-button { border-radius: 11px 0 0 11px !important; }
body[data-mode="dms"] .stop-refresh-button { border-radius: 0 11px 11px 0 !important; }

@media (max-width: 340px) {
  body[data-mode="dms"] .ib-autopilot-card,
  body[data-mode="dms"] .ib-draft-card { margin-inline: 14px; }
  body[data-mode="dms"] #panelScroll,
  body[data-mode="dms"] .action-dock { padding-inline: 14px; }
  body[data-mode="dms"] .ib-autopilot-card > p { font-size: 11.5px; }
  body[data-mode="dms"] .context-body,
  body[data-mode="dms"] .context-secondary-body { font-size: 11px; }
  body[data-mode="dms"] #messageEditor { font-size: 12px; }
}


/* v1.4.99 — Compact, overflow-safe DMs layout with profile fact bubbles removed. */
body[data-mode="dms"] .react-page-root {
  overflow-x: hidden;
  overflow-y: auto;
}

/* Keep every card inside the side-panel width at all supported sizes. */
body[data-mode="dms"] .ib-autopilot-card,
body[data-mode="dms"] .context-card,
body[data-mode="dms"] .ib-draft-card,
body[data-mode="dms"] .action-dock,
body[data-mode="dms"] #panelScroll,
body[data-mode="dms"] .ib-style-controls,
body[data-mode="dms"] .ib-tone-control,
body[data-mode="dms"] .ib-length-control,
body[data-mode="dms"] .ib-editor-shell,
body[data-mode="dms"] #messageEditor {
  min-width: 0;
  max-width: 100%;
}

/* Autopilot card: same compact rhythm as the reference. */
body[data-mode="dms"] .ib-autopilot-card {
  margin: 3px 24px 0;
  min-height: 0;
  padding: 11px 12px 12px;
}
body[data-mode="dms"] .ib-autopilot-icon {
  width: 38px;
  height: 38px;
  flex-basis: 38px;
}
body[data-mode="dms"] .ib-autopilot-icon svg { width: 19px; height: 19px; }
body[data-mode="dms"] .ib-autopilot-title strong { font-size: 15px; }
body[data-mode="dms"] .ib-autopilot-status { font-size: 10px; }
body[data-mode="dms"] .ib-autopilot-card > p {
  margin: 8px 0 10px;
  font-size: 11.7px;
  line-height: 1.35;
}
body[data-mode="dms"] .ib-autopilot-actions {
  grid-template-columns: minmax(0, 1fr) 39px;
  gap: 8px;
}
body[data-mode="dms"] .ib-autopilot-actions > .btn {
  min-height: 39px;
  padding-block: 6px;
  font-size: 11px;
}

/* Profile card: remove Role / Company / Location bubbles completely. */
body[data-mode="dms"] #panelScroll {
  flex: 0 0 auto;
  overflow: visible;
  padding: 10px 24px 0;
}
body[data-mode="dms"] .context-card {
  min-height: 0;
  overflow: hidden;
  border-radius: 14px;
}
body[data-mode="dms"] .context-header {
  grid-template-columns: 42px minmax(0, 1fr) 27px;
  gap: 9px;
  padding: 10px 11px 8px;
}
body[data-mode="dms"] .profile-initials {
  width: 40px;
  height: 40px;
}
body[data-mode="dms"] .profile-initials::after {
  width: 9px;
  height: 9px;
  margin: 29px 0 0 29px;
}
body[data-mode="dms"] #profileName {
  font-size: 15px;
  line-height: 1.15;
}
body[data-mode="dms"] #profileMeta {
  margin-top: 1px;
  font-size: 10px;
}
body[data-mode="dms"] .context-facts {
  display: none !important;
}
body[data-mode="dms"] .recent-context {
  margin: 0 11px 11px;
  padding-top: 8px;
}
body[data-mode="dms"] .recent-context-header {
  margin-bottom: 7px;
  font-size: 10px;
}
body[data-mode="dms"] .ib-context-chip {
  padding: 3px 7px;
  font-size: 9px;
}
body[data-mode="dms"] .context-body,
body[data-mode="dms"] .context-secondary-body {
  font-size: 11px;
  line-height: 1.42;
}
body[data-mode="dms"] .context-body {
  -webkit-line-clamp: 4;
  overflow-wrap: anywhere;
}

/* Message card: two compact rows (Vibe, then Length) without overflow. */
body[data-mode="dms"] .ib-draft-card {
  margin: 10px 24px 7px;
  min-height: 0;
  padding: 10px 11px 11px;
}
body[data-mode="dms"] .ib-draft-head {
  min-height: 24px;
  margin-bottom: 7px;
}
body[data-mode="dms"] .ib-spark-icon { font-size: 17px; }
body[data-mode="dms"] #draftTitle { font-size: 14px; }
body[data-mode="dms"] .ib-regenerate-proxy {
  gap: 3px;
  font-size: 10px;
}
body[data-mode="dms"] .ib-regenerate-proxy svg { width: 14px; height: 14px; }
body[data-mode="dms"] .ib-style-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  margin-bottom: 8px;
  padding: 3px;
  overflow: hidden;
  border-radius: 8px;
}
body[data-mode="dms"] .ib-tone-control,
body[data-mode="dms"] .ib-length-control {
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 0;
}
body[data-mode="dms"] .ib-length-control {
  padding-top: 3px;
  border-top: 1px solid #dedfe8;
}
body[data-mode="dms"] .ib-tone-control button,
body[data-mode="dms"] .ib-length-control button {
  width: 100%;
  min-width: 0;
  min-height: 22px;
  padding: 3px 2px;
  overflow: hidden;
  border-radius: 6px;
  font-size: 9px;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="dms"] .ib-editor-shell,
body[data-mode="dms"] #messageEditor {
  min-height: 112px;
  height: 112px;
}
body[data-mode="dms"] #messageEditor {
  max-height: 112px;
  padding: 10px 11px 22px;
  overflow-y: auto;
  resize: none;
  border-radius: 10px;
  font-size: 11.5px;
  line-height: 1.4;
}
body[data-mode="dms"] .ib-char-hint {
  right: 9px;
  bottom: 6px;
  font-size: 8px;
}

/* Joined Copy / Reset dock at the PDF scale. */
body[data-mode="dms"] .action-dock {
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1.42fr) minmax(0, .86fr);
  padding: 0 24px 10px;
  overflow: hidden;
  background: transparent;
}
body[data-mode="dms"] .action-dock .btn {
  min-width: 0;
  min-height: 44px;
  padding: 7px 8px;
  gap: 6px;
  overflow: hidden;
  font-size: 11px;
  white-space: nowrap;
}
body[data-mode="dms"] .action-dock .btn svg {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
}

@media (max-width: 340px) {
  body[data-mode="dms"] .ib-autopilot-card,
  body[data-mode="dms"] .ib-draft-card { margin-inline: 12px; }
  body[data-mode="dms"] #panelScroll,
  body[data-mode="dms"] .action-dock { padding-inline: 12px; }
  body[data-mode="dms"] .ib-manual-badge { padding-inline: 7px; font-size: 7.5px; }
  body[data-mode="dms"] .ib-autopilot-card > p { font-size: 10.7px; }
  body[data-mode="dms"] .context-body,
  body[data-mode="dms"] .context-secondary-body { font-size: 10.4px; }
  body[data-mode="dms"] .ib-tone-control button,
  body[data-mode="dms"] .ib-length-control button { font-size: 8.3px; }
  body[data-mode="dms"] #messageEditor { font-size: 10.8px; }
  body[data-mode="dms"] .action-dock .btn { font-size: 10px; }
}

@media (max-height: 760px) {
  body[data-mode="dms"] .ib-autopilot-card > p { margin-block: 6px 8px; }
  body[data-mode="dms"] #panelScroll { padding-top: 7px; }
  body[data-mode="dms"] .ib-draft-card { margin-top: 7px; }
  body[data-mode="dms"] .ib-editor-shell,
  body[data-mode="dms"] #messageEditor { min-height: 92px; height: 92px; max-height: 92px; }
  body[data-mode="dms"] .action-dock .btn { min-height: 40px; }
}


/* v1.5.1 — Rounded DMs controls and real hovered-profile avatars. */
.profile-initials {
  position: relative;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}
.profile-initials.has-avatar {
  color: transparent;
  background-color: #e8edf2;
  background-image: var(--ib-profile-avatar);
  text-shadow: none;
}

body[data-mode="dms"] .ib-style-controls {
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #f2f2f8;
}
body[data-mode="dms"] .ib-tone-control,
body[data-mode="dms"] .ib-length-control {
  gap: 4px;
}
body[data-mode="dms"] .ib-length-control {
  padding-top: 4px;
}
body[data-mode="dms"] .ib-tone-control button,
body[data-mode="dms"] .ib-length-control button {
  min-height: 25px;
  padding: 4px 5px;
  border: 1px solid transparent;
  border-radius: 9px;
  transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease;
}
body[data-mode="dms"] .ib-tone-control button:hover,
body[data-mode="dms"] .ib-length-control button:hover {
  border-color: #e0e3ea;
  background: rgba(255, 255, 255, .7);
}
body[data-mode="dms"] .ib-tone-control button.active,
body[data-mode="dms"] .ib-length-control button.active {
  border-color: #e2e4ea;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(31, 38, 52, .09);
}
body[data-mode="dms"] .action-dock {
  gap: 0;
  overflow: visible;
}
body[data-mode="dms"] .copy-button,
body[data-mode="dms"] .stop-refresh-button {
  border-radius: 12px !important;
}

body[data-mode="dms"] .copy-button {
  position: relative;
  z-index: 1;
}

/* v1.5.4 - PDF-matched Comments mode, without Autopilot. */
body[data-mode="comments"] {
  --ib-page: #f9f9ff;
  overflow: hidden;
}
body[data-mode="comments"] .react-page-root {
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
body[data-mode="comments"] #autopilotCard,
body[data-mode="comments"] .ib-autopilot-card,
body[data-mode="comments"] #resumeNotice,
body[data-mode="comments"] #matchPanel,
body[data-mode="comments"] #lowMatchActions {
  display: none !important;
}

/* Reset / Copy Comment row directly below the API/model selector. */
body[data-mode="comments"] .action-dock {
  order: 4;
  flex: 0 0 auto;
  grid-template-areas: "reset copy";
  grid-template-columns: minmax(0, .82fr) minmax(0, 1.48fr);
  gap: 12px;
  margin: 0;
  padding: 12px 24px 0;
  overflow: hidden;
  background: var(--ib-page);
}
body[data-mode="comments"] .action-dock .btn {
  min-width: 0;
  min-height: 40px;
  padding: 8px 10px;
  gap: 7px;
  overflow: hidden;
  border-radius: 10px !important;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}
body[data-mode="comments"] .action-dock .btn svg {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
}
body[data-mode="comments"] .stop-refresh-button {
  color: #4c5360;
  background: #edf0fa;
}
body[data-mode="comments"] .copy-button {
  border-color: #00468b;
  background: #00468b;
  box-shadow: 0 5px 12px rgba(0, 70, 139, .20);
}

/* Reading context and LinkedIn post card. */
body[data-mode="comments"] #panelScroll {
  order: 5;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  padding: 11px 24px 0;
  overflow: visible;
}
body[data-mode="comments"] .ib-workspace {
  width: 100%;
  min-width: 0;
}
body[data-mode="comments"] .context-card {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 31px 0 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
body[data-mode="comments"] .context-card::before {
  content: "";
  position: absolute;
  inset: 31px 0 0;
  z-index: 0;
  border: 1px solid #e3e4eb;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 3px 9px rgba(24, 31, 47, .08);
}
body[data-mode="comments"] .context-card > * {
  position: relative;
  z-index: 1;
}
body[data-mode="comments"] .ib-context-eyebrow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  min-height: 24px;
  padding: 0;
  color: #424954;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}
body[data-mode="comments"] .recent-context-header {
  position: absolute;
  top: -1px;
  right: 0;
  z-index: 3;
  display: flex !important;
  align-items: center;
  min-height: 24px;
  margin: 0;
  padding: 0;
}
body[data-mode="comments"] #recentContextLabel {
  display: none !important;
}
body[data-mode="comments"] .ib-context-chip {
  position: static !important;
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 2px 11px;
  border-radius: 999px;
  color: #59606c;
  background: #eceef6;
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
}
body[data-mode="comments"] .context-header {
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 7px;
  min-width: 0;
  padding: 13px 14px 12px;
}
body[data-mode="comments"] .profile-initials {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  font-size: 10px;
}
body[data-mode="comments"] .profile-initials::after {
  display: none;
}
body[data-mode="comments"] .context-title {
  min-width: 0;
  align-self: center;
}
body[data-mode="comments"] #profileName {
  display: block;
  overflow: hidden;
  color: #1f2530;
  font-size: 15.5px;
  font-weight: 800;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="comments"] #profileMeta {
  display: inline-flex !important;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  overflow: hidden;
  color: #555c68;
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  text-decoration: none !important;
  white-space: nowrap;
}
body[data-mode="comments"] #profileMeta::after {
  content: "";
  width: 11px;
  height: 11px;
  flex: 0 0 11px;
  background: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M3 12h18M12 3c2.5 2.5 3.7 5.5 3.7 9S14.5 18.5 12 21M12 3C9.5 5.5 8.3 8.5 8.3 12S9.5 18.5 12 21' fill='none' stroke='black' stroke-width='1.7'/%3E%3C/svg%3E");
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}
body[data-mode="comments"] .ib-capture-button,
body[data-mode="comments"] .context-facts,
body[data-mode="comments"] #matchChip {
  display: none !important;
}
body[data-mode="comments"] .recent-context {
  position: static !important;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
}
body[data-mode="comments"] .context-body {
  display: -webkit-box;
  min-width: 0;
  margin: 0 13px;
  padding: 4px 12px;
  overflow: hidden;
  border-left: 4px solid #c9b7e9;
  color: #353b46;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
body[data-mode="comments"] .context-secondary-body,
body[data-mode="comments"] .context-footer {
  display: none !important;
}
body[data-mode="comments"] .ib-comment-footer {
  display: flex !important;
  margin: 11px 0 0;
  padding: 7px 13px 8px;
  border-top: 1px solid #e9e9f0;
  color: #6c52ba;
  background: rgba(248, 247, 255, .55);
  font-size: 11px;
}
body[data-mode="comments"] .ib-comment-stats {
  gap: 12px;
  min-width: 0;
  color: #5d536f;
}
body[data-mode="comments"] .ib-comment-stat {
  gap: 4px;
  min-width: 0;
}
body[data-mode="comments"] .ib-comment-stat svg {
  width: 16px;
  height: 16px;
  color: #7357c8;
  fill: none !important;
}
body[data-mode="comments"] .ib-view-post {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  color: #6846bd;
  font-size: 11.5px;
  font-weight: 800;
  text-decoration: none;
}
body[data-mode="comments"] .ib-view-post svg {
  width: 13px;
  height: 13px;
  fill: none !important;
}

/* AI Draft, DM-style regenerate control, editor, vibe and length controls. */
body[data-mode="comments"] .ib-draft-card {
  order: 6;
  width: auto;
  min-width: 0;
  margin: 13px 24px 16px;
  padding: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
body[data-mode="comments"] .ib-draft-head {
  min-height: 29px;
  margin: 0 0 8px;
}
body[data-mode="comments"] .ib-spark-icon,
body[data-mode="comments"] #draftEyebrow {
  display: none !important;
}
body[data-mode="comments"] #draftTitle {
  color: #1f2530;
  font-size: 16px;
  font-weight: 850;
  line-height: 1.1;
}
body[data-mode="comments"] .ib-regenerate-proxy {
  display: inline-flex !important;
  gap: 3px;
  font-size: 10px;
}
body[data-mode="comments"] .ib-regenerate-proxy > svg { display: block !important; width: 14px; height: 14px; }
body[data-mode="comments"] .ib-regenerate-proxy > span { display: inline !important; }
body[data-mode="comments"] .ib-editor-shell {
  position: relative;
  min-height: 110px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #ded8ef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 3px 8px rgba(26, 33, 49, .10);
}
body[data-mode="comments"] .ib-editor-shell::after {
  content: "✦✧";
  position: absolute;
  top: 8px;
  right: 9px;
  color: #ded8f3;
  font-size: 18px;
  letter-spacing: -5px;
  pointer-events: none;
}
body[data-mode="comments"] #messageEditor {
  width: 100%;
  min-height: 110px;
  height: 110px;
  max-height: 110px;
  padding: 11px 29px 23px 12px;
  overflow-y: auto;
  resize: none;
  border: 0;
  border-radius: 12px;
  color: #262c36;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.47;
  box-shadow: none;
}
body[data-mode="comments"] #messageEditor:focus {
  border: 0;
  box-shadow: inset 0 0 0 2px rgba(115, 87, 200, .16);
}
body[data-mode="comments"] .ib-char-hint {
  right: 12px;
  bottom: 7px;
  padding: 4px 9px;
  border-radius: 999px;
  color: #9298a4;
  background: #f4f4f8;
  font-size: 10.5px;
  line-height: 1.35;
}
body[data-mode="comments"] .ib-style-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
}
body[data-mode="comments"] .ib-tone-control,
body[data-mode="comments"] .ib-length-control {
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}
body[data-mode="comments"] .ib-tone-control button {
  position: relative;
  min-width: 0;
  min-height: 52px;
  padding: 7px 4px 8px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #454c58;
  background: #eff0f7;
  font-size: 0;
  font-weight: 750;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="comments"] .ib-tone-control button::before {
  content: "";
  display: block;
  width: 19px;
  height: 19px;
  margin: 0 auto 4px;
  background: currentColor;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}
body[data-mode="comments"] .ib-tone-control button:nth-child(1)::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M8.5 14.5c.9 1 2.1 1.5 3.5 1.5s2.6-.5 3.5-1.5M9 9.5h.01M15 9.5h.01' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
}
body[data-mode="comments"] .ib-tone-control button:nth-child(2)::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.5 20h5M10.5 17h3M8.5 13.5A5.2 5.2 0 1 1 17 9.5c0 1.8-.8 3.1-2 4.2-.8.7-1.1 1.5-1.2 2.3h-3.6c-.1-.9-.5-1.7-1.3-2.5Z' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M5.5 7.5H3M6.5 4.5 5 2.8M18.5 7.5H21M17.5 4.5 19 2.8' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E");
}
body[data-mode="comments"] .ib-tone-control button:nth-child(3)::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m8.2 12.8 2.4 2.4c.8.8 2 .8 2.8 0l4.8-4.8M8.2 12.8 5.5 10c-.8-.8-2-.8-2.8 0s-.8 2 0 2.8l5.2 5.2c1.6 1.6 4.2 1.6 5.8 0l7.6-7.6c.8-.8.8-2 0-2.8s-2-.8-2.8 0l-.7.7M8.2 12.8l3.4-3.4c.8-.8 2-.8 2.8 0l1.2 1.2' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
body[data-mode="comments"] .ib-tone-control button::after {
  display: block;
  overflow: hidden;
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="comments"] .ib-tone-control button:nth-child(1)::after { content: "Friendly"; }
body[data-mode="comments"] .ib-tone-control button:nth-child(2)::after { content: "Insightful"; }
body[data-mode="comments"] .ib-tone-control button:nth-child(3)::after { content: "Supportive"; }
body[data-mode="comments"] .ib-tone-control button.active {
  color: #704fc5;
  border-color: #cbbfeb;
  background: #eeeafb;
  box-shadow: none;
}
body[data-mode="comments"] .ib-length-control {
  display: grid !important;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #f2f2f8;
}
body[data-mode="comments"] .ib-length-control button {
  min-width: 0;
  min-height: 25px;
  padding: 4px 5px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #4f5662;
  background: transparent;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
  text-overflow: ellipsis;
  transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease;
  white-space: nowrap;
}
body[data-mode="comments"] .ib-length-control button:hover {
  border-color: #e0e3ea;
  background: rgba(255, 255, 255, .7);
}
body[data-mode="comments"] .ib-length-control button.active {
  color: #232935;
  border-color: #e2e4ea;
  background: #fff;
  box-shadow: 0 2px 6px rgba(31, 38, 52, .09);
}
body[data-mode="comments"] .draft-loading {
  min-height: 110px;
}

@media (max-width: 340px) {
  body[data-mode="comments"] .action-dock,
  body[data-mode="comments"] #panelScroll,
  body[data-mode="comments"] .ib-draft-card {
    margin-inline: 0;
    padding-left: 12px;
    padding-right: 12px;
  }
  body[data-mode="comments"] .ib-draft-card {
    margin-left: 12px;
    margin-right: 12px;
    padding-left: 0;
    padding-right: 0;
  }
  body[data-mode="comments"] .action-dock { grid-template-columns: minmax(0, .76fr) minmax(0, 1.4fr); gap: 7px; }
  body[data-mode="comments"] .action-dock .btn { font-size: 9.8px; }
  body[data-mode="comments"] .context-body,
  body[data-mode="comments"] #messageEditor { font-size: 11px; }
  body[data-mode="comments"] .ib-tone-control { gap: 6px; }
  body[data-mode="comments"] .ib-length-control { gap: 4px; }
  body[data-mode="comments"] .ib-tone-control button::after,
  body[data-mode="comments"] .ib-length-control button { font-size: 8.7px; }
}

/* v1.5.5 — PDF-matched Conversation mode with bottom vibe and length controls. */
body[data-mode="conversation"] .react-page-root {
  overflow-x: hidden;
  overflow-y: auto;
}

/* Active-thread label and clipped conversation card. */
body[data-mode="conversation"] #panelScroll {
  order: 4;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  overflow: visible;
  padding: 17px 24px 0;
}
body[data-mode="conversation"] .ib-workspace,
body[data-mode="conversation"] .context-card,
body[data-mode="conversation"] .recent-context,
body[data-mode="conversation"] .context-body {
  min-width: 0;
  max-width: 100%;
}
body[data-mode="conversation"] .context-card {
  position: relative;
  min-height: 0;
  padding-top: 25px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
body[data-mode="conversation"] .context-card::before {
  content: "";
  position: absolute;
  inset: 25px 0 0;
  border: 1px solid #e8e9ef;
  border-left: 4px solid #0f827c;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 9px rgba(25, 31, 46, .08);
  z-index: 0;
}
body[data-mode="conversation"] .context-card > * {
  position: relative;
  z-index: 1;
}
body[data-mode="conversation"] .ib-context-eyebrow {
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  min-height: 18px;
  padding: 0 112px 0 0;
  color: #454b57;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: .075em;
  line-height: 18px;
}
body[data-mode="conversation"] .ib-context-chip {
  position: static !important;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  color: #08766f;
  background: transparent;
  font-size: 12px;
  font-weight: 800;
  line-height: 18px;
}
body[data-mode="conversation"] .ib-context-chip::before {
  content: "";
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  background: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}
body[data-mode="conversation"] .context-header {
  width: calc(100% - 4px);
  min-height: 47px;
  margin-left: 4px;
  grid-template-columns: 32px minmax(0, 1fr) 28px;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 0 13px 0 0;
  background: #fafaff;
}
body[data-mode="conversation"] .profile-initials {
  width: 31px;
  height: 31px;
  font-size: 9px;
  box-shadow: none;
}
body[data-mode="conversation"] .profile-initials::after {
  width: 9px;
  height: 9px;
  margin: 23px 0 0 23px;
  border-width: 1.5px;
}
body[data-mode="conversation"] #profileName {
  font-size: 15.5px;
  line-height: 1.12;
}
body[data-mode="conversation"] #profileMeta {
  margin-top: 2px;
  color: #424854;
  font-size: 10px;
  font-weight: 800;
}
body[data-mode="conversation"] .ib-capture-button {
  width: 28px;
  height: 28px;
}
body[data-mode="conversation"] .ib-capture-button svg { width: 19px; height: 19px; }
body[data-mode="conversation"] .context-facts,
body[data-mode="conversation"] .ib-comment-footer,
body[data-mode="conversation"] .context-footer,
body[data-mode="conversation"] .context-secondary-body {
  display: none !important;
}
body[data-mode="conversation"] .recent-context {
  position: static !important;
  width: calc(100% - 4px);
  margin: 0 0 0 4px;
  padding: 0;
  border: 0;
  background: transparent;
}
body[data-mode="conversation"] .recent-context-header {
  position: absolute;
  top: -2px;
  right: 0;
  display: flex !important;
  min-height: 18px;
  margin: 0;
  color: #08766f;
  letter-spacing: 0;
  text-transform: none;
}
body[data-mode="conversation"] #recentContextLabel { display: none !important; }
body[data-mode="conversation"] .context-body {
  display: block;
  width: 100%;
  height: 220px;
  max-height: 220px;
  padding: 2px 8px 12px;
  overflow-x: hidden;
  overflow-y: auto;
  overflow-anchor: none;
  overscroll-behavior: contain;
  scrollbar-color: #91bbb7 transparent;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  border-radius: 0 0 13px 0;
  color: #252b35;
  background: #fff;
  font-size: 13px;
  line-height: 1.5;
  white-space: normal;
  -webkit-line-clamp: unset;
}
body[data-mode="conversation"] .context-body::-webkit-scrollbar { width: 6px; }
body[data-mode="conversation"] .context-body::-webkit-scrollbar-track { background: transparent; }
body[data-mode="conversation"] .context-body::-webkit-scrollbar-thumb {
  border: 1px solid #fff;
  border-radius: 999px;
  background: #91bbb7;
}
body[data-mode="conversation"] .context-body::-webkit-scrollbar-thumb:hover { background: #6ba39e; }
body[data-mode="conversation"] .ib-thread-message {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  margin: 0 0 6px;
}
body[data-mode="conversation"] .ib-thread-message.is-contact { align-items: flex-start; }
body[data-mode="conversation"] .ib-thread-message.is-self { align-items: flex-end; }
body[data-mode="conversation"] .ib-thread-time {
  align-self: flex-start;
  margin: 4px 4px 9px;
  color: #454b56;
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1;
  transform: translateY(-5px);
}
body[data-mode="conversation"] .ib-thread-message.is-contact .ib-thread-time { align-self: flex-end; }
body[data-mode="conversation"] .ib-thread-bubble {
  max-width: 82%;
  padding: 10px 12px;
  overflow-wrap: anywhere;
  border-radius: 12px;
  color: #202630;
  background: #f0f1fc;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}
body[data-mode="conversation"] .ib-thread-message.is-self .ib-thread-bubble {
  max-width: 80%;
  margin-right: 4px;
  border: 1px solid #a8e6e7;
  background: #e1f6f5;
}
body[data-mode="conversation"] .ib-thread-message.is-contact .ib-thread-bubble {
  max-width: 84%;
  border-radius: 0 12px 12px 12px;
}
body[data-mode="conversation"] .ib-thread-message.is-unknown .ib-thread-bubble { background: #f3f4f7; }

/* Suggested reply card and joined Copy / Reset footer. */
body[data-mode="conversation"] .ib-draft-card {
  order: 5;
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 0 0 auto;
  flex-direction: column;
  margin: 15px 24px 0;
  padding: 9px 11px 10px;
  overflow: hidden;
  border: 1px solid #e8e9ef;
  border-bottom: 0;
  border-radius: 14px 14px 0 0;
  background: #fff;
  box-shadow: none;
}
body[data-mode="conversation"] .ib-draft-head {
  order: 1;
  min-height: 34px;
  margin: 0 0 8px;
}
body[data-mode="conversation"] .ib-draft-head > div { gap: 8px; }
body[data-mode="conversation"] .ib-spark-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  color: #087a75;
  background: #e7f3f2;
  font-size: 18px;
  line-height: 1;
}
body[data-mode="conversation"] #draftTitle {
  font-size: 16.5px;
  font-weight: 850;
  letter-spacing: -.28px;
}
body[data-mode="conversation"] .ib-regenerate-proxy {
  display: inline-flex !important;
  gap: 3px;
  font-size: 10px;
}
body[data-mode="conversation"] .ib-regenerate-proxy > svg { display: block !important; width: 14px; height: 14px; }
body[data-mode="conversation"] .ib-regenerate-proxy > span { display: inline !important; }
body[data-mode="conversation"] .ib-editor-shell {
  order: 2;
  width: 100%;
  min-width: 0;
  min-height: 140px;
  height: 140px;
  overflow: hidden;
  border: 0;
  border-radius: 10px;
  background: #f8f8ff;
  box-shadow: none;
}
body[data-mode="conversation"] .ib-editor-shell::after { display: none; }
body[data-mode="conversation"] #messageEditor {
  width: 100%;
  min-width: 0;
  min-height: 140px;
  height: 140px;
  max-height: 140px;
  padding: 12px 12px 25px;
  overflow-y: auto;
  resize: none;
  border: 0;
  border-radius: 10px;
  color: #222832;
  background: #f8f8ff;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.53;
  box-shadow: none;
}
body[data-mode="conversation"] #messageEditor:focus {
  border: 0;
  box-shadow: inset 0 0 0 2px rgba(13, 125, 118, .14);
}
body[data-mode="conversation"] .ib-char-hint {
  right: 10px;
  bottom: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  color: #9a9faa;
  background: #f0f0f7;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
}
body[data-mode="conversation"] .draft-loading {
  order: 2;
  min-height: 140px;
}

body[data-mode="conversation"] .action-dock {
  order: 6;
  min-width: 0;
  max-width: 100%;
  flex: 0 0 auto;
  grid-template-areas: "copy reset";
  grid-template-columns: minmax(0, .62fr) minmax(0, 1fr);
  gap: 0;
  margin: 0 24px;
  padding: 6px 11px 11px;
  border: 1px solid #e8e9ef;
  border-top: 0;
  border-radius: 0 0 14px 14px;
  background: #fff;
  box-shadow: 0 4px 10px rgba(25, 31, 46, .08);
}
body[data-mode="conversation"] .action-dock .btn {
  min-width: 0;
  min-height: 40px;
  gap: 8px;
  border-radius: 10px !important;
  font-size: 12px;
  font-weight: 800;
}
body[data-mode="conversation"] .action-dock .btn svg { width: 18px; height: 18px; }
body[data-mode="conversation"] .copy-button {
  border-color: #075ca4;
  background: #075ca4;
  box-shadow: 0 4px 9px rgba(7, 92, 164, .20);
}
body[data-mode="conversation"] .stop-refresh-button {
  color: #4b515d;
  background: #eff0f9;
}

/* Comments-style vibes and DM-style length selector, fixed below the reply. */
body[data-mode="conversation"] .ib-style-controls {
  order: 7;
  display: grid !important;
  width: auto;
  min-width: 0;
  max-width: 100%;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin: 12px 24px 20px;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
}
body[data-mode="conversation"] .ib-tone-control,
body[data-mode="conversation"] .ib-length-control {
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}
body[data-mode="conversation"] .ib-tone-control { gap: 8px; }
body[data-mode="conversation"] .ib-tone-control button {
  position: relative;
  min-width: 0;
  min-height: 52px;
  padding: 7px 4px 8px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #454c58;
  background: #eff0f7;
  font-size: 0;
  font-weight: 750;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="conversation"] .ib-tone-control button::before {
  content: "";
  display: block;
  width: 19px;
  height: 19px;
  margin: 0 auto 4px;
  background: currentColor;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}
body[data-mode="conversation"] .ib-tone-control button:nth-child(1)::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M8.5 14.5c.9 1 2.1 1.5 3.5 1.5s2.6-.5 3.5-1.5M9 9.5h.01M15 9.5h.01' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
}
body[data-mode="conversation"] .ib-tone-control button:nth-child(2)::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.5 20h5M10.5 17h3M8.5 13.5A5.2 5.2 0 1 1 17 9.5c0 1.8-.8 3.1-2 4.2-.8.7-1.1 1.5-1.2 2.3h-3.6c-.1-.9-.5-1.7-1.3-2.5Z' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M5.5 7.5H3M6.5 4.5 5 2.8M18.5 7.5H21M17.5 4.5 19 2.8' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E");
}
body[data-mode="conversation"] .ib-tone-control button:nth-child(3)::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m8.2 12.8 2.4 2.4c.8.8 2 .8 2.8 0l4.8-4.8M8.2 12.8 5.5 10c-.8-.8-2-.8-2.8 0s-.8 2 0 2.8l5.2 5.2c1.6 1.6 4.2 1.6 5.8 0l7.6-7.6c.8-.8.8-2 0-2.8s-2-.8-2.8 0l-.7.7M8.2 12.8l3.4-3.4c.8-.8 2-.8 2.8 0l1.2 1.2' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
body[data-mode="conversation"] .ib-tone-control button::after {
  display: block;
  overflow: hidden;
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="conversation"] .ib-tone-control button:nth-child(1)::after { content: "Friendly"; }
body[data-mode="conversation"] .ib-tone-control button:nth-child(2)::after { content: "Insightful"; }
body[data-mode="conversation"] .ib-tone-control button:nth-child(3)::after { content: "Supportive"; }
body[data-mode="conversation"] .ib-tone-control button.active {
  color: #704fc5;
  border-color: #cbbfeb;
  background: #eeeafb;
  box-shadow: none;
}
body[data-mode="conversation"] .ib-length-control {
  display: grid !important;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #f2f2f8;
}
body[data-mode="conversation"] .ib-length-control button {
  min-width: 0;
  min-height: 25px;
  padding: 4px 5px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #4f5662;
  background: transparent;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body[data-mode="conversation"] .ib-length-control button.active {
  color: #232935;
  border-color: #e2e4ea;
  background: #fff;
  box-shadow: 0 2px 6px rgba(31, 38, 52, .09);
}
body[data-mode="conversation"]:has(#emptyState:not(.hidden)) .ib-style-controls { display: none !important; }

@media (max-height: 760px) {
  body[data-mode="conversation"] #panelScroll { padding: 10px 17px 0; }
  body[data-mode="conversation"] .context-card { padding-top: 21px; }
  body[data-mode="conversation"] .context-card::before { inset: 21px 0 0; border-radius: 12px; }
  body[data-mode="conversation"] .ib-context-eyebrow { top: 0; font-size: 10px; line-height: 15px; }
  body[data-mode="conversation"] .ib-context-chip { font-size: 10.5px; line-height: 15px; }
  body[data-mode="conversation"] .ib-context-chip::before { font-size: 13px; }
  body[data-mode="conversation"] .context-header {
    min-height: 43px;
    grid-template-columns: 30px minmax(0, 1fr) 25px;
    gap: 8px;
    padding: 6px 7px;
  }
  body[data-mode="conversation"] .profile-initials { width: 30px; height: 30px; }
  body[data-mode="conversation"] .profile-initials::after { width: 8px; height: 8px; margin: 22px 0 0 22px; }
  body[data-mode="conversation"] #profileName { font-size: 13.5px; }
  body[data-mode="conversation"] #profileMeta { font-size: 8.8px; }
  body[data-mode="conversation"] .context-body { height: 155px; max-height: 155px; padding-inline: 7px; }
  body[data-mode="conversation"] .ib-thread-time { margin: 3px 3px 6px; font-size: 9px; }
  body[data-mode="conversation"] .ib-thread-bubble { max-width: 84%; padding: 7px 9px; font-size: 10.8px; line-height: 1.4; }
  body[data-mode="conversation"] .ib-thread-message { margin-bottom: 4px; }

  body[data-mode="conversation"] .ib-draft-card { margin: 10px 17px 0; padding: 8px 10px 6px; }
  body[data-mode="conversation"] .ib-draft-head { min-height: 29px; margin-bottom: 6px; }
  body[data-mode="conversation"] .ib-spark-icon { width: 26px; height: 26px; font-size: 16px; }
  body[data-mode="conversation"] #draftTitle { font-size: 14.5px; }
  body[data-mode="conversation"] .ib-editor-shell,
  body[data-mode="conversation"] #messageEditor { min-height: 96px; height: 96px; max-height: 96px; }
  body[data-mode="conversation"] #messageEditor { padding: 9px 10px 22px; font-size: 11px; line-height: 1.4; }
  body[data-mode="conversation"] .draft-loading { min-height: 96px; }
  body[data-mode="conversation"] .action-dock { margin: 0 17px; padding: 3px 10px 10px; }
  body[data-mode="conversation"] .action-dock .btn { min-height: 37px; font-size: 10.5px; }
  body[data-mode="conversation"] .ib-style-controls { gap: 7px; margin: 10px 17px 14px; }
  body[data-mode="conversation"] .ib-tone-control button { min-height: 44px; padding: 5px 3px; }
  body[data-mode="conversation"] .ib-tone-control button::before { width: 16px; height: 16px; margin-bottom: 2px; }
  body[data-mode="conversation"] .ib-tone-control button::after { font-size: 9.5px; }
  body[data-mode="conversation"] .ib-length-control { padding: 3px; }
  body[data-mode="conversation"] .ib-length-control button { min-height: 24px; font-size: 9px; }
}

@media (max-width: 340px) {
  body[data-mode="conversation"] #panelScroll { padding-inline: 14px; }
  body[data-mode="conversation"] .ib-draft-card,
  body[data-mode="conversation"] .action-dock,
  body[data-mode="conversation"] .ib-style-controls { margin-inline: 14px; }
  body[data-mode="conversation"] .context-header { grid-template-columns: 30px minmax(0, 1fr) 24px; gap: 7px; }
  body[data-mode="conversation"] #profileName { font-size: 13px; }
  body[data-mode="conversation"] #profileMeta { font-size: 8px; }
  body[data-mode="conversation"] .ib-thread-bubble { max-width: 88%; font-size: 10.5px; }
  body[data-mode="conversation"] .ib-tone-control { gap: 6px; }
  body[data-mode="conversation"] .ib-tone-control button::after,
  body[data-mode="conversation"] .ib-length-control button { font-size: 8.5px; }
  body[data-mode="conversation"] .action-dock .btn {
    gap: 4px;
    padding: 5px 4px;
    font-size: 9.5px;
    white-space: nowrap;
  }
}

/* v1.5.13 — Four real, mode-specific vibe choices without panel overflow. */
body[data-mode="dms"] .ib-tone-control,
body[data-mode="comments"] .ib-tone-control,
body[data-mode="conversation"] .ib-tone-control {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
body[data-mode="comments"] .ib-tone-control,
body[data-mode="conversation"] .ib-tone-control {
  gap: 7px;
}
body[data-mode="comments"] .ib-tone-control button::after,
body[data-mode="conversation"] .ib-tone-control button::after {
  content: attr(data-display-label) !important;
}

/* Friendly — open smile. */
body[data-mode="comments"] .ib-tone-control button[data-value="professional"]::before,
body[data-mode="conversation"] .ib-tone-control button[data-value="neutral"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M8.5 14.5c.9 1 2.1 1.5 3.5 1.5s2.6-.5 3.5-1.5M9 9.5h.01M15 9.5h.01' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
}
/* Insightful — lightbulb. */
body[data-mode="comments"] .ib-tone-control button[data-value="neutral"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.5 20h5M10.5 17h3M8.5 13.5A5.2 5.2 0 1 1 17 9.5c0 1.8-.8 3.1-2 4.2-.8.7-1.1 1.5-1.2 2.3h-3.6c-.1-.9-.5-1.7-1.3-2.5Z' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
/* Professional — briefcase. */
body[data-mode="conversation"] .ib-tone-control button[data-value="professional"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='3.5' y='7' width='17' height='12.5' rx='2' fill='none' stroke='black' stroke-width='1.8'/%3E%3Cpath d='M8.5 7V5.5c0-.8.6-1.4 1.4-1.4h4.2c.8 0 1.4.6 1.4 1.4V7M3.8 11.5h16.4M10.5 11.5v2h3v-2' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
/* Funny — a laughing face, deliberately distinct from Friendly. */
body[data-mode="comments"] .ib-tone-control button[data-value="funny"]::before,
body[data-mode="conversation"] .ib-tone-control button[data-value="funny"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='1.9'/%3E%3Cpath d='m7.5 9 2-1.2M16.5 9l-2-1.2M8 13.2h8c-.4 2.3-1.8 3.6-4 3.6s-3.6-1.3-4-3.6Z' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
/* Supportive — helping hands. */
body[data-mode="comments"] .ib-tone-control button[data-value="engaging"]::before,
body[data-mode="conversation"] .ib-tone-control button[data-value="engaging"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='m8.2 12.8 2.4 2.4c.8.8 2 .8 2.8 0l4.8-4.8M8.2 12.8 5.5 10c-.8-.8-2-.8-2.8 0s-.8 2 0 2.8l5.2 5.2c1.6 1.6 4.2 1.6 5.8 0l7.6-7.6c.8-.8.8-2 0-2.8s-2-.8-2.8 0l-.7.7M8.2 12.8l3.4-3.4c.8-.8 2-.8 2.8 0l1.2 1.2' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

@media (max-width: 340px) {
  body[data-mode="dms"] .ib-tone-control button { padding-inline: 2px; font-size: 8.4px; }
  body[data-mode="comments"] .ib-tone-control,
  body[data-mode="conversation"] .ib-tone-control { gap: 5px; }
  body[data-mode="comments"] .ib-tone-control button::after,
  body[data-mode="conversation"] .ib-tone-control button::after { font-size: 8.1px; }
}

`;
  const target = document.head || document.documentElement;
  if (!target) return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute("data-icebreaker-theme", "sidepanel-reference");
    target.appendChild(style);
  }
  style.textContent = CSS_TEXT;
})();
