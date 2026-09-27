# mandem-ts-website

Static site for the Mandem TeamSpeak server. Repo arazez/mandem-ts-website (renamed from ts-arazez-donations; never recreate the old name). GitHub Pages publishes `main` (root, no build) to donate.arazez.com, moving to mandem.arazez.com.

## Rules
- Talk to the owner in plain, non-technical language. Raise unclear or risky items one at a time.
- Show a short plan and wait for OK before large changes: restructuring pages, moving or deleting files, adding a build step or framework.
- Ask before every commit and push. A push to `main` goes live.
- The owner makes GitHub settings and DNS changes. Give click-by-click steps, then verify with read-only commands (nslookup, curl -I).
- Never ask for secrets; never put any in this repo.
- The bot repo C:\sources\gunsmoke-ts-bot is read-only: never edit, commit or run anything there.

## Where to look
| Task | File |
|---|---|
| Bot data contract | `docs/SITE-DATA.md` |
| Pages (all one page for now) | `index.html` |
| Totals, donors, thresholds, window | `donations.json` |
| Perks per person | `perks.json` |
| Player commands source | bot's docs/COMMANDS.md |
| Bot's validation rules | bot's src/data/files.ts |
| Docs word budget, hidden characters | `tools/check-docs.mjs` |

## Gotchas
- Tool quirk: backslash-u escapes typed into Write/Edit/Bash become real, often invisible characters; heredocs eat backslashes. Build such characters with String.fromCharCode in a small node script, then scan the repo for control and zero-width characters.
- Data files: never move, rename or reformat them (2-space JSON, final newline). The bot validates strictly and stops donation, perk and mute commands if one breaks. Contract: `docs/SITE-DATA.md`.
- Names come from chat: insert as text, never as HTML.
- Never show per-person donation amounts, even in comments or commit messages.
- No secrets, no TeamSpeak unique IDs. identities.json never belongs in this repo.
- Don't: add endpoints, forms, webhooks, or Actions that write data files.

## State
- Milestone: Phase 1 (low-token setup) awaiting the owner's approval.
- Next: Phase 2, the multi-page site; the domain move is its last step.
- Open: how to keep the Commands page in step with the bot's guide.
- Open: launch timing, since the donation window opens 1 October (expires 2026-11-01).
