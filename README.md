# satya-site

Personal website for Satya Salyankar. Plain HTML/CSS — no build step, no framework.
Hosted on GitHub Pages.

```
index.html                  About / home page
tools/index.html            Tool gallery
tools/<tool>/index.html     One folder per tool (single self-contained HTML file)
travel/index.html           Trip list
travel/<trip>/index.html    One folder per trip, photos in travel/<trip>/photos/
watches/index.html          Watch post list
watches/<post>/index.html   One folder per post
assets/site.css             Shared styles (colors, fonts, layout)
assets/site.js              Theme toggle + current-nav highlight
404.html                    Not-found page (GitHub Pages serves this automatically)
.nojekyll                   Tells GitHub Pages to serve files as-is
```

Every page is self-contained: header, nav and footer are copied into each file.
If you change the nav, change it in every `index.html` (a find-and-replace does it).

Text marked with a yellow `TODO` box on the live site is placeholder — search the repo for
`class="todo"` to find all of them.

## Adding content

**A new tool built with Claude**
1. Save the tool as `tools/<tool-slug>/index.html`.
2. In `tools/index.html`, copy an existing `<article class="card tool">` block, edit the
   title/description/tags/date and point the link at `<tool-slug>/`.

**A new trip**
1. Copy `travel/sample-kyoto/` to `travel/<trip-slug>/`.
2. Put photos in `travel/<trip-slug>/photos/`. Resize JPGs to ~2000 px on the long edge first —
   phone originals are 5–10 MB each and will make the repo and the page slow.
3. Edit `index.html` in that folder; in `travel/index.html` copy a card and link it.

**A new watch post**
1. Copy `watches/sample-36mm/` to `watches/<post-slug>/`, drop in a photo, edit `index.html`.
2. In `watches/index.html` copy a card and link it.

Once you're happy with the format, delete the `sample-*` folders and their cards.

## Publishing (first time)

1. Create a new **public** repository on GitHub (e.g. `satya-site`). Don't add a README or
   .gitignore there — this folder already has them.
2. From this folder:
   ```
   git remote add origin https://github.com/<your-username>/satya-site.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
   Branch: `main`, folder `/ (root)`. Save.
4. After a minute the site is live at `https://<your-username>.github.io/satya-site/`.

To get `https://<your-username>.github.io/` with no suffix, name the repository
`<your-username>.github.io` instead. For a custom domain, add it under Settings → Pages
and create a `CNAME` file in this folder containing the domain.

## Publishing (every time after)

```
git add -A
git commit -m "Add <what you added>"
git push
```

GitHub Pages redeploys automatically within a minute or so.

## Previewing locally

Open any `index.html` directly in a browser — everything works from `file://`. If you want a
proper local server (e.g. to test relative links exactly as Pages serves them):

```
python -m http.server 8000
```

then open http://localhost:8000/.
