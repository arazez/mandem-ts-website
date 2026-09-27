# mandem-ts-website

Website for the Mandem TeamSpeak server (ts.arazez.com). Plain HTML, CSS and JavaScript with no build step, published by GitHub Pages from `main`.

- Data files and their rules: `docs/SITE-DATA.md`.
- Set the total or add a donor by hand: `./update-donations.sh` (usage at the top of the script).
- Test locally: serve the folder (for example `npx serve .`), because the page can't load its data from a file:// address. The `?preview=` and `?demo=` switches work on localhost only; see the comments in `index.html`.
