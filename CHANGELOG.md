# Changelog

## 1.5.14

- Fixed Alt+G Conversation regeneration so it captures the open thread before opening the side panel, removing the panel-activation race behind `E-RPL-16` and intermittent `E-RPL-08` failures.
- Preserved the current conversation row and thread when the side panel becomes active; those targets are now cleared only when the panel closes or the user changes context.
- Added bounded recovery when LinkedIn replaces its message pane during capture, including re-detection of the new shell for the same participant.
- Added a guarded Alt+G fallback to the full structured transcript already backing the visible draft when live recapture briefly fails; preview-only context, another tab, another full-page thread, and stale cached context are rejected.
- Added explicit shortcut diagnostic codes and automated coverage for recoverable errors, structured-context validation, tab/thread isolation, candidate priority, and cache expiry.

## 1.5.13

- Expanded the DMs vibe selector to four choices: Professional, Casual, Funny, and Engaging.
- Expanded Comments to Friendly, Funny, Insightful, and Supportive, with a distinct contextual-humor icon and prompt path.
- Reworked Conversation vibes as Friendly, Professional, Supportive, and Funny, each with mode-specific prompt semantics.
- Made all four choices real generation values rather than cosmetic labels, while retaining the situational, non-generic humor rules from v1.5.12.
- Reflowed the controls into four equal responsive columns and verified DMs, Comments, and Conversation at 406 px and 300 px without horizontal overflow or clipped labels.

## 1.5.12

- Set the exact inclusive generation ranges to Short 15–20 words, Medium 30–40 words, and Long 60–200 words across DMs, Comments, and Conversation replies.
- Reworked manual DM prompting around specific, two-way connection building: concrete recipient context, a truthful relevance bridge, and an easy reason to respond replace generic networking filler and immediate transactional asks.
- Added mode-aware vibe instructions and required any humor to be genuinely situational and context-specific, blocking canned jokes, generic banter, meme filler, and forced punchlines.
- Added one automatic correction pass when a model misses the selected range or leaves its final sentence unfinished.
- Replaced arbitrary word clipping with complete-sentence boundary enforcement and reject any residual fragment instead of displaying text cut off mid-sentence.
- Increased Groq, OpenRouter, and Ollama output budgets for 200-word drafts and detect provider length-limit finishes before incomplete text reaches the editor.
- Preserved the Conversation mode newest-15 transcript capture and stabilized the expected inbox-row-to-thread navigation during hover capture.

## 1.5.11

- Fixed Conversation mode silently replacing the open thread with a one-line inbox preview when LinkedIn truncated or reformatted the newest-message snippet.
- Made the exact open thread authoritative and wait for its stable bottom message window before generating; explicit capture now opens the selected row when necessary instead of generating from preview-only context.
- Preserved separate messages when LinkedIn nests several message bodies inside one event container, with bubble-level sender evidence taking priority over mixed outer-container metadata.
- Continued supplying the newest 15 available messages in chronological order to both the Active Thread viewer and reply prompt.
- Added regressions for truncated previews, stale previews, nested multi-message events, virtualized message windows, sender direction, and newest-15 prompt retention.

## 1.5.10

- Added the same working icon-and-label Regenerate control from DMs to the Comments and Conversation draft headers.
- Removed the decorative lightbulb/sliders and edit/menu icon clusters that occupied the Regenerate position in those modes.
- Preserved the existing generation handler, draft layouts, vibe and length controls, latest-thread capture, and responsive behavior.
- Verified the controls at standard and narrow side-panel sizes without horizontal overflow.

## 1.5.9

- Unified Conversation mode's header, mode navbar, and provider/model row with the exact shared UI used by DMs and Comments.
- Removed Conversation-only sizing, spacing, typography, icon, and responsive overrides from the shared top chrome.
- Restored the shared brand slogan and model-row actions while preserving the Conversation thread, reply, vibe, length, capture, and generation logic.
- Verified matching top-chrome geometry at standard and narrow side-panel sizes without horizontal overflow.

## 1.5.8

- Increased Conversation capture from the newest 8 messages to the newest 15 available messages while preserving chronological order.
- Added bottom-of-thread settling so LinkedIn finishes rendering its latest virtualized message window before IceBreaker captures it.
- Fixed prompt truncation so long conversations preserve the newest messages instead of cutting them off after older or middle context.
- Made the Active Thread context body independently scrollable and rendered all captured messages rather than only six bubbles.
- Automatically opens the context scroller at the newest message and labels the exact latest-message count used for the reply.
- Added regression coverage for a 20-message thread, the newest-15 prompt window, internal scrolling, and narrow no-overflow layouts.

