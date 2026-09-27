# Site data contract (bot ↔ site)

Owner's ruling. The bot's validator is the source of truth: `C:\sources\gunsmoke-ts-bot\src\data\files.ts` (read only).
Labels: HARD = must hold or the bot breaks. PROPOSED = bot side not built yet; details may change.

## How they connect
- One way, through JSON files in this repo. The bot (on a seedbox, no public address) reads and commits them via the GitHub API with a fine-grained token (this repo only, Contents read/write). The site only reads.
- The bot reads on start, every 5 minutes and before each change; it sends small edits with the file's sha, re-reads on conflict, commits only real changes, and never edits pages.
- HARD: no endpoints, forms, APIs, serverless functions, webhooks, or GitHub Actions that write data files. A read-only validation Action is fine.
- Rejected: serving data from the seedbox (needs a public port); a Cloudflare Worker (another service to run).
- The bot doesn't commit yet. Until it does, the owner copies perks.json and donations.json by hand.

## Files (all in the repo root, on `main`)
HARD for all:
- Fixed paths and names. Moving one needs the owner's OK.
- UTF-8 JSON, 2-space indent, final newline (`JSON.stringify(v, null, 2) + "\n"`). No formatter, linter or build step may rewrite them.
- Unknown fields may appear; ignore them, never fail on them. The bot keeps unknown top-level and per-entry fields in perks.json and donations.json, but drops unknown fields inside `window`.
- Never rename or remove fields or change their types. New optional fields are fine; anything else is breaking and needs the owner first. No schema version field.
- All reading of each file lives in one small script module.
- Times named ...Until, since, updatedAt are UTC (`2026-10-10T14:00:00Z`). Plain dates are `YYYY-MM-DD`.

### perks.json (bot writes; owner may hand-edit)
- lastUpdated: optional date.
- perks: object keyed by name. Each entry, all optional:
  - banner, modal: whole number ≥ 0; weeks not yet started (£1 = 1 week).
  - mute: `true` = ready; a date = used, back on that date; missing = doesn't have it.
  - bannerUntil, modalUntil: UTC time; end of a week running now (bot only).

### donations.json (bot writes; owner may hand-edit)
- goal, raised: number ≥ 0. raised starts each year at 3 (the owner's £3).
- currency: optional string ("GBP").
- closeWhenGoalReached: optional boolean; true closes donating once raised ≥ goal.
- adminMinimum, muteMinimum, maxPerPerson: whole numbers ≥ 1, in pounds.
- lastUpdated: optional date.
- window: optional { month 1–12, day 1–31, days 1–366 }. Opens month/day each year, lasts `days` days including the first; may cross new year. Missing → 1 October, 31 days.
- donors: array of { name: non-empty string, level: optional free text, e.g. "Owner", "Super Admin", "Admin" }. Show level as given.

### leaderboards.json (PROPOSED, bot only)
- updatedAt: UTC time.
- trivia: ≤ 10 entries in rank order: { name, points }.
- uno: ≤ 10 entries in rank order: { name, points, won, lost }. Win rate = won ÷ (won + lost) as a whole percent, "–" when both are 0.
- Matches !trivia top and !uno top. Show in the given order; never re-sort.

### live.json (PROPOSED, bot only)
- updatedAt: UTC time.
- live: array of { name, twitch, since }. twitch = lower-case login; since = went-live UTC time.
- Holds only streamers who opted in (!twitch show); the site shows everyone in it.
- Link to https://twitch.tv/<twitch> only if the login is letters, digits and underscores; otherwise show the name unlinked.
- Empty list = nobody live; say so in a friendly way.

## Names (perks keys, donor names)
Matched ignoring case; 1–40 characters; no control characters; no leading or trailing spaces; never `__proto__`, `constructor`, `prototype`. Two names differing only in case make the bot reject the file.

## What the site must show and protect (HARD)
- Donation window from `window`, falling back to 1 October / 31 days. No other hardcoded window.
- "banner running until …" / "modal running until …" only while that time is in the future.
- All times in UK time (Europe/London); clock times with a dot: "14.00".
- Date-only strings are calendar dates. Never `new Date("YYYY-MM-DD")` (reads as UTC midnight).
- Never show per-person donation amounts, anywhere, including comments and commit messages. Totals, perk weeks and levels are fine.
- Every name is chat input: insert as text, never as HTML, on every page.
- Never show TeamSpeak unique IDs. identities.json (names → unique IDs) stays on the seedbox and is git-ignored here.
- If a file fails to load or parse, the page still works and shows a short friendly "couldn't load the latest info". Missing optional fields are normal.
- Live now and Leaderboards show a friendly "coming soon" while their files don't exist.
- Recommended: "Live since 14.00" per streamer; "Updated …" on Leaderboards. Expect 15+ minutes before a change appears (bot timing plus about 10 minutes of Pages caching).

## Auth and config
- The site holds no credentials and needs no config. The bot's token lives only on the seedbox.
- `main` has no branch protection or rulesets (checked 2026-09-27), so the bot's token can commit directly.
- For the bot's config: repo arazez/mandem-ts-website, branch `main`, paths perks.json, donations.json, live.json, leaderboards.json (repo root), site https://mandem.arazez.com.
