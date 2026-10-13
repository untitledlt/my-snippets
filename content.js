let lastEditableTarget = null;

document.addEventListener(
  "contextmenu",
  (event) => {
    const target = event.target;
    lastEditableTarget =
      target.tagName === "INPUT" || target.tagName === "TEXTAREA" ? target : null;
  },
  true,
);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "FILL_VALUE") return;
  const target = lastEditableTarget;
  if (!target || !target.isConnected) return;
  target.value = message.value;
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
});