## 1.5.7

- Fixed Conversation mode so the exact hovered inbox row is resolved before LinkedIn's broad Messaging container.
- Made the visible thread header and thread-specific ARIA identity authoritative once the conversation is open.
- Prevented a stale or first active inbox row from supplying the wrong participant name, profile URL, avatar, or sender-direction hints.
- Narrowed conversation capture to the local thread wrapper instead of combining the inbox list and open message thread.
- Added a two-person regression fixture that verifies hovering Sarah while Alice is the first active inbox row still captures Sarah and the correct transcript.
- Synced the service-worker and content-detector versions so already-open LinkedIn tabs receive the targeting repair after refresh.

## 1.5.6

- Fixed Conversation capture so LinkedIn message-body elements are resolved to their complete message events before sender detection.
- Added confidence-ranked direction evidence: explicit outgoing/incoming markers and sender identities outrank message-group propagation, inbox previews, and visual alignment.
- Prevented an unprefixed inbox preview or generic left-aligned container from relabeling a verified user message as the contact's message.
- Preserved the ordered structured message list through generation and explicitly supplied the latest verified contact and user messages to the reply prompt.
- Added fail-safe `E-RPL-05` handling when the newest sender is genuinely ambiguous instead of generating a reply from a guessed direction.
- Synced the content-script detector version so already-open LinkedIn tabs receive the repaired classifier after the extension update.

## 1.5.5

- Rebuilt Conversation mode to match the supplied 406 x 891 PDF, including the full-scale header stack, Active Thread card, directional message bubbles, AI Suggested Reply editor, and joined Copy Reply / Reset actions.
- Added the Comments-style Friendly / Insightful / Supportive vibe row and the DM-style Short / Medium / Long selector beneath the reply card.
- Preserved captured LinkedIn message direction and timestamps for the visual thread without changing the reply-generation transcript or provider logic.
- Kept Autopilot hidden in Conversation mode while preserving its existing runtime implementation.
- Verified the native reference size and responsive 340 x 720 and 300 x 720 layouts without horizontal overflow or clipped controls.

## 1.5.4

- Matched the Comments mode action row, post context card, AI Draft editor, and tone controls to the supplied PDF at its native 406 x 891 side-panel size.
- Added a compact Short / Medium / Long selector beneath the comment tone controls, using the same minimal treatment as DM mode.
- Limited the LinkedIn post preview to the PDF's three-line excerpt and corrected the avatar, footer, editor, character counter, and tone-control proportions.
- Kept the header, mode navigation, provider/model controls, Autopilot implementation, and generation behavior unchanged.
- Verified responsive layouts down to 300 px without horizontal overflow.

## 1.5.2

- Rebuilt Comments mode below the provider/model bar to match the supplied Comments Mode PDF.
- Removed the visible Autopilot area from Comments mode.
- Added the exact Reset / Copy Comment action row, Reading Context post card, AI Draft card, comment-vibe icons, and Short / Medium / Long controls.
- Added live hovered-post author photos, post age, reaction count, comment count, correct View Post destination, and editable character count.
- Preserved provider selection, model selection, hover extraction, generation, copying, resetting, tone/length storage, and Chrome messaging.
- Added responsive safeguards for side-panel widths down to 300 px without horizontal overflow.

## 1.5.1

- Rounded the DMs vibe, length, Copy Message, and Reset controls to match the supplied side-panel reference.
- Added hovered LinkedIn profile photos to the DMs, Comments, and Conversation context cards with initials as a fallback.
- Preserved all existing generation, hover detection, mode switching, copy, reset, and provider functionality.

## 1.5.0 — Clean PDF-matched side panel

- Removed the visible Autopilot card from every side-panel mode.
- Preserved the existing Autopilot runtime and settings hooks so no background functionality is deleted.
- Kept DMs, Comments, Conversation, and Empty State layouts unchanged otherwise.
- Kept all controller-required DOM IDs available in a permanently hidden compatibility container.
- Prevented the Autopilot section from reappearing through mode-specific styles.

## 1.4.99 - Compact overflow-safe DMs panel

- Removed the Role, Company, and Location fact bubbles from the DMs profile card.
- Resized the DMs Autopilot, context, message, editor, and joined action sections to the supplied PDF scale.
- Preserved separate three-option Vibe and Length rows while preventing horizontal overflow.
- Preserved all controller IDs and existing generation, hover, Autopilot, Regenerate, Copy, and Reset behavior.

