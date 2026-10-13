import { treeToNodes, nodesToTree, isValidTree } from "./tree.js";
import { getTree, setTree } from "./storage.js";

let nodes = [];
let collapsed = new Set();
let editing = null; // { id, field: "label" | "value", draft }
let confirmDeleteId = null;
let allExpanded = true;
let newNodeCounter = 0;

const treeRoot = document.getElementById("tree-root");
const errorBox = document.getElementById("error");
const savedIndicator = document.getElementById("saved-indicator");
const totalCountEl = document.getElementById("total-count");
const toggleAllButton = document.getElementById("toggle-all");
const restoreFileInput = document.getElementById("restore-file-input");
const restoreConfirmBar = document.getElementById("restore-confirm");
let savedTimer = null;
let pendingRestoreTree = null;

function findEntry(id, list = nodes) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { node: list[i], list, index: i };
    if (list[i].children) {
      const found = findEntry(id, list[i].children);
      if (found) return found;
    }
  }
  return null;
}

function countAll(list) {
  let n = 0;
  for (const node of list) {
    n += 1;
    if (node.children) n += countAll(node.children);
  }
  return n;
}

function flatten(list, depth, rows) {
  for (const node of list) {
    const isFolder = node.type === "folder";
    const isOpen = isFolder && !collapsed.has(node.id);
    rows.push({ node, depth, isFolder, isOpen });
    if (isFolder && isOpen) flatten(node.children, depth + 1, rows);
  }
  return rows;
}

function icon(svgInner, color, size = 16) {
  const span = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  span.setAttribute("width", size);
  span.setAttribute("height", size);
  span.setAttribute("viewBox", "0 0 24 24");
  span.setAttribute("fill", "none");
  span.setAttribute("stroke", color);
  span.setAttribute("stroke-width", "1.8");
  span.setAttribute("stroke-linecap", "round");
  span.setAttribute("stroke-linejoin", "round");
  span.style.flex = "0 0 auto";
  span.innerHTML = svgInner;
  return span;
}

const ICONS = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path>',
  leaf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
  chevron: '<polyline points="9 6 15 12 9 18"></polyline>',
  addFolder:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path><line x1="12" y1="11" x2="12" y2="15"></line><line x1="10" y1="13" x2="14" y2="13"></line>',
  addValue:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="12" x2="12" y2="18"></line><line x1="9" y1="15" x2="15" y2="15"></line>',
  up: '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>',
  down: '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>',
  rename: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
  trash:
    '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
};

function iconButton(className, iconName, color, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.appendChild(icon(ICONS[iconName], color, 15));
  button.addEventListener("click", onClick);
  return button;
}

function render() {
  treeRoot.innerHTML = "";
  const rows = flatten(nodes, 0, []);

  rows.forEach((row, i) => {
    const { node, depth, isFolder, isOpen } = row;
    const rowEl = document.createElement("div");
    rowEl.className = `tree-row ${i % 2 === 0 ? "row-even" : "row-odd"}`;
    rowEl.style.paddingLeft = `${depth * 28 + 14}px`;

    if (isFolder) {
      const chevron = iconButton("chevron-btn", "chevron", "currentColor", "Toggle folder", () => {
        if (collapsed.has(node.id)) collapsed.delete(node.id);
        else collapsed.add(node.id);
        render();
      });
      if (isOpen) chevron.classList.add("open");
      rowEl.appendChild(chevron);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "leaf-spacer";
      rowEl.appendChild(spacer);
    }

    const rowLeft = document.createElement("div");
    rowLeft.className = "row-left";
    rowLeft.appendChild(icon(ICONS[isFolder ? "folder" : "leaf"], isFolder ? "var(--folder)" : "var(--leaf)", isFolder ? 16 : 14));

    const isEditingLabel = editing?.id === node.id && editing.field === "label";
    if (isEditingLabel) {
      rowLeft.appendChild(editInput(editing.draft, false, (draft) => commitEdit(draft)));
    } else {
      const labelButton = document.createElement("button");
      labelButton.type = "button";
      labelButton.className = "label-btn";
      labelButton.textContent = node.label;
      labelButton.addEventListener("click", () => startEdit(node.id, "label", node.label));
      rowLeft.appendChild(labelButton);
    }

    if (isFolder) {
      rowLeft.appendChild(
        iconButton("icon-btn inline-add", "addFolder", "currentColor", "Add subfolder", () =>
          addChild(node.id, "folder"),
        ),
      );
      rowLeft.appendChild(
        iconButton("icon-btn inline-add", "addValue", "currentColor", "Add value", () =>
          addChild(node.id, "leaf"),
        ),
      );
    } else {
      const sep = document.createElement("span");
      sep.className = "value-sep";
      sep.textContent = "·";
      rowLeft.appendChild(sep);

      const isEditingValue = editing?.id === node.id && editing.field === "value";
      if (isEditingValue) {
        rowLeft.appendChild(editInput(editing.draft, true, (draft) => commitEdit(draft)));
      } else {
        const valueButton = document.createElement("button");
        valueButton.type = "button";
        valueButton.className = "value-btn";
        valueButton.textContent = node.value ? node.value : "(empty)";
        valueButton.addEventListener("click", () => startEdit(node.id, "value", node.value));
        rowLeft.appendChild(valueButton);
      }
    }
    rowEl.appendChild(rowLeft);

    const rowRight = document.createElement("div");
    rowRight.className = "row-right";
    if (confirmDeleteId === node.id) {
      const confirmBar = document.createElement("div");
      confirmBar.className = "confirm-bar";
      const label = document.createElement("span");
      label.textContent = "Delete?";
      confirmBar.appendChild(label);
      confirmBar.appendChild(
        iconButton("icon-btn danger", "check", "currentColor", "Confirm delete", () => {
          const entry = findEntry(node.id);
          if (entry) entry.list.splice(entry.index, 1);
          confirmDeleteId = null;
          render();
        }),
      );
      confirmBar.appendChild(
        iconButton("icon-btn", "close", "currentColor", "Cancel delete", () => {
          confirmDeleteId = null;
          render();
        }),
      );
      rowRight.appendChild(confirmBar);
    } else {
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.appendChild(
        iconButton("icon-btn", "up", "currentColor", "Move up", () => move(node.id, -1)),
      );
      actions.appendChild(
        iconButton("icon-btn", "down", "currentColor", "Move down", () => move(node.id, 1)),
      );
      actions.appendChild(
        iconButton("icon-btn", "rename", "currentColor", "Rename", () =>
          startEdit(node.id, "label", node.label),
        ),
      );
      actions.appendChild(
        iconButton("icon-btn danger", "trash", "currentColor", "Delete", () => {
          confirmDeleteId = node.id;
          render();
        }),
      );
      rowRight.appendChild(actions);
    }
    rowEl.appendChild(rowRight);

    treeRoot.appendChild(rowEl);
  });

  totalCountEl.textContent = `${countAll(nodes)} items`;
  toggleAllButton.textContent = allExpanded ? "Collapse all" : "Expand all";
}

