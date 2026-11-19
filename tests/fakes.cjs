// Fake GitHub contents API and fake Workers AI for the tests – the real ones are never called.
function fakeGitHub() {
  const files = new Map(); let n = 0; const log = [];
  const fetch = async (url, opts = {}) => {
    const u = new URL(String(url));
    const m = u.pathname.match(/^\/repos\/CaseoH231\/Specialist-Study\/contents\/(.+)$/);
    if (u.host !== 'api.github.com' || !m) throw new Error('unexpected fetch ' + url);
    if (opts.headers?.authorization !== 'Bearer ghp_test') return new Response('{}', { status: 401 });
    const path = decodeURIComponent(m[1]), have = files.get(path);
    if (opts.method === 'PUT') {
      const b = JSON.parse(opts.body); log.push({ path, message: b.message });
      if (have && b.sha !== have.sha) return new Response('{}', { status: have && !b.sha ? 422 : 409 });
      if (!have && b.sha) return new Response('{}', { status: 409 });
      files.set(path, { sha: `sha${++n}`, b64: b.content });
      return Response.json({ commit: { html_url: 'https://github.com/x/commit/' + n } });
    }
    if (!have) return new Response('{}', { status: 404 });
    if (opts.headers?.accept === 'application/vnd.github.raw+json') return new Response(Buffer.from(have.b64, 'base64'));
    return Response.json({ sha: have.sha });
  };
  return { fetch, files, log, text: (p) => files.has(p) ? Buffer.from(files.get(p).b64, 'base64').toString('utf8') : null,
    put: (p, text) => files.set(p, { sha: `sha${++n}`, b64: Buffer.from(text).toString('base64') }) };
}
// replies: a function (messages) => object to return as the model's JSON answer
function fakeAI(replies) {
  const calls = [];
  return { calls, run: async (model, input) => { calls.push(input); const r = await replies(input.messages); if (r instanceof Error) throw r; return { choices: [{ message: { content: JSON.stringify(r) } }] }; } };
}
module.exports = { fakeGitHub, fakeAI };