## 1.4.97 - Exact PDF-matched DMs panel


## 1.4.98

- Restored all three DMs vibe choices: Professional, Casual, and Engaging.
- Added a dedicated length row directly below with Short, Medium, and Long.
- Kept the controls compact and responsive without horizontal overflow.
- Preserved the existing DMs generation, Regenerate, Copy, Reset, and Autopilot behavior.

- Rebuilt the DMs content area below the provider/model row to match the supplied reference PDF.
- Removed the flexible vertical gap between the profile context and message composer.
- Matched the Autopilot, profile/context, message editor, and joined Copy/Reset control sizing.
- Preserved all existing controller IDs, generation, copy, reset, hover-context, and Autopilot behavior.

## 1.4.96 — PDF-scale side-panel icons and controls

- Replaced the DMs, Comments, and Conversation navigation artwork with locally rendered SVG icons matching the supplied PDF.
- Reduced header, mode tabs, provider/model bar, buttons, cards, and empty-state geometry to the PDF scale.
- Preserved all controller IDs, Chrome messaging, generation, copy, and Autopilot behavior.

## 1.4.94 - Compact reference-matched side panel


## 1.4.95 - Exact empty state and split shortcuts

- Matched the side-panel empty state to the supplied PDF proportions and spacing.
- Restored the original IceBreaker iB logo in the side-panel header.
- Shows Alt+G for generation and Alt+C for copying as separate actions.
- Preserved all side-panel IDs, controllers, generation logic, and Chrome extension behavior.

- Rebuilt the side-panel header with a LinkedIn-blue IceBreaker wordmark and the slogan “Your Wingman For LinkedIn”.
- Matched the supplied DMs, Comments, Conversation and Empty State references more closely.
- Reduced the vertical height of the DMs / Comments / Conversation mode bar.
- Tightened the provider/model toolbar and corrected card spacing for a 395px Chrome side panel.
- Added mode-specific context labels, comment footer styling and a unified conversation reply card.
- Preserved all controller IDs, AI logic, LinkedIn detection, Autopilot behavior and Chrome messaging.

## 1.4.92

## 1.4.93 - Reference-matched Bootstrap UI

- Rebuilt DMs, Comments, Conversation, and empty side-panel states to match the approved visual references.
- Rebuilt Profile, AI Provider, Message Preferences, Autopilot, and Privacy settings pages to match the approved settings references.
- Preserved all Chrome messaging, AI provider, hover capture, resume, and Autopilot controller bindings.
- Kept Bootstrap local for Manifest V3 compatibility; no CDN dependencies were added.

- Migrated the React side panel and settings interface to locally bundled Bootstrap 5 utilities and components.
- Tree-shook Bootstrap to the selectors used by IceBreaker.
- Replaced the previous full style modules with compact IceBreaker theme overrides.
- Preserved all existing DOM IDs, controllers and extension behavior.

## 1.4.90 - Stable Repeated AI Generation

## [1.4.91] - 2026-08-03

### Changed
- Replaced side-panel, options-page, and LinkedIn content global stylesheets with locally bundled CSS-in-JS style modules.
- Preserved the original CSS rules, React DOM structure, responsive behavior, animations, and extension functionality.
- Removed all runtime `.css` files and external stylesheet dependencies.


- Reduced cloud prompt size while preserving the most relevant profile, CV, post, and conversation context.
- Added per-key Groq cooldowns so one rate-limited key no longer blocks the full official key pool.
- Added automatic official-key failover for 429/rate-limit responses.
- Kept the existing UI and LinkedIn generation behavior unchanged.

# Changelog

## 1.4.89 - DM Comment Context & Side Panel

- Restored private DM personalization from the correctly hovered commenter and their own comment.
- Added parent-post context as optional supporting information without changing Comments or Conversation behavior.
- Prevented reaction, social-proof, mention and stale-profile identities from becoming the DM recipient.
- Refined the side panel into a compact, colorful, minimal layout with clearer Vibe and Length controls.
- Simplified visible context and preserved all existing IDs, provider logic, settings, shortcuts and Autopilot bindings.

## 1.4.88 - Post Owner Detection Fix

- Comments mode now ignores LinkedIn social-context names such as “M Zakria likes this.”
- The real post owner is resolved from the actor header, ranked profile links, or a safe text fallback.
- The side-panel identity card always emphasizes the post owner, including when a comment is hovered.
- Added support for newer LinkedIn feed actor markup without changing generation providers or manual controls.

