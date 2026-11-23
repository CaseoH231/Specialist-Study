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
- **One shared collection** – everyone with the class code adds photos to the same library (sorted by the AI, tagged with their name) and everyone sees them. Without a code you can look and practise but not add.

## Setting up (Cloudflare → Workers → specialist-study → Settings → Variables and secrets)

| Secret | What |
|---|---|
| `GITHUB_TOKEN` | Fine-grained GitHub token, **Contents: Read and write** on `CaseoH231/Specialist-Study` only |
| `APP_PASSCODE` | Your owner passcode – can change anything |
| `SHARE_CODE` | The class code you give friends – lets them add photos, topics and dates to the shared collection (and change only what they added) |
| `OWNER_IPS` | Optional: your home address(es) for the AI features (the app shows the value under ⋯ More → This device) |

Then: ⋯ More → **Log in (class code or owner)…** – your passcode on your devices, the class code on friends'. On someone else's laptop, use ⋯ More → **Log out (owner)** when you're done.

## Files

`index.html`, `style.css`, `app.js` (the app), `lib.js` (library rules, shared with the Worker), `worker/` (API: GitHub storage,
sorting, helper, access lock), `sw.js` (offline), `vendor/katex` (maths rendering, MIT), `tools/` (deploy packer, weekly notes helper),
`data/library.json` + `photos/` (the owner's library), `tests/` (`bash tests/run_tests.sh`).
