# mandem-ts-website

Website for the Mandem TeamSpeak server (ts.arazez.com). Plain HTML, CSS and JavaScript with no build step, published by GitHub Pages from `main`.

- Data files and their rules: `docs/SITE-DATA.md`.
- Set the total or add a donor by hand: `./update-donations.sh` (usage at the top of the script).
- Preview locally: run `node tools/serve.mjs` and open the address it prints. On localhost only, add `?preview=open` (or `closed`, `goal`) to see Supporters in that state, or `?demo=perks` for sample perks.
