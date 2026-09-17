# satya-site

Personal website for Satya Salyankar. Plain HTML/CSS — no build step, no framework.
Hosted on GitHub Pages.

```
index.html                  Landing page (full-screen photo + Enter)
home/index.html             Hub page: hello + Resume / Tools / Time tiles
resume/index.html           Resume
tools/index.html            Tool gallery
tools/<tool>/index.html     One folder per tool (single self-contained HTML file)
watches/index.html          Time: list of articles
watches/<slug>/index.html   One folder per article; photos live in watches/photos/
assets/landing.jpg          Landing photo (replace to change it; keep ~2400px wide)
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


**A new watch article**
1. Copy `watches/myths-of-watch-collecting/` to `watches/<slug>/` and edit `index.html`.
2. In `watches/index.html`, copy the `<a class="post">` card and point it at the new folder.


## Publishing (first time)

1. Create a new **public** repository on GitHub named exactly `salyankar.github.io`. Don't add a README or
   .gitignore there — this folder already has them.
2. From this folder:
   ```
   git remote add origin https://github.com/salyankar/salyankar.github.io.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
   Branch: `main`, folder `/ (root)`. Save.
4. After a minute the site is live at `https://salyankar.github.io/`.

For a custom domain later, add it under Settings → Pages and create a `CNAME` file in this
folder containing the domain.

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
