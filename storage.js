const LOCAL_STORAGE_KEY = "valueTree";

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage?.local;

export async function getTree() {
  if (hasChromeStorage) {
    const { valueTree = {} } = await chrome.storage.local.get("valueTree");
    return valueTree;
  }
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function setTree(tree) {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ valueTree: tree });
    return;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tree));
}
