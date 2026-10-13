import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pathToId,
  idToPathParts,
  getNode,
  buildMenuItems,
  isValidTree,
  treeToNodes,
  nodesToTree,
  DEMO_TREE,
} from "../tree.js";

test("DEMO_TREE is a valid tree", () => {
  assert.equal(isValidTree(DEMO_TREE), true);
});

test("pathToId/idToPathParts round-trip simple path", () => {
  const id = pathToId(["Work", "Addresses", "Office"]);
  assert.deepEqual(idToPathParts(id), ["Work", "Addresses", "Office"]);
});

test("pathToId/idToPathParts round-trip label containing a literal dot", () => {
  const id = pathToId(["Work.East", "Office"]);
  assert.deepEqual(idToPathParts(id), ["Work.East", "Office"]);
});

test("getNode returns the tree itself for an empty path", () => {
  const tree = { Work: { Email: "me@work.com" } };
  assert.equal(getNode(tree, []), tree);
});

test("getNode returns a nested leaf value", () => {
  const tree = { Work: { Email: "me@work.com" } };
  assert.equal(getNode(tree, ["Work", "Email"]), "me@work.com");
});

test("getNode returns undefined for a missing path", () => {
  const tree = { Work: {} };
  assert.equal(getNode(tree, ["Nope"]), undefined);
});

test("buildMenuItems flattens an empty tree to no items", () => {
  assert.deepEqual(buildMenuItems({}), []);
});

test("buildMenuItems nests folders under my-snippets-root and under their parent", () => {
  const tree = { Work: { Email: "me@work.com" } };
  const items = buildMenuItems(tree);
  const workId = pathToId(["Work"]);
  const emailId = pathToId(["Work", "Email"]);
  assert.deepEqual(items, [
    { id: workId, parentId: "my-snippets-root", title: "Work", type: "folder" },
    { id: emailId, parentId: workId, title: "Email", type: "leaf" },
  ]);
});

test("isValidTree accepts an empty object", () => {
  assert.equal(isValidTree({}), true);
});

test("isValidTree accepts a nested tree of strings and objects", () => {
  assert.equal(isValidTree({ Work: { Email: "me@work.com" }, Personal: "me@personal.com" }), true);
});

test("isValidTree rejects a non-object root (e.g. a bare string)", () => {
  assert.equal(isValidTree("not a tree"), false);
});

test("isValidTree rejects an array anywhere in the tree", () => {
  assert.equal(isValidTree({ Work: ["Email"] }), false);
});

test("isValidTree rejects a non-string, non-object leaf value (e.g. a number)", () => {
  assert.equal(isValidTree({ Age: 42 }), false);
});

test("treeToNodes converts a nested tree into an ordered node array with generated ids", () => {
  const tree = { Work: { Email: "me@work.com" }, Personal: "me@personal.com" };
  assert.deepEqual(treeToNodes(tree), [
    {
      id: "n1",
      type: "folder",
      label: "Work",
      children: [{ id: "n2", type: "leaf", label: "Email", value: "me@work.com" }],
    },
    { id: "n3", type: "leaf", label: "Personal", value: "me@personal.com" },
  ]);
});

test("treeToNodes on an empty tree returns an empty array", () => {
  assert.deepEqual(treeToNodes({}), []);
});

test("nodesToTree converts a node array back into the stored tree shape", () => {
  const nodes = [
    {
      id: "n1",
      type: "folder",
      label: "Work",
      children: [{ id: "n2", type: "leaf", label: "Email", value: "me@work.com" }],
    },
    { id: "n3", type: "leaf", label: "Personal", value: "me@personal.com" },
  ];
  assert.deepEqual(nodesToTree(nodes), {
    ok: true,
    tree: { Work: { Email: "me@work.com" }, Personal: "me@personal.com" },
  });
});

test("nodesToTree reports an error on duplicate labels at the same level", () => {
  const nodes = [
    { id: "n1", type: "leaf", label: "A", value: "1" },
    { id: "n2", type: "leaf", label: "A", value: "2" },
  ];
  const result = nodesToTree(nodes);
  assert.equal(result.ok, false);
  assert.match(result.error, /A/);
});

test("treeToNodes/nodesToTree round-trip a tree unchanged", () => {
  const tree = { Work: { Email: "me@work.com", Phone: "555-1234" }, Personal: "me@personal.com" };
  assert.deepEqual(nodesToTree(treeToNodes(tree)), { ok: true, tree });
});
