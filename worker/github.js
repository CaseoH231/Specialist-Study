// Saving to and reading from this repository on GitHub, with the GITHUB_TOKEN secret
// (a fine-grained token with "Contents: Read and write" on CaseoH231/Specialist-Study only).
export const REPO = 'CaseoH231/Specialist-Study';
const API = `https://api.github.com/repos/${REPO}/contents/`;

const headers = (env, extra = {}) => ({
  authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json',
  'user-agent': 'specialist-study', 'x-github-api-version': '2022-11-28', ...extra,
});

export class GitHubError extends Error {
  constructor(status) { super(`github ${status}`); this.status = status; }
}

// Base64 of bytes or UTF-8 text, in chunks.
export function toBase64(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// The file's text and version (sha), or null if it doesn't exist yet.
export async function readText(env, path) {
  const meta = await fetch(API + path + '?ref=main', { headers: headers(env) });
  if (meta.status === 404) return null;
  if (!meta.ok) throw new GitHubError(meta.status);
  const { sha } = await meta.json();
  const raw = await fetch(API + path + '?ref=main', { headers: headers(env, { accept: 'application/vnd.github.raw+json' }) });
  if (!raw.ok) throw new GitHubError(raw.status);
  return { sha, text: await raw.text() };
}

export async function readBytes(env, path) {
  const res = await fetch(API + path + '?ref=main', { headers: headers(env, { accept: 'application/vnd.github.raw+json' }) });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(res.status);
  return res.arrayBuffer();
}

// Creates or replaces a file. sha = the version being replaced (undefined for a new file).
export async function write(env, path, base64, message, sha) {
  const res = await fetch(API + path, {
    method: 'PUT',
    headers: headers(env, { 'content-type': 'application/json' }),
    body: JSON.stringify({ message, content: base64, branch: 'main', ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw new GitHubError(res.status);
  return res.json();
}
