#!/bin/bash
# Runs the tests and prints PASS / FAIL.   Usage:  bash tests/run_tests.sh
# Needs node and Playwright. Never calls the real GitHub or AI – the tests use fakes (tests/fakes.cjs).
cd "$(dirname "$0")/.."
if ! curl -s -o /dev/null http://localhost:8767/index.html; then
  (setsid nohup python3 -m http.server 8767 >/dev/null 2>&1 &) </dev/null >/dev/null 2>&1
  sleep 1.5
fi
fails=0
check() { # name, test file, text that must appear
  out=$(cd tests && node "$2" 2>&1)
  if echo "$out" | grep -q "$3"; then echo "PASS  $1"; else echo "FAIL  $1"; echo "$out" | grep -v '^ok' | tail -12 | sed 's/^/      /'; fails=$((fails + 1)); fi
}
check "library rules" test_lib.cjs "lib ok"
check "worker: GitHub storage, locks, AI" test_worker.cjs "worker ok"
check "app: owner, friend, phone" test_app.cjs "app ok"
check "course: study design & work plan" test_course.cjs "course ok"
check "study tools: maths checked independently" test_tools.cjs "tools ok"
check "study tools in the browser" test_v2.cjs "v2 ok"
python3 tools/notes.py check >/dev/null || { echo "FAIL  data/library.json"; fails=$((fails + 1)); }
[ $fails = 0 ] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