## 1.4.87 - Copy and Refresh Shortcuts

- Changed Alt+C to copy the current generated or edited text without triggering generation.
- Added Alt+G to generate a fresh version for the active LinkedIn context.
- Made Copy Text the primary blue action and replaced Generate with Refresh.
- Increased profile, post-owner, and conversation-name prominence in the side panel.
- Fixed comments-mode post ownership so reaction and “liked by” names are ignored.

## 1.4.85 - Panel Close Stop

- Stops pending hover capture, active generation, and Autopilot when the IceBreaker side panel is closed.
- Prevents hover generation while the side panel is not open.
- Removes cursor-following Generating/Ready status popups; status remains visible inside the side panel.

## 1.4.84 — E-RPL-16 conversation-shell recovery

- Fixed the exact bug where one valid visible conversation was detected but ignored, causing `E-RPL-16`.
- Conversation capture now accepts the single validated visible chat as a safe fallback for the side-panel button and Alt+C.
- Added local ancestry detection for conversation headers, blank thread space, attachments, timestamps, generic dialogs, and modern LinkedIn wrappers.
- Added a short-lived remembered conversation target so moving from LinkedIn to the side panel does not lose the chat you just hovered.
- Full-page LinkedIn Messaging can use a validated messaging `main` wrapper, while feed/comment containers remain blocked.
- Multiple visible chats are selected only through the hovered/focused/remembered participant; ambiguous chats still return `E-RPL-15` instead of guessing.
- Chromium regression tests passed for feed contamination, one-shell manual capture, generic chat markup, remembered multi-overlay selection, row-to-thread opening, and safe ambiguity handling.

## 1.4.83 — Strict local conversation capture

- Replaced the page-wide conversation root scorer with the same direct hover-container flow used by DMs and Comments.
- Conversation Mode now resolves only the chat shell containing the hovered row, message, thread, or composer.
- Permanently blocked feed, comment, `main`, and unrelated overlay fallbacks, preventing Antonio/Miguel post content from contaminating an Usman Mirza conversation.
- Removed stale conversation caches, global active-row fallback, mutation recapture, root scoring, and unused conversation constants/helpers.
- Kept row-hover opening reliable when LinkedIn emits unrelated pointer events while swapping the thread DOM.
- Added `E-RPL-16` for attempts without a locally hovered or focused conversation shell.
- Validated the exact feed-plus-chat regression, multiple overlays, focused composer capture, row opening, sender direction, duplicate messages, eight-message limit, and DMs/Comments smoke paths in a real Chromium browser.

## 1.4.82 — Live conversation isolation fix

- Prevented Conversation Mode from treating feed posts, comments, or broad page containers as message threads when a LinkedIn chat overlay is open.
- Scoped hover capture to the actual inbox row, active thread, message bubble, or composer under the pointer.
- Cleared stale conversation targets when the pointer leaves messaging UI, so Alt+C cannot reuse an older contact.
- Made the active inbox row authoritative and rejected participant conflicts between the row and visible thread.
- Added `E-RPL-11` through `E-RPL-15` for out-of-scope hover, contaminated roots, stale targets, participant conflicts, and ambiguous threads.

## 1.4.81 — Conversation capture hardening and diagnostics

- Made manual Conversation capture independent of the content script’s cached mode, fixing the DMs-to-Conversation mode-switch race.
- Kept one logical conversation target alive while the pointer moves between an inbox row, thread, message bubble, and composer.
- Added explicit incoming/outgoing sender metadata support and corrected `You:` inbox-preview overrides.
- Prefer the active inbox row over a stale previously hovered row when selecting the visible thread.
- Added `E-RPL-01` through `E-RPL-10` diagnostics across the content script, service worker, and side panel.
- Added duplicate-request suppression, diagnostic rate limiting, and delivery-failure reporting.
- Validated capture against 27 deterministic DOM scenarios and 120 randomized LinkedIn-style thread variants.

## 1.4.78 — Clear hover context UI

- Comments mode now displays the hovered post or comment author as a prominent name in the side panel.
- Conversation mode now displays the detected chat participant prominently, with transcript-based fallbacks when LinkedIn omits the name.
- Enlarged the captured content text, improved contrast, and increased the scrollable context area.
- Added individual comment hover capture while preserving full post hover capture.
- Versioned both the service worker and LinkedIn content detector at 1.4.78 so refreshed tabs use the same capture build.

