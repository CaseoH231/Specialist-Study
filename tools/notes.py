"""The weekly notes job's helper (see docs/WEEKLY.md). Works on data/library.json in this checkout.
  python3 tools/notes.py pending          – photos with no notes yet: id, file, topic path, title
  python3 tools/notes.py set ID FILE      – put the text in FILE under photo ID as its notes
  python3 tools/notes.py check            – checks library.json is valid (run before committing)"""
import json, os, sys, datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LIB = os.path.join(ROOT, 'data', 'library.json')

def load():
    if not os.path.exists(LIB):
        return {'version': 1, 'updatedAt': None, 'topics': [], 'photos': []}
    with open(LIB, encoding='utf-8') as f:
        return json.load(f)

def save(lib):
    with open(LIB, 'w', encoding='utf-8') as f:
        json.dump(lib, f, indent=1, ensure_ascii=False)

def path_of(lib, tid):
    by = {t['id']: t for t in lib['topics']}
    out, seen = [], set()
    while tid in by and tid not in seen:
        seen.add(tid); out.insert(0, by[tid]['name']); tid = by[tid].get('parent')
    return ' › '.join(out)

def main(args):
    lib = load()
    if not args or args[0] == 'pending':
        todo = [p for p in lib['photos'] if not (p.get('notes') or '').strip()]
        for p in todo:
            print(f"{p['id']}\t{p.get('file') or 'photos/' + p['id'] + '.jpg'}\t{path_of(lib, p['topic'])}\t{p['title']}")
        print(f'{len(todo)} photo(s) need notes', file=sys.stderr)
    elif args[0] == 'set' and len(args) == 3:
        text = open(args[2], encoding='utf-8').read().strip()
        p = next((p for p in lib['photos'] if p['id'] == args[1]), None)
        if not p: sys.exit(f'no photo {args[1]}')
        if not text: sys.exit('empty notes')
        p['notes'] = text
        p['notesAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
        lib['updatedAt'] = p['notesAt']
        save(lib); print('ok', p['id'])
    elif args[0] == 'check':
        ids = {t['id'] for t in lib['topics']}
        bad = [p['id'] for p in lib['photos'] if p['topic'] not in ids]
        bad += [t['id'] for t in lib['topics'] if t.get('parent') and t['parent'] not in ids]
        if bad: sys.exit('broken references: ' + ', '.join(bad))
        print(f"library ok: {len(lib['photos'])} photos, {len(lib['topics'])} topics")
    else:
        sys.exit(__doc__)

if __name__ == '__main__':
    main(sys.argv[1:])
