# Specialist Study — notes for Claude

Photos of the user's Specialist Maths work, sorted into topics automatically, with notes underneath (plain HTML/CSS/JS ES modules, no build step). Personal project, Cloudflare Worker `specialist-study`. Sister app of `CaseoH231/bio-study` (same look and layout).

- **"Do the weekly notes"** (or a scheduled Sunday run): follow `docs/WEEKLY.md`.
- The owner's library is `data/library.json` + `photos/<id>.jpg` on `main` in this repo. The app saves to it through the Worker (`/api/upload`, `/api/change`) with the GITHUB_TOKEN secret; changes are small ops (`lib.js` `applyOps`) applied to the newest copy, so the app and the weekly job never overwrite each other. Writes always need APP_PASSCODE.
- Sorting (`worker/sort.js`) and the helper (`worker/assistant.js`) use free Workers AI (Gemma 4, `env.AI`, thinking off) and are locked to OWNER_IPS / APP_PASSCODE (`worker/access.js`). The helper only suggests; the app applies after "Do it". Sorting only picks a topic and title – it doesn't transcribe.
- Friends see the owner's library read-only; their own photos stay on their device (IndexedDB + localStorage `specialist-study-mine-v1`, ids start with `my-`).
- Course page (`#/course`, `course.js` + `worker/course.js`, the same files in bio-study and Specialist-Study – keep them identical): the owner uploads the study design and work plan (PDF/images) to `course/` in the repo via `/api/course` (APP_PASSCODE); everyone views them at `/course/<file>`.
- Run `bash tests/run_tests.sh` before pushing; it must PASS. Tests fake GitHub and the AI (`tests/fakes.cjs`) – never call the real ones.
- Each release: bump `CACHE` in `sw.js` (`specialist-study-vN`) and add any new file to its FILES list.
- Deploy: `python3 tools/build_worker.py OUT && cd OUT && npx wrangler deploy` (packs the files into the Worker script). Data changes (library/photos) need no redeploy.
- Commit and push to `main`. Don't ask for permission to start; just do the work and push.
- After every change, summarise in plain language and end with `Total lines of code: N`, counted with:
  `find . -path ./.git -prune -o -path ./vendor -prune -o -path ./node_modules -prune -o -type f \( -name '*.js' -o -name '*.cjs' -o -name '*.py' -o -name '*.html' -o -name '*.css' -o -name '*.sh' -o -name '*.webmanifest' \) -print | xargs cat | wc -l`
