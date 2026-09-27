---
name: prune-docs
description: Prune the repo's agent-facing docs with the owner's strict content retention framework. Use when a piece of work finishes, when CLAUDE.md nears its word budget, or when asked to tidy docs.
---

# Prune docs

## How to run
1. Docs in scope: CLAUDE.md, README.md, docs/*.md, .claude/agents/*.md, .claude/skills/**/*.md. Public page text in the site's pages is exempt.
2. Take every entry in turn through the decision order below. Edit in place.
3. Run `node tools/check-docs.mjs` and fix anything it reports.
4. Tell the owner in plain words what you removed and why. Any "(expires ...)" entry past its date: say if it was a reminder, then delete it.

## The strict content retention framework

Goal: the docs agents read hold only context that changes future work. Everything else is deleted. Git history is the archive.

The test: keep an entry only if an agent without it would act worse. Its value is roughly the chance a future task needs it, times the cost of getting it wrong minus the cost of recovering it. Weigh that against its size and how often it's loaded (CLAUDE.md is loaded every session, so it's the most expensive).

Decision order. Take each entry in turn; the first answer that applies decides it.
1. Still true?
   - No, and the false version is tempting → rewrite it as "Don't: X (reason)".
   - No, and it isn't tempting → delete it.
2. Would an agent act the same without it? → delete it.
3. Can one tool call recover it (the code, the data files, git, the file list)? → delete it, or leave a one-line pointer if the location isn't obvious.
4. Is it about the owner, other people, the live site, or the bot contract, or would getting it wrong be irreversible? → keep it in full.
5. Is it tied to specific code? → move it into a comment beside that code and delete it from the docs.
6. Otherwise → shrink it to one line: what, status, pointer.

Always keep: the owner's rulings and decisions; rules that must hold; rejected alternatives and approaches that failed; why odd-looking code is that way; live hosting facts; tool quirks; open questions and blockers; the owner's standing preferences.

Always delete: how a decision was reached; test and incident write-ups; lists of fixed bugs; temporary state; guesses since settled; anything repeated; anything the repo already holds.

Where things live (one home per fact; everywhere else points to it):
- CLAUDE.md: rules, gotchas, the "Where to look" table, state.
- docs/SITE-DATA.md: the bot integration contract.
- docs/DECISIONS.md, only if needed: the owner's rulings, rejected alternatives, open questions.
- Public page text lives in the pages themselves and is exempt from pruning.

Summarising and archiving:
- Summarise by rule 6: one line saying what, status, and pointer.
- Archiving means deleting. Git keeps the old version. Never create archive/ or history/ folders, changelogs, or "old notes" files. Agents would read them, and they go stale.
- If a deleted detail might be needed again, leave a one-line pointer such as "see commit abc1234".

Logs:
- Never commit logs, build output, test output or session notes.
- Debugging output goes in a scratch or temp folder and is deleted afterwards. Put any log or build folders in .gitignore.

Ignoring stale history:
- Don't read git history unless a task needs it.
- The bot will commit the data files often, with generic messages like "Update perks". Those commits are data, not decisions. Never read them for context, and never summarise them into docs.

Dated entries carry "(expires YYYY-MM-DD)". Once the date has passed, tell the owner if it was a reminder, then delete it.

When a piece of work finishes: move any rulings made during it into the rulings list, delete its design notes (the code now holds them), update the state in CLAUDE.md, and tell the owner in plain words what you removed and why.

Check script: `tools/check-docs.mjs` fails when CLAUDE.md goes over its word budget, when an entry has passed its expires date, when a file named in backticks no longer exists, or when a file holds control or zero-width characters. Raise a budget only after pruning.
