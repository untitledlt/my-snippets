export const DEMO_TREE = {
  "My Snippets": {
    Belongs: {
      "to me": "My Snippets belongs to me!",
    },
  },
  Created: {
    "With ❤️ by": {
      "untitled.lt": "https://github.com/untitledlt/my-snippets",
    },
  },
};

export function pathToId(pathParts) {
  return JSON.stringify(pathParts);
}

export function idToPathParts(id) {
  return JSON.parse(id);
}

export function getNode(tree, pathParts) {
  return pathParts.reduce((node, label) => {
    if (node === undefined || typeof node !== "object") return undefined;
    return node[label];
  }, tree);
}

export function buildMenuItems(tree) {
  const items = [];
  function walk(node, pathParts, parentId) {
    for (const [label, value] of Object.entries(node)) {
      const id = pathToId([...pathParts, label]);
      if (typeof value === "string") {
        items.push({ id, parentId, title: label, type: "leaf" });
      } else {
        items.push({ id, parentId, title: label, type: "folder" });
        walk(value, [...pathParts, label], id);
      }
    }
  }
  walk(tree, [], "chrome-filler-root");
  return items;
}

export function isValidTree(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (child) => typeof child === "string" || isValidTree(child),
  );
}

export function treeToNodes(tree) {
  let counter = 0;
  function nextId() {
    counter += 1;
    return `n${counter}`;
  }
  function walk(node) {
    return Object.entries(node).map(([label, value]) => {
      if (typeof value === "string") {
        return { id: nextId(), type: "leaf", label, value };
      }
      return { id: nextId(), type: "folder", label, children: walk(value) };
    });
  }
  return walk(tree);
}

export function nodesToTree(nodes) {
  const tree = {};
  for (const node of nodes) {
    if (node.label in tree) {
      return { ok: false, error: `Duplicate label "${node.label}" in the same folder.` };
    }
    if (node.type === "leaf") {
      tree[node.label] = node.value;
    } else {
      const childResult = nodesToTree(node.children);
      if (!childResult.ok) return childResult;
      tree[node.label] = childResult.tree;
    }
  }
  return { ok: true, tree };
}
