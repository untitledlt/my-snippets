let lastEditableTarget = null;
let savedRange = null;

function getContentEditableRoot(el) {
  while (el && el !== document.body && el.nodeType === Node.ELEMENT_NODE) {
    if (el.isContentEditable) return el;
    el = el.parentElement;
  }
  return null;
}

document.addEventListener(
  "contextmenu",
  (event) => {
    const target = event.target;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      lastEditableTarget = target;
      savedRange = null;
      return;
    }
    const editableRoot = getContentEditableRoot(target);
    if (editableRoot) {
      lastEditableTarget = editableRoot;
      const selection = window.getSelection();
      // The caret is already placed at the click point by the time
      // contextmenu fires; save it now since the selection can be lost
      // while the native context menu has focus.
      savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
      return;
    }
    lastEditableTarget = null;
    savedRange = null;
  },
  true,
);

function setNativeValue(target, value) {
  // Frameworks like React wrap the element's own `value` property with a
  // setter that also updates their internal change-tracking state. Calling
  // that wrapped setter (via a plain assignment) marks the tracker as
  // already up to date, so the "input" event dispatched below is seen as a
  // no-op change and the framework re-renders the field back to its old
  // value. Going through the native prototype's setter bypasses the
  // wrapper, leaving the tracker stale so the event is processed normally.
  const proto =
    target.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
  nativeSetter.call(target, value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function insertIntoContentEditable(target, value) {
  target.focus();
  const selection = window.getSelection();
  if (savedRange) {
    selection.removeAllRanges();
    selection.addRange(savedRange);
  } else if (selection.rangeCount === 0) {
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection.addRange(range);
  }

  // execCommand still dispatches real beforeinput/input events in Chrome,
  // which is what most rich-text editors (Gmail, Notion, etc.) listen for.
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
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  }
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "FILL_VALUE") return;
  const target = lastEditableTarget;
  if (!target || !target.isConnected) return;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
    setNativeValue(target, message.value);
  } else {
    insertIntoContentEditable(target, message.value);
  }
});
