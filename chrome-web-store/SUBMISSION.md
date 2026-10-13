# Chrome Web Store submission checklist — My Snippets

Everything you'll be asked for in the Developer Dashboard
(https://chrome.google.com/webstore/devconsole), gathered in one place.
Text fields you can copy-paste are in sibling files in this folder.

## Account

- [ ] One-time $5 developer registration fee paid (if not already a
      registered CWS developer).

## Package

- [ ] Run `./scripts/build.sh` to produce `dist/my-snippets-<version>.zip`.
- [ ] Load the unpacked zip contents locally once more via
      `chrome://extensions` → Load unpacked, and smoke-test before
      upload.

## Store listing tab

- **Title**: `My Snippets`
- **Summary** (short description, ≤132 chars): see `short-description.txt`
- **Description** (detailed): see `detailed-description.txt`
- **Category**: Productivity
- **Language**: English
- **Icon**: `icons/icon128.png` (already in repo)
- **Screenshots**: at least one, 1280×800 or 640×400 — not yet
  created. Suggested shots:
  1. The nested right-click context menu open over a text field.
  2. The options page showing a folder tree with a few values.
- **Promo tile** (optional, 440×280): not created.

## Privacy practices tab

- **Single purpose**: "Lets the user insert a predefined text snippet
  into the input, textarea, or contenteditable field they right-click,
  from a context menu built from their own saved folders."
- **Permission justifications**:
  - `storage` — stores the user's folders/snippets locally via
    `chrome.storage.local`; required so values persist across
    restarts.
  - `contextMenus` — required to build the native right-click submenu
    used to pick a snippet.
  - Host access `<all_urls>` (via `content_scripts.matches`) — the
    extension's whole purpose is to insert a snippet into *any* input
    field on *any* site the user is working on (personal sites, work
    tools, forms you don't control), so it can't be scoped to a fixed
    list of domains. Justification text to paste into the dashboard:
    > "This extension inserts user-selected text into form fields.
    > Since the user may want to use it on any website they visit
    > (personal projects, internal tools, third-party forms), the
    > content script needs to run on all URLs. It only reads/writes
    > the single field the user right-clicks and performs no network
    > requests."
- **Data usage**: declare that the extension does **not** collect any
  of the listed data categories (no personally identifiable info,
  no health info, no financial info, no authentication info, no
  personal communications, location, web history, user activity, or
  website content is collected/transmitted — everything stays in
  local storage on-device).
- **Privacy policy URL**:
  `https://github.com/untitledlt/my-snippets/blob/main/PRIVACY.md`
- [ ] Certify compliance with the Developer Program Policies.

## Distribution tab

- **Visibility**: Private or Public — decide (private/unlisted is
  fine for personal use; public if you want it discoverable).
- **Regions**: All regions, unless you want to restrict.

## After submission

- Review typically takes a few hours to a few days; extensions
  requesting broad host permissions (`<all_urls>`) sometimes get
  extra scrutiny or a follow-up request for clarification on the
  justification above.
