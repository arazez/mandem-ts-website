// Checks the agent-facing docs. Run: node tools/check-docs.mjs
// Fails when CLAUDE.md is over budget, an "(expires YYYY-MM-DD)" date has
// passed, a file named in backticks is missing, or any tracked text file
// holds control or zero-width characters. Never edits anything.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const WORD_BUDGET = 400; // raise only after pruning
const problems = [];

function mdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name).replace(/\\/g, "/");
    if (statSync(p).isDirectory()) return mdFiles(p);
    return p.endsWith(".md") ? [p] : [];
  });
}

const docs = ["CLAUDE.md", "README.md", ...mdFiles("docs"), ...mdFiles(".claude")]
  .filter((f) => existsSync(f));

const words = readFileSync("CLAUDE.md", "utf8").split(/\s+/).filter(Boolean).length;
if (words > WORD_BUDGET) problems.push(`CLAUDE.md: ${words} words, budget ${WORD_BUDGET}`);

// Today in UK time, as YYYY-MM-DD (en-CA formats that way).
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

for (const file of docs) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\(expires (\d{4}-\d{2}-\d{2})\)/g)) {
      if (m[1] < today) problems.push(`${file}:${i + 1}: expired ${m[1]}`);
    }
    // Only backticked tokens that look like repo paths: no spaces, not
    // absolute, and containing a "/" or a file extension.
    for (const m of line.matchAll(/`([^`\s]+)`/g)) {
      const token = m[1].replace(/^\.\//, "");
      if (/^[!?/~]|:/.test(token)) continue;
      if (!/\/|\.[a-z0-9]+$/i.test(token)) continue;
      if (!existsSync(token)) problems.push(`${file}:${i + 1}: missing file \`${m[1]}\``);
    }
  });
}

// Hidden characters in every tracked text file.
function isHidden(code) {
  if (code === 9 || code === 10 || code === 13) return false;
  return code < 32 || code === 127 ||
    (code >= 0x200b && code <= 0x200f) || (code >= 0x2028 && code <= 0x202e) ||
    (code >= 0x2060 && code <= 0x2064) || code === 0xfeff;
}
const tracked = execSync("git ls-files -co --exclude-standard", { encoding: "utf8" })
  .split("\n").filter((f) => f && existsSync(f) && /\.(md|html|js|mjs|json|css|sh|txt)$|^CNAME$|^\.gitignore$/.test(f));
for (const file of tracked) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const ch of line) {
      if (isHidden(ch.charCodeAt(0))) {
        problems.push(`${file}:${i + 1}: hidden character code ${ch.charCodeAt(0).toString(16)}`);
        break;
      }
    }
  });
}

if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log("check-docs: ok");
