import { buildMenuItems, getNode, idToPathParts, DEMO_TREE } from "./tree.js";
import { getTree, setTree } from "./storage.js";

// chrome.scripting serializes this and runs it inside the page, so it can't
// close over anything from background.js. Uses the focused field instead of
// content.js's tracked lastEditableTarget, since right-clicking a field
// focuses it.
function fillActiveElement(value) {
  let el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  if (!el) return;

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const proto =
      el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (el.isContentEditable) {
    el.focus();
    // document.getSelection() can't see into a shadow root — the selection
    // for an editable element inside one lives on its own root instead.
    const root = el.getRootNode();
    const selection = root.getSelection ? root.getSelection() : window.getSelection();
    if (selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.addRange(range);
    }
    const inserted = document.execCommand && document.execCommand("insertText", false, value);
    if (!inserted) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(value);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

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
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id, frameIds: [info.frameId ?? 0] },
      func: fillActiveElement,
      args: [value],
    })
    .catch(() => {
      // Page isn't scriptable (chrome:// pages, the Web Store) — nothing to fill.
    });
});