function editInput(draft, mono, onCommit) {
  const input = document.createElement("input");
  input.className = mono ? "edit-input mono" : "edit-input";
  input.value = draft;
  input.style.maxWidth = mono ? "" : "220px";
  if (mono) input.placeholder = "Value";
  else input.setAttribute("aria-label", "Rename");
  queueMicrotask(() => input.focus());
  input.addEventListener("input", () => {
    editing.draft = input.value;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit(input.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      editing = null;
      render();
    }
  });
  input.addEventListener("blur", () => onCommit(input.value));
  return input;
}

function startEdit(id, field, currentValue) {
  editing = { id, field, draft: currentValue };
  confirmDeleteId = null;
  render();
}

function commitEdit(draft) {
  if (!editing) return;
  const entry = findEntry(editing.id);
  if (entry) {
    const value = (draft || "").trim();
    if (editing.field === "label") {
      if (value) entry.node.label = value;
    } else {
      entry.node.value = value;
    }
  }
  editing = null;
  render();
}

function addChild(parentId, type) {
  newNodeCounter += 1;
  const id = `new${newNodeCounter}`;
  const node =
    type === "folder"
      ? { id, type: "folder", label: "New folder", children: [] }
      : { id, type: "leaf", label: "New value", value: "" };
  let targetList;
  if (parentId == null) {
    targetList = nodes;
  } else {
    const entry = findEntry(parentId);
    if (!entry || !entry.node.children) return;
    targetList = entry.node.children;
    collapsed.delete(parentId);
  }
  targetList.push(node);
  editing = { id, field: "label", draft: node.label };
  render();
}

function move(id, dir) {
  const entry = findEntry(id);
  if (!entry) return;
  const newIndex = entry.index + dir;
  if (newIndex < 0 || newIndex >= entry.list.length) return;
  const [item] = entry.list.splice(entry.index, 1);
  entry.list.splice(newIndex, 0, item);
  render();
}

function toggleAll(expand) {
  collapsed = new Set();
  if (!expand) {
    (function walk(list) {
      for (const node of list) {
        if (node.children) {
          collapsed.add(node.id);
          walk(node.children);
        }
      }
    })(nodes);
  }
  allExpanded = expand;
  render();
}

async function save() {
  errorBox.textContent = "";
  const result = nodesToTree(nodes);
  if (!result.ok) {
    errorBox.textContent = result.error;
    return;
  }
  await setTree(result.tree);
  savedIndicator.style.display = "flex";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    savedIndicator.style.display = "none";
  }, 2400);
}

async function exportSnippets() {
  const tree = await getTree();
  const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chrome-filler-snippets-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function hideRestoreConfirm() {
  pendingRestoreTree = null;
  restoreConfirmBar.style.display = "none";
  restoreFileInput.value = "";
}

async function handleRestoreFile(file) {
  errorBox.textContent = "";
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    errorBox.textContent = "Invalid JSON file.";
    restoreFileInput.value = "";
    return;
  }
  if (!isValidTree(parsed)) {
    errorBox.textContent = "File does not match the expected snippets format.";
    restoreFileInput.value = "";
    return;
  }
  pendingRestoreTree = parsed;
  restoreConfirmBar.style.display = "flex";
}

async function confirmRestore() {
  if (!pendingRestoreTree) return;
  await setTree(pendingRestoreTree);
  nodes = treeToNodes(pendingRestoreTree);
  collapsed = new Set();
  editing = null;
  confirmDeleteId = null;
  hideRestoreConfirm();
  render();
}

document.getElementById("add-root-folder").addEventListener("click", () => addChild(null, "folder"));
document.getElementById("add-root-value").addEventListener("click", () => addChild(null, "leaf"));
document.getElementById("save").addEventListener("click", save);
toggleAllButton.addEventListener("click", () => toggleAll(!allExpanded));
document.getElementById("export-snippets").addEventListener("click", exportSnippets);
document.getElementById("restore-snippets").addEventListener("click", () => restoreFileInput.click());
restoreFileInput.addEventListener("change", () => {
  const file = restoreFileInput.files[0];
  if (file) handleRestoreFile(file);
});
document.getElementById("restore-confirm-yes").addEventListener("click", confirmRestore);
document.getElementById("restore-confirm-cancel").addEventListener("click", hideRestoreConfirm);

async function load() {
  nodes = treeToNodes(await getTree());
  render();
}

load();
