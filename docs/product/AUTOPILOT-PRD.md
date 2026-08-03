# IceBreaker Simple Autopilot — Product Requirements

## Goal

Autopilot automatically prepares unsent LinkedIn inbox drafts for hiring contacts while keeping the existing IceBreaker generator unchanged.

## Required workflow

1. Discover visible LinkedIn profile cards.
2. Process one card at a time.
3. Programmatically trigger hover-style extraction.
4. Classify the contact using IceBreaker’s fixed hiring-contact rules.
5. Skip unrelated profiles.
6. Confirm a supported Message action exists.
7. Generate the existing IceBreaker DM using the saved AI Resume and target role.
8. Open the Message composer.
9. Verify the recipient.
10. Paste the complete message.
11. Attach the saved AI Resume.
12. Confirm both message and attachment.
13. Minimise the composer without sending.
14. Continue until the draft limit is reached or the user stops the run.

## Supported categories

- Recruiter
- Technical Recruiter
- Talent Acquisition
- HR / People / Culture / OD / L&D
- Hiring Manager
- Founder / Co-Founder / CEO / CTO
- Engineering Manager / Head or Director of Engineering
- Team Lead / Technical Lead / AI or ML Lead

## Required controls

- Start
- Pause
- Resume
- Stop
- Draft limit
- Time span
- Target role
- Vibe
- Length
- AI Resume upload
- Progress counters
- Saved draft records
- Activity and error codes

## Safety rules

- Never click Send.
- Never submit with Enter.
- Verify the recipient before inserting text or a file.
- Process one profile at a time.
- Do not count a draft unless the message and AI Resume are confirmed.
- Skip profiles without a supported Message action.
- Stop on recipient mismatch when the safety setting is enabled.