## 1.4.76 — Conversation hover and E-RPL fix

- Conversation mode now recognises individual LinkedIn message bubbles, overlay chats, `role="log"` threads, modern message-list attributes, and updated composer markup.
- Hovering any visible chat bubble or the open message composer now resolves the containing thread and captures the recent conversation.
- Added a robust fallback for LinkedIn A/B-tested chat markup that does not expose the legacy `msg-*` classes.
- Manual capture and Alt+C now reuse the currently hovered thread before falling back to page-wide detection.
- Preserved sender-direction detection so `[YOU]` and `[CONTACT]` remain separated in generated reply context.

## 1.4.75 — GitHub-ready product release

- Added current UI screenshots for DM, Comments, and Conversation modes.
- Rebuilt the repository README as a complete product and developer guide.
- Added a safe no-clone GitHub push workflow for an existing local folder.
- Removed private provider credentials from the public package.
- Updated Autopilot UI copy to describe the actual match → generate → paste → attach → verify → draft → continue pipeline.
- Updated repository and release metadata.

## 1.4.74 — Autopilot matching and retry fix

- Default Autopilot mode now drafts every visible connection that passes filters.
- Added hiring-contact-only and custom-title-only selection modes.
- Preserved legacy/custom target titles during settings normalization.
- Cleared obsolete AP-S103/legacy checked memory once so misclassified profiles are retried.
- Kept AI generation, résumé attachment, visible draft verification, and move-to-next-card behavior intact.


## 1.4.73 — Reliable Fast Autopilot

- Prevented normal hover generation and Autopilot from sharing or duplicating the same cloud-provider request.
- Autopilot now cancels an older hover request immediately when `Alt+S` starts a run.
- Groq 429/cooldown states switch directly to the local personalised draft fallback instead of delaying the batch.
- Made hover-start detection resilient to keyboard timing by remembering the latest pointer position and valid connection card.
- Reduced false title matches by prioritising the extracted headline over unrelated card text.
- Strengthened recipient verification so text is never inserted into a stale or unrelated LinkedIn composer.
- Restricted résumé file injection to the selected/new composer and added safer attachment-button discovery.
- Increased draft-persistence verification and removed unsafe close-button fallback while minimising composers.
- Fixed a start-state race that could overwrite an immediate completed/error status with stale `running`.

## 1.4.72 — Fast Hover-Start Autopilot

- Added **Alt+S** to start Autopilot from the connection card currently under the mouse.
- Removed artificial multi-minute draft pacing; processing now continues immediately after LinkedIn confirms each draft and résumé.
- Batched persistent checked-profile memory writes for faster scanning while retaining cross-run skips.
- Made résumé attachment mandatory for a draft to count as prepared.
- Automatically minimises each saved composer before moving to the next connection.
- Reduced DOM polling delays while keeping recipient, text, attachment, and draft verification.


## 1.4.71 — Autopilot Rate-Limit Resilience

- Added a compact Autopilot-only prompt that dramatically reduces Groq input tokens per DM.
- Added automatic 429 cooldown handling using Groq retry headers/error timing.
- Added up to three automatic retries without stopping the run.
- Added a private local personalised DM fallback when a cloud provider remains unavailable.
- Added `AP-W003` diagnostics when the local fallback is used.
- Prevented provider rate limits from triggering `AP-E301` or pausing the entire batch.
- Disabled API-key rotation for organization-level 429 errors.

## 1.4.70 — Same-Page Composer Fix

- Removed the temporary background direct-compose tab from the Autopilot run.
- Autopilot now opens and fills only the visible Message composer attached to the selected LinkedIn connection card.
- Added three-stage React/contenteditable text insertion with verification and clearer AP-E205 details.
- Invalidates false v1.4.69 direct-compose “saved draft” records so those profiles can be retried.
- Distributes the requested successful-message target across one total selected time window.
- Defaults composer minimisation to off after upgrade so the prepared message remains visible for review.
- Keeps Send under explicit human confirmation; no unattended bulk-send action was added.

## 1.4.69 — Direct Compose Draft Fix

- Bypasses LinkedIn connection-card click failures by opening the Message action’s direct compose URL in a temporary background tab.
- Inserts the generated DM, attempts the saved résumé attachment, verifies draft persistence, closes the temporary tab, and continues scanning.
- Falls back to the existing in-page Message workflow when no direct compose URL or profile identifier is available.
- Composer failures (`AP-E209`, `AP-E217`, `AP-E218`) are profile-level failures and no longer trigger the consecutive-error safety stop.
- The selected target continues to mean successful unsent drafts only.

