import { buildMenuItems, getNode, idToPathParts, DEMO_TREE } from "./tree.js";
import { getTree, setTree } from "./storage.js";

let rebuildQueue = Promise.resolve();

function rebuildMenu() {
  rebuildQueue = rebuildQueue.then(doRebuildMenu).catch(() => {});
  return rebuildQueue;
}

async function doRebuildMenu() {
  await chrome.contextMenus.removeAll();
  await chrome.contextMenus.create({
    id: "my-snippets-root",
    title: "My Snippets",
    contexts: ["editable"],
  });
  const valueTree = await getTree();
  const byParent = new Map();
  for (const item of buildMenuItems(valueTree)) {
    if (!byParent.has(item.parentId)) byParent.set(item.parentId, []);
    byParent.get(item.parentId).push(item);
  }
  // macOS renders native submenu items in reverse of their creation order, so
  // siblings are created back-to-front to land in the intended visual order.
  async function createChildren(parentId) {
    const siblings = byParent.get(parentId) ?? [];
    for (let i = siblings.length - 1; i >= 0; i--) {
      const item = siblings[i];
      await chrome.contextMenus.create({
        id: item.id,
        parentId: item.parentId,
        title: item.title,
        contexts: ["editable"],
      });
      if (item.type === "folder") await createChildren(item.id);
    }
  }
  await createChildren("my-snippets-root");
  // Created after the snippet tree so the divider and its items land below
  // all snippets (sibling creation order is preserved at this menu depth).
  await chrome.contextMenus.create({
    id: "my-snippets-divider",
    parentId: "my-snippets-root",
    type: "separator",
    contexts: ["editable"],
  });
  await chrome.contextMenus.create({
    id: "my-snippets-options",
    parentId: "my-snippets-root",
    title: "Options",
    contexts: ["editable"],
  });
  await chrome.contextMenus.create({
    id: "my-snippets-help",
    parentId: "my-snippets-root",
    title: "Help",
    contexts: ["editable"],
  });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await setTree(DEMO_TREE);
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
  await rebuildMenu();
});
chrome.runtime.onStartup.addListener(rebuildMenu);
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (!("valueTree" in changes)) return;
  if (area === "local") {
    rebuildMenu();
  } else if (area === "sync") {
    // Picks up edits made from another synced browser — but only if sync's
    // copy is actually newer, so a delayed echo of this device's own write
    // can't clobber a fresher local edit made in the meantime.
    const incomingUpdatedAt = changes.valueTreeUpdatedAt?.newValue ?? 0;
    const { valueTreeUpdatedAt: localUpdatedAt = 0 } = await chrome.storage.local.get("valueTreeUpdatedAt");
    if (incomingUpdatedAt >= localUpdatedAt) {
      await chrome.storage.local.set({
        valueTree: changes.valueTree.newValue,
        valueTreeUpdatedAt: incomingUpdatedAt,
      });
    }
    rebuildMenu();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "my-snippets-root") return;
  if (info.menuItemId === "my-snippets-options") {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (info.menuItemId === "my-snippets-help") {
    chrome.tabs.create({ url: chrome.runtime.getURL("help.html") });
    return;
  }
  const valueTree = await getTree();
  const value = getNode(valueTree, idToPathParts(info.menuItemId));
  if (typeof value !== "string") return;
  chrome.tabs
    .sendMessage(tab.id, { type: "FILL_VALUE", value }, { frameId: info.frameId })
    .catch(() => {
      // No content script listening (e.g. tab predates install/reload) — nothing to fill.
    });
});
