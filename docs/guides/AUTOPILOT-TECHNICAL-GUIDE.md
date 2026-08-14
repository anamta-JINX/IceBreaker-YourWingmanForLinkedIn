# Autopilot Technical Guide — v1.4.34

## Runtime ownership

- `src/backend/content/linkedin-content.js` discovers cards, classifies hiring contacts, opens composers, verifies recipients, inserts messages, optionally attaches the résumé, and minimises composers.
- `src/backend/background/service-worker.js` stores settings/state, enforces the daily safety limit, starts and controls runs, calls the existing AI provider pipeline, and stores draft/activity records.
- `src/frontend/sidepanel/sidepanel.js` provides the navbar lightning control plus Start, Pause, Resume, Stop, status, and counters.
- `src/frontend/options/autopilot-settings.js` manages Targeting, Filters, Safety, Message settings, optional résumé context, saved drafts, and diagnostics.

## Contact classification

Classification is deterministic and independent of the candidate role. IceBreaker evaluates the visible headline, description, and full profile-card text using weighted matching. Headline evidence ranks highest, description evidence is accepted, and card text is the fallback. Specific aliases are evaluated before broader categories, while common negative phrases such as “looking for a recruiter” are ignored.

## Successful draft transaction

A profile counts only after:

1. Contact category matched.
2. Message action was found.
3. Composer opened through one of three bounded activation methods.
4. Recipient and overwrite guards were verified.
5. Provider output passed perspective, grounding, attachment, length, and completion checks—or a deterministic verified local draft replaced it.
6. Recipient and overwrite guards were checked again after generation.
7. Full text remained in the editor.
8. Résumé upload was confirmed when attachment is enabled.
9. LinkedIn was given time to autosave the draft.
10. Composer was left unsent and the run moved to the next profile.

## Important codes

- `DRAFT_SAVED` — verified unsent draft completed.
- `AP-S106` — supported contact but no usable Message action.
- `AP-E203` — recipient could not be verified.
- `AP-E217` — all three composer-opening methods failed for one profile; a later run retries it.
- `AP-E205` — full message was not preserved.
- `AP-E207` — optional résumé attachment was not confirmed.
- `AP-W003` — the selected provider was unavailable or its output failed validation, so a verified local draft was used.