## 1.4.68 — Successful Draft Target & Persistent Profile Memory

- The selected draft limit now explicitly counts only drafts successfully preserved in LinkedIn.
- Checked, rejected, skipped, and failed profiles never consume the requested draft target.
- Added persistent Autopilot profile memory for saved, rejected, skipped, and failed profiles across runs.
- New runs skip previously checked profiles by default, preventing repeated scans and repeated failures.
- Migrates the most recent v1.4.67 processed/failed profile IDs into persistent memory during upgrade.
- Added a memory summary and a clear-memory control in Autopilot Settings.

## 1.4.67 — Autopilot Composer Retry Fix

- Generates the DM before opening temporary LinkedIn menu actions.
- Retries Message activation with native click, pointer/mouse events, and keyboard activation.
- Detects overlay, dialog, full-page, Lexical, Quill, plaintext-only, textarea, and active-element message editors.
- Trusts a unique newly opened editor when LinkedIn delays recipient header rendering.
- Treats composer-opening failures as recoverable per-profile errors so the run continues.
- Saves the text draft even when résumé attachment confirmation fails, recording AP-W002 instead of blocking all drafts.
- Adds AP-E217 for exhausted composer-opening retries.

## 1.4.66 — Autopilot Draft Pipeline Fix

- Fixed a stale LinkedIn Message-menu element that caused matched contacts to fail before the composer opened.
- Message actions are now resolved and clicked immediately before composer verification.
- Added recipient-aware composer selection so an older inbox composer cannot be mistaken for the selected connection.
- Expanded LinkedIn editor selectors and strengthened React/contenteditable insertion events.
- Reworked résumé attachment discovery to search the active composer and LinkedIn's document-level hidden file inputs.
- Added attachment input, file injection, upload confirmation, draft persistence, stale composer, and stale action error codes (`AP-E211`–`AP-E216`).
- `AP-E301` now preserves and displays the true underlying error plus the three most recent failed profiles and stages.
- Added a draft-persistence wait before minimising the composer.

## 1.4.65 — Autopilot Detection & Diagnostics Fix

- Fixed the scanner stopping after the first 12 lazy-loaded LinkedIn connection cards.
- Added nested-scroll, bottom-scroll, and supported load-more handling.
- Improved LinkedIn connection-card selection so the matching Message button stays associated with the correct profile.
- Improved name and headline extraction for modern My Network connection cards.
- Expanded HR, recruiting, talent, staffing, resourcing, and people-operations role detection.
- Counts a relevant contact as matched before checking whether LinkedIn exposes the Message action.
- Added stable `AP-S...`, `AP-W...`, and `AP-E...` diagnostic codes for every skip and failure stage.
- Added a complete diagnostic-code reference in Drafts & Settings.
- Added per-profile skip reasons to the Activity log.

## 1.4.64 — Connections Autopilot

- Added connection-only Autopilot scanning for LinkedIn My Network and 1st-degree People results.
- Expanded hiring-contact detection to recruiters, HR, talent, founders, executives, directors, VPs, department heads, managers, technical leads, and active hiring signals.
- Added custom include/exclude phrases plus optional company and location filters.
- Added match-confidence, per-company draft limits, previous-run duplicate protection, existing-draft protection, optional existing-conversation skipping, and consecutive-error stopping.
- Kept every generated message unsent: recipient, inserted text, and résumé attachment are verified before a draft is counted.

## 1.4.62 - Resume-first professional profile

- Moved the résumé upload to the top of Profile so one PDF or DOCX can initialise the user profile.
- Stores the original résumé file locally in IndexedDB and provides file-card controls to download, replace, or remove it.
- Keeps extracted résumé text hidden from the settings interface while retaining it privately for DM relevance and project matching.
- Auto-fills empty professional fields from detected résumé facts without overwriting user-edited values.
- Detects LinkedIn, GitHub, and portfolio links in the résumé and inserts them into empty link fields once.
- Added professional headline, location, email, phone, experience level, work preference, availability, core skills, preferred industries, and outreach-goal settings.
- Added a profile-completeness indicator and a redesigned résumé file card with detected-detail chips and responsive transitions.
- Added structured professional profile data to DM and conversation prompts while preserving receiver-based project balancing.
- Preserves legacy extracted résumé context; users can replace the résumé once to store the original PDF or DOCX.

## 1.4.61 - Interest-based project balancing

