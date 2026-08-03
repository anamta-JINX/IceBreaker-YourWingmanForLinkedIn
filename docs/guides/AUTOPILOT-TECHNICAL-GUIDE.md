# Autopilot Technical Guide — v1.2.1

## Runtime ownership

- `src/backend/content/linkedin-content.js` discovers cards, classifies contacts, opens composers, verifies recipients, inserts messages, attaches the AI Resume, and minimises composers.
- `src/backend/background/service-worker.js` stores settings/state, starts and controls runs, calls the existing AI provider pipeline, selects the AI Resume, and stores draft/activity records.
- `src/frontend/sidepanel/sidepanel.js` provides Start, Pause, Resume, Stop, current action, counters, and the settings link.
- `src/frontend/options/autopilot-settings.js` manages pacing, target role, Vibe, Length, one AI Resume, saved drafts, and diagnostics.

## Contact classification

Classification is deterministic and independent of the candidate role. IceBreaker evaluates the visible headline, description, and full profile-card text using weighted matching. Headline evidence ranks highest, description evidence is accepted, and card text is the fallback. Specific aliases are evaluated before broader categories, while common negative phrases such as “looking for a recruiter” are ignored.

## Successful draft transaction

A profile counts only after:

1. Contact category matched.
2. Message action was found.
3. AI returned a non-empty DM.
4. Composer opened.
5. Recipient was verified.
6. Full text remained in the editor.
7. AI Resume upload was confirmed.
8. LinkedIn was given time to autosave the draft.
9. Composer was left unsent and the run moved to the next profile.

## Important codes

- `DRAFT_SAVED` — verified unsent draft completed.
- `W-NO-MESSAGE` — supported contact but no usable Message action.
- `E-RECIPIENT` — recipient could not be verified.
- `E-COMPOSER-OPEN` — composer did not open.
- `E-INSERT` — full message was not preserved.
- `E-RESUME` — AI Resume missing or not confirmed.
- `E-AI-OFFLINE`, `E-AI-AUTH`, `E-AI-408` — provider failures.
