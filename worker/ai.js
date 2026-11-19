// The free AI model (Cloudflare Workers AI, Google's Gemma 4 – it can look at photos).
// Free plan = 10,000 "neurons" a day; it simply stops for the day after that, never charges.
export const MODEL = '@cf/google/gemma-4-26b-a4b-it';

// The JSON object in a model reply (it sometimes wraps it in text).
export function readJSON(reply) {
  if (reply && typeof reply === 'object') return reply;
  const text = String(reply || '');
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

export async function ask(env, messages, schema, maxTokens = 2000) {
  const out = await env.AI.run(MODEL, {
    messages,
    response_format: { type: 'json_schema', json_schema: { name: 'reply', schema, strict: true } },
    max_completion_tokens: maxTokens,
    temperature: 0.2,
    chat_template_kwargs: { enable_thinking: false }, // long "thinking" made requests time out
  });
  return readJSON(out?.choices?.[0]?.message?.content ?? out?.response);
}

export const limitHit = (err) => /neuron|allocation|4006|3036|quota|limit/i.test(String(err?.message || err));