- Fixed DMs repeatedly defaulting to the first or most detailed saved project, such as an emotion-recognition project.
- Added relevance-first project matching using the receiver’s visible headline, description, company context, technologies, and interests.
- Added balanced rotation: when multiple projects are similarly relevant, IceBreaker chooses the least-used project rather than repeating the same one.
- Added persistent local project-selection history for both manual DMs and Autopilot drafts.
- Removed unselected project catalogues from the general prompt, then supplies only the selected project’s verified facts.
- Prevents project mentions when the receiver profile does not expose a meaningful project match.
- Displays the selected best-fit project in the side-panel match explanation.

## 1.4.60 - Saved profile intelligence and settings redesign

- Added optional LinkedIn, GitHub, and portfolio links to the user profile settings.
- Added one-time profile import with locally saved context for future DMs and context-aware conversation replies.
- LinkedIn import captures visible profile sections while explicitly excluding posts and activity content.
- GitHub import preserves public project names, descriptions, topics, languages, repository links, demos, stars, and forks.
- Portfolio import requests permission only for the entered website and saves readable project, case-study, about, skills, and experience content.
- Added saved-source status cards, import timestamps, a reviewable context preview, refresh and clear controls, and stale-link detection.
- Connected the imported sender context to DM generation without mixing it with the recipient profile.
- Redesigned the complete settings UI with clearer steps, responsive cards, active navigation, transitions, animations, and improved visual hierarchy.

## 1.4.59 - Conversation sender resolver

- Fixed `UNKNOWN SENDER` on LinkedIn inbox threads that omit legacy self-message classes.
- Detects outgoing and incoming bubbles from nested flex alignment, automatic margins, geometry, profile/avatar evidence, accessibility metadata, and the inbox “You:” preview.
- Prevents nested or overlapping DOM copies of the same rendered message from appearing twice while preserving genuinely repeated messages.
- Keeps the transcript explicitly labelled as `[YOU]` and `[CONTACT - Name]`.

## 1.4.58 - Conversation sender detection

- Distinguishes the user's outgoing messages from the contact's incoming messages using LinkedIn self markers, configured sender name, accessibility labels, and bubble alignment.
- Tags captured chat lines as `[YOU]` or `[CONTACT]` before generation.
- Prevents the AI from answering the user's own latest sent message as though it came from the contact.

## 1.4.57 — Conversation Hover Fix

- Fixed Conversation mode so hovering an inbox conversation row opens and reads the visible chat before generating.
- Fixed Alt+C conversation capture by awaiting the asynchronous open-and-read operation.
- Added stronger LinkedIn inbox/thread selectors and recent-message extraction fallbacks.
- Added a safe conversation-preview fallback instead of returning E-AI when LinkedIn delays rendering the thread.
- Improved newest-sender detection so replies continue the visible conversation naturally.


## 1.4.0 — OpenRouter reliability fix

- Retries empty OpenRouter responses instead of surfacing generic `E-AI`.
- Discovers current free text models from OpenRouter and uses them as automatic fallbacks.
- Avoids mandatory-reasoning models and disables reasoning only when a model explicitly supports `effort: none`.
- Increases OpenRouter output headroom so reasoning tokens cannot consume the entire response budget as easily.
- Uses the current `X-OpenRouter-Title` attribution header.
- Adds a clear `E-EMPTY` diagnostic if every available model returns no final text.

## 1.3.9 - OpenRouter E400 Fix

- Removed the incompatible `reasoning` object from OpenRouter requests.
- Uses a minimal payload for the `openrouter/free` dynamic router.
- Sanitizes OpenRouter model IDs and provider messages before sending.
- Falls back to `openrouter/free` when a selected model returns a model-related HTTP 400.
- Preserves the actual provider error detail in the service-worker console.

## 1.3.8 — Professional Project Structure

- Reorganised runtime code into `src/background`, `src/content`, `src/pages`, `src/shared`, and `src/config`.
- Separated icons, provider logos, and branding under `assets`.
- Moved API and Ollama utilities into dedicated `scripts` folders.
- Grouped documentation into guides, product, releases, security, and legacy sections.
- Updated all manifest, import, injection, HTML, image, and setup-script paths.
- Added `PROJECT-STRUCTURE.md` and folder-level README files.
- Added the content-script badge icon to `web_accessible_resources`.

## 1.3.7 — Cloud API and Ollama speed fix

