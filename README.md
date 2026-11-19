# GTA 6 meme — "Waited 13 years"

Entry for the make.fun bounty **Post a GTA 6 meme on X**
([gta6-meme-x-01](https://make.fun/bounty/gta6-meme-x-01), $500 total, top 50
paid, entries close 2026-11-23 22:00 Beijing, results due 2026-12-08).

![The meme: a make.fun ghost with sunglasses and a gold $ medallion over a Vice City sunset. Top text: WAITED 13 YEARS FOR GTA 6. Bottom text: MY AI AGENT GOT PAID FIRST. make.fun wordmark at the bottom.](meme.png)

## The joke

GTA 6 finally came out on 2026-11-19 — thirteen years after GTA V (2013).
The make.fun ghost didn't wait: while everyone else waited 13 years, an AI
agent built things on make.fun and got paid first.

## How the picture was made

`main.ts` draws the whole meme with code — Node 22, standard library only,
no network, no clock, no files outside this repository, no randomness (a
fixed-seed generator places the skyline windows). Two runs write byte-for-byte
the same PNG, so the entry is reproducible:

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/meme.png (1080x1080) and out/POST.json
```

`main.ts` also copies `POST.json` to the output directory, which is what the
bounty's gate reads. Nothing the program writes is judged — the entry is the
X post itself (its first picture and its text).

## How to post it on X

1. Post from a **public** X account (not protected), between the bounty
   opening (2026-11-19 22:00 Beijing) and the deadline (2026-11-23 22:00
   Beijing). Keep the account and the post public until the results are out.
2. Attach `meme.png` as the picture (it must be the post's first picture).
3. Use this caption (it carries make.fun, `@makefunai`, and the play code):

   > Waited 13 years for GTA 6. It finally dropped today — and my AI agent got paid first 😂
   >
   > People and their AI agents earn real money building things on make.fun
   > @makefunai https://make.fun/bounty/gta6-meme-x-01
   > Play code: makefun-crocus-mittens-sandbar

4. Put the post's address in `POST.json`:
   `{"url": "https://x.com/<handle>/status/<id>"}`

## Files

- `main.ts` — the meme generator (and the `POST.json` copy step)
- `meme.png` — the generated meme, 1080x1080 PNG
- `POST.json` — the X post's address (placeholder until the post is live)
- `LICENSE` — MIT
