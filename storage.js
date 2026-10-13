const LOCAL_STORAGE_KEY = "valueTree";
const TREE_KEY = "valueTree";
const UPDATED_KEY = "valueTreeUpdatedAt";

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage?.local;
const hasSyncStorage = typeof chrome !== "undefined" && chrome.storage?.sync;

export async function getTree() {
  if (hasChromeStorage) {
    const local = await chrome.storage.local.get([TREE_KEY, UPDATED_KEY]);
    if (hasSyncStorage) {
      const synced = await chrome.storage.sync.get([TREE_KEY, UPDATED_KEY]);
      // Sync mirrors local, but a write to sync can fail silently (quota, rate
      // limit, offline) while local still has the latest edit — only trust
      // sync's copy when it's actually at least as new as local's.
      if (synced[TREE_KEY] && Object.keys(synced[TREE_KEY]).length > 0) {
        const syncedUpdatedAt = synced[UPDATED_KEY] ?? 0;
        const localUpdatedAt = local[UPDATED_KEY] ?? 0;
        if (!local[TREE_KEY] || syncedUpdatedAt >= localUpdatedAt) return synced[TREE_KEY];
      }
    }
    return local[TREE_KEY] ?? {};
  }
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

// Mirrors to storage.sync (so data follows the user's signed-in browser
// profile) with storage.local as the always-on fallback — writes still
// succeed on this device if sync is disabled or the data exceeds sync's
// quota (100KB total / 8KB per item).
export async function setTree(tree) {
  if (hasChromeStorage) {
    const updatedAt = Date.now();
    await chrome.storage.local.set({ [TREE_KEY]: tree, [UPDATED_KEY]: updatedAt });
    if (hasSyncStorage) {
      try {
        await chrome.storage.sync.set({ [TREE_KEY]: tree, [UPDATED_KEY]: updatedAt });
        return { ok: true, synced: true };
      } catch (err) {
        return { ok: true, synced: false, error: err?.message ?? String(err) };
      }
    }
    return { ok: true, synced: false };
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tree));
  return { ok: true, synced: false };
}
