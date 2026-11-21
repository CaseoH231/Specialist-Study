# Specialist Study

Photos of Specialist Maths work, sorted into topics and sub-topics automatically, with revision notes underneath.
Live at **https://specialist-study.adrian11jonker.workers.dev** – installable as an app, works offline for photos you've already opened.

- **Upload** photos (camera or files). On the owner's device each one is saved to this repo and the free AI looks at it
  to choose a topic (making new topics/sub-topics only when nothing fits) and a short title. Change anything in the list that appears.
- **Click a photo** to see it big, then **Full screen** (zoom, swipe / arrow keys for the next one).
- **✦ Ask** – the helper: "move the induction photos into Proof", "rename this topic"… It suggests, you press **Do it**.
- **Notes** under each photo are written once a week by Claude (see `docs/WEEKLY.md`).
- **Practice** – fresh Specialist questions on the topics you've uploaded work for (nothing else), marked instantly with worked answers, plus a daily streak.
- **Formula sheet** – only formulas for what you've uploaded; more unlock as you upload. Searchable, star the ones you forget, printable.
- **Planner** – SAC/test dates with countdowns. The owner's are shared with everyone; friends can add their own.
- **Confidence** – mark each topic 🔴 / 🟡 / 🟢; home shows what to revise first. **Share** a link to any topic or photo, or **print** a topic as a PDF.
- **Friends** who open the link see your photos and notes (read-only). Photos they upload stay on their own device.

## Setting up (Cloudflare → Workers → specialist-study → Settings → Variables and secrets)

| Secret | What |
|---|---|
| `GITHUB_TOKEN` | Fine-grained GitHub token, **Contents: Read and write** on `CaseoH231/Specialist-Study` only |
| `APP_PASSCODE` | Your passcode – needed to upload or change anything |
| `OWNER_IPS` | Optional: your home address(es) for the AI features (the app shows the value under ⋯ More → This device) |

Then on your laptop: ⋯ More → **Log in as owner…** and enter the passcode once. On someone else's laptop, use ⋯ More → **Log out (owner)** when you're done.

## Files

`index.html`, `style.css`, `app.js` (the app), `lib.js` (library rules, shared with the Worker), `worker/` (API: GitHub storage,
sorting, helper, access lock), `sw.js` (offline), `vendor/katex` (maths rendering, MIT), `tools/` (deploy packer, weekly notes helper),
`data/library.json` + `photos/` (the owner's library), `tests/` (`bash tests/run_tests.sh`).
