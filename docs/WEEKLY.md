# Weekly notes job

Once a week (Sunday night, scheduled) Claude reads the new photos and writes notes under each one.

## Steps

1. Work in a checkout of `CaseoH231/Specialist-Study` on `main` (`git pull` first).
2. List the photos that need notes:
   `python3 tools/notes.py pending`
   Each line is: id, file, topic path, title. If there are none, stop: nothing to do.
3. For each photo, open the image file (e.g. `photos/p-xxxx.jpg`) and look at it carefully. Write its notes to a
   scratch file **outside the repo**, then save them:
   `python3 tools/notes.py set p-xxxx /path/to/notes.md`
4. `python3 tools/notes.py check` and `bash tests/run_tests.sh` must pass.
5. Commit only `data/library.json`, message `Weekly notes: N photos`, and push to `main`.
   If the push is refused because the app saved something meanwhile: `git pull --rebase`. If `data/library.json`
   conflicts, take the remote copy (`git checkout --theirs`… or re-fetch) and run step 3's `set` commands again on it,
   then push. Never drop changes the app made (new photos, moves, renames).
   No redeploy is needed – the site reads the library from GitHub.

## What the notes should be

The student is in high school doing Specialist Mathematics. The notes are for revision, written under the photo
of their own work. Keep them short, accurate and useful – roughly 60–200 words:

- `### What this is` – one or two lines: the topic and what the questions/work are about.
- `### Key ideas` or `### Method` – the steps/rules/formulas used, as `- ` bullets.
- `### Watch out` – common mistakes, or any **mistakes in their working** (say which question and what the fix is,
  kindly). If the working looks right, say so briefly (“Working looks correct.”).
- Optionally `### Try next` – one similar practice question.

Stick to what's on the photo: explain the working, rules and formulas used there. Don't bring in other topics or extra
formulas – the app is a study helper for what's been uploaded, not general maths help.

Formatting the app understands: `### ` headings, `- ` bullets, `**bold**`, and maths in `$…$` (inline) or `$$…$$`
(display), written in LaTeX (e.g. `$z = r\,\text{cis}\,\theta$`, `$\int_0^1 x e^x\,dx$`). Nothing else (no tables, no images, no HTML).

If a photo is unreadable or isn't maths, write a one-line note saying so. Don't change titles, topics or anything
else in the library – only notes (the student can ask for moves in the app).
