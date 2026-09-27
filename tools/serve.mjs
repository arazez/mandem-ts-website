// Local preview server, no installs needed: node tools/serve.mjs [port]
// Then open e.g. http://localhost:8000/supporters?preview=open
// Like GitHub Pages, /supporters serves supporters.html.
// (?preview=open|closed|goal and ?demo=perks only work on localhost).
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.argv[2]) || 8000;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

createServer((req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path.endsWith("/")) path += "index.html";
  let file = resolve(join(root, path));
  if (!existsSync(file) && existsSync(file + ".html")) file += ".html";
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Preview: http://localhost:${port}/  (Ctrl+C to stop)`);
  console.log(`Donations open: http://localhost:${port}/supporters?preview=open`);
});