- Builds the private embedded Groq/OpenRouter key pool into `src/backend/config/official-api-keys.js`, so Official API mode no longer depends on loading `.env` at runtime.
- Uses `llama-3.1-8b-instant` as Groq's stable low-latency default and falls back to it when a selected Groq model is blocked or unavailable.
- Uses `openrouter/free` as the no-credit default and falls back to it when another OpenRouter model cannot run.
- Preserves provider status/type details so API failures map to useful error codes instead of generic `E-AI`.
- Removes the accidental second generation request caused by conflicting word ranges.
- Warms and keeps Ollama loaded, caches model detection, reduces prompt/context size, and caps output tokens for faster local generation.

## 1.3.0

- Added Official API and Manual API modes.
- Added two rotating/failover key slots for Groq and two for OpenRouter.
- Added `.env` configuration and Windows build script.
- Added automatic user-key provider detection.
- Added dynamic My Groq / My OpenRouter side-panel option with official provider logo.
- Preserved Ollama, existing generation prompts, and draft-only Autopilot.

## 1.2.2 — Hiring Contact Classifier Autopilot

- Classifies from the visible LinkedIn profile headline, description, and full card text instead of ignoring descriptions when a headline exists.
- Added broader title variants for recruiters, technical recruiters, HR/People, talent acquisition, hiring managers, founders/co-founders, CEOs/CTOs, engineering managers, and technical/team leads.
- Added support for variants such as standalone HR, C.E.O., C.T.O., L&D, Co-Founder, VP of Engineering, software development manager, lead engineer, and executive search consultant.
- Uses weighted field matching so headline matches rank above description and card-text fallbacks.
- Ignores common negative phrases such as “looking for a recruiter” to reduce false matches.
- Waits for LinkedIn’s draft autosave after text insertion and résumé attachment before minimising the composer and moving forward.
- Preserves recipient verification, saved AI Resume attachment, pacing, target draft count, duplicate protection, and the strict never-send rule.

## 1.2.0 — Simple Automatic Draft Autopilot

- Rebuilt Autopilot around one automatic profile-card workflow.
- Removed editable contact-target matching from the run logic.
- Added fixed IceBreaker classification for recruiters, technical recruiters, talent acquisition, HR/People, hiring managers, founders/CEOs/CTOs, engineering managers, and technical/team leads.
- Candidate roles now shape the message only and can no longer cause hiring contacts to be skipped.
- Simplified Autopilot Settings to one required AI Resume.
- Autopilot always pastes the generated draft and attaches the saved AI Resume before counting completion.
- Preserved automatic scanning, hover-style reading, Message opening, recipient verification, composer minimisation, pacing, pause/resume/stop, saved drafts, and error codes.
- Preserved the strict rule that Autopilot never clicks Send or submits with Enter.

## 1.1.3 — Contact Matching Fix

- Fixed Autopilot incorrectly treating the candidate job titles as contact-matching requirements.
- Added semantic aliases for recruiter, HR/People & Culture/OD, talent acquisition, founders, CEOs, engineering managers, team leads, and technical contacts.
- Recognises titles such as “Head of OD, Learning & Culture” as an HR/People contact.
- Specific contact titles and broad contact targets now work as OR conditions.
- Fixed the Autopilot settings collector so attachment, recipient safety, and composer options save correctly.
- Changed the skip message from “target role did not match” to “no configured contact target matched.”

## 1.1.2 — Automatic Draft Autopilot

- Restored automatic LinkedIn profile-card scanning and hover-style extraction.
- Restored automatic Message composer opening for matching profiles.
- Restored verified message insertion while keeping every message unsent.
- Added conservative time-span pacing with at least one minute between prepared drafts.
- Reused the existing Groq, Ollama, or OpenRouter DM generation pipeline.
- Added automatic candidate-role and résumé-profile selection from up to three saved résumés.
- Added optional role-matched résumé attachment after recipient verification.
- Changed missing Message actions from repeated errors to `W-NO-MESSAGE` safe skips.
- Prevented AI generation when a matching card has no supported Message action.
- Added recipient, composer, insertion, provider, and attachment error codes to Autopilot diagnostics.
- Saved an audit copy of each successfully inserted LinkedIn draft in IceBreaker Settings.
- Preserved DMs, Comments, Conversation, Vibe, Length, Copy Text, Regenerate, and Stop & Refresh.
- Kept the strict rule that Autopilot never clicks Send or submits a message automatically.

## 1.1.1

- Added advanced Autopilot settings, paced draft limits, role targeting, three résumé profiles, saved-draft records, and diagnostics.

## 1.1.0

- Introduced the first automatic Autopilot implementation.
