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
| Pages (one per navbar item) | root .html files; each page's script in `assets/` |
| Navbar, footer, adding a page | `assets/layout.js` |
| Reading any data file (the only place) | `assets/data.js` |
| UK time, date-only dates, donation window | `assets/time.js` |
| Data file check (also run by GitHub on push) | `tools/validate-data.mjs` |
| Docs budget, hidden characters | `tools/check-docs.mjs` |

## Gotchas
- Tool quirk: typed backslash-u escapes become real, often invisible characters, and heredocs eat backslashes. Build such characters with String.fromCharCode in node, then run `tools/check-docs.mjs` (it scans for them).
- Data files: never move, rename or reformat them (2-space JSON, final newline). The bot validates strictly and stops donation, perk and mute commands if one breaks. Contract: `docs/SITE-DATA.md`.
- Names come from chat: insert as text, never as HTML.
- Never show per-person donation amounts, even in comments or commit messages.
- No secrets, no TeamSpeak unique IDs. identities.json never belongs in this repo.
- Don't: add endpoints, forms, webhooks, or Actions that write data files.
- Don't: add React or a build step (owner's ruling: the site only shows data). Revisit if it needs real interactivity.

## State
- Milestone: Phase 2, all seven pages built and checked; domain move left.
- The live site isn't publicised yet, so working on it directly is fine (still ask before each push).
- Open: how to keep the Commands page in step with the bot's guide.
