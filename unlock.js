// What's been uploaded decides what the study tools may show. This is a study helper, not "AI help": the formula
// sheet and practice questions only cover things that appear in the uploaded work – its topic names
// and photo titles. Nothing uploaded on something → nothing shown about it.
let sources = '';
// The app passes in the uploaded topics' names and photos' titles (both the owner's and this device's own).
export function setSources(texts) {
  sources = ` ${texts.filter(Boolean).join(' \n ').toLowerCase().replace(/[’']/g, "'")} `;
}
export const hasUploads = () => sources.trim().length > 0;
// Formulas are stricter: only ones explicitly on an uploaded photo (tagged by the weekly notes job) or unlocked on
// request (the helper bot) are shown – a topic name alone unlocks no formulas.
let shownFormulas = new Set();
export function setFormulas(names) { shownFormulas = new Set(names.filter(Boolean)); }
export const formulaShown = (name) => shownFormulas.has(name);
// keys are word starts: "differentiat" matches "Differentiation", "log" matches "Log laws" but not "catalogue".
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function unlocked(keys) {
  if (!keys?.length) return false;
  return keys.some((k) => new RegExp(`(^|[^a-z])${esc(k.toLowerCase())}`).test(sources));
}
