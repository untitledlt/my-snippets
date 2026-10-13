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
    id: "chrome-filler-root",
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
  await createChildren("chrome-filler-root");
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await setTree(DEMO_TREE);
  }
  await rebuildMenu();
});
chrome.runtime.onStartup.addListener(rebuildMenu);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "valueTree" in changes) rebuildMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "chrome-filler-root") return;
  const valueTree = await getTree();
  const value = getNode(valueTree, idToPathParts(info.menuItemId));
  if (typeof value !== "string") return;
  chrome.tabs
    .sendMessage(tab.id, { type: "FILL_VALUE", value }, { frameId: info.frameId })
    .catch(() => {
      // No content script listening (e.g. tab predates install/reload) — nothing to fill.
    });
});
