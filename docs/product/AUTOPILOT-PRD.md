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
7. Generate the existing IceBreaker DM using the target role and any saved résumé/profile context.
8. Open the Message composer.
9. Verify the recipient.
10. Paste the complete message.
11. Optionally attach the saved résumé when attachment is enabled.
12. Confirm the message and any enabled attachment.
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
- Navbar lightning control
- Draft limit
- Daily safety limit (maximum 45 prepared drafts)
- Target role
- Vibe
- Length
- Optional AI Resume upload and attachment
- Progress counters
- Saved draft records
- Activity and error codes

## Safety rules

- Never click Send.
- Never submit with Enter.
- Verify the recipient before inserting text or a file.
- Process one profile at a time.
- Do not count a draft unless the message and any enabled attachment are confirmed.
- Enforce the configured daily prepared-draft limit.
- Skip profiles without a supported Message action.
- Stop on recipient mismatch when the safety setting is enabled.
