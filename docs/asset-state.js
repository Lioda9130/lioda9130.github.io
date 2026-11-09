// Shared readiness includes models, embedded images, surface maps and spawn jobs.
const entries = new Map();
const listeners = new Set();
function emit() { for (const fn of listeners) fn(); }
export function observeAssets(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function assetSnapshot() {
  const items = [...entries.values()].map(item => ({ ...item }));
  return { pending: items.filter(x => x.state === 'pending').length,
    loaded: items.filter(x => x.state === 'loaded').length,
    failed: items.filter(x => x.state === 'failed').length, items };
}
export async function trackAsset(key, kind, task) {
  entries.set(key, { key, kind, state: 'pending', error: null }); emit();
  try {
    const value = await task();
    entries.set(key, { key, kind, state: 'loaded', error: null }); emit();
    return value;
  } catch (error) {
    entries.set(key, { key, kind, state: 'failed', error: String(error?.message || error) }); emit();
    throw error;
  }
}
export async function fetchAsset(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, { signal: controller.signal });
    if (!response.ok) throw new Error(`Asset HTTP ${response.status}: ${path}`);
    return await response.arrayBuffer();
  } finally { clearTimeout(timeout); }
}
