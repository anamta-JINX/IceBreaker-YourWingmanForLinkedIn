# Source Code Guide — IceBreaker 1.4.90

- `.env` — four official key slots: two Groq and two OpenRouter.
- `scripts/api/Build-Official-Keys.bat` / `scripts/api/Build-Official-Keys.ps1` — convert `.env` values into the runtime key configuration.
- `src/backend/config/official-api-keys.js` — generated runtime key pool imported only by the background service worker.
- `manifest.json` — Chrome extension configuration and version.
- `src/backend/background/service-worker.js` — provider generation, official-key rotation/failover, manual-key validation, Autopilot state, classification, résumé selection, draft records, and logs.
- `src/backend/content/linkedin-content.js` — LinkedIn hover extraction, DMs/Comments/Conversation modes, automatic card scanning, composer handling, recipient verification, message insertion, résumé attachment, and safe continuation.
- `src/frontend/sidepanel/index.html`, `src/frontend/sidepanel/sidepanel-theme.js`, `src/frontend/sidepanel/sidepanel.js` — fixed LinkedIn-style panel, official provider controls, dynamic My Groq/My OpenRouter control, and Autopilot controls.
- `src/frontend/options/index.html`, `src/frontend/options/options-theme.js`, `src/frontend/options/options.js` — profile, Official API/Manual API, provider, model, and message settings.
- `src/frontend/options/autopilot-settings.js` — Autopilot settings, AI Resume, saved drafts, and diagnostics.
- `src/frontend/shared/resume-parsers.js` — PDF, DOCX, and text résumé extraction helpers.
- `assets/` — IceBreaker and official provider artwork.

Autopilot continues to reuse IceBreaker’s normal DM generator. It does not contain a second AI prompt or provider implementation.
