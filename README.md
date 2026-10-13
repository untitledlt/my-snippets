# My Snippets

A personal Chrome extension that lets you right-click on an `<input>`,
`<textarea>`, or `contenteditable` field and pick a predefined value from
a nested context menu. No autofill, no field matching — purely a manual
"paste this value into the field I right-clicked" tool. Values are
organized into folders of arbitrary depth, stored locally on your
machine, and optionally mirrored through your browser's own built-in
sync.

## Features

- Native right-click context menu, nested to match your folder structure.
- Works on `<input>`/`<textarea>` fields (replaces the field's contents)
  and `contenteditable` elements (inserts at the caret position).
  Dispatches `input`/`change` events either way, so frameworks (React,
  Vue, plain JS) pick up the change.
- Options page to add, edit, delete, and reorder folders/values, plus
  export/restore your whole snippet tree as a JSON file.
- Values persist across restarts via `chrome.storage.local`, and are
  mirrored to `chrome.storage.sync` when the user's browser sync is
  enabled (so they follow to other signed-in devices). The extension
  itself makes no network requests.

See [`docs/superpowers/specs/2026-10-13-chrome-filler-design.md`](docs/superpowers/specs/2026-10-13-chrome-filler-design.md)
for the full design.

## Installing (unpacked, for development)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this repository's root directory.
4. A welcome tab opens automatically on first install, with demo values
   to try and a button to open the Options page. Afterward, reach the
   Options page via "Details" → "Extension options" on
   `chrome://extensions`, or by right-clicking the toolbar icon →
   "Options".

## Usage

1. Right-click any text input, textarea, or editable field on a page.
2. Pick a value from the "My Snippets" submenu.
3. For inputs/textareas, the field's contents are replaced with that
   value. For `contenteditable` fields, the value is inserted at the
   caret position.

## Building a release package

```sh
./scripts/build.sh
```

Produces `dist/my-snippets-<version>.zip`, containing exactly the
files Chrome needs to load the extension (manifest, scripts, options
page, icons) — suitable for upload to the Chrome Web Store Developer
Dashboard. The version is read from `manifest.json`.

## Running tests

```sh
node --test
```

## License

MIT — see [LICENSE](LICENSE).

## Privacy

See [PRIVACY.md](PRIVACY.md), hosted at
https://github.com/untitledlt/my-snippets/blob/main/PRIVACY.md for the
Chrome Web Store listing. Short version: the extension itself sends
nothing anywhere; your data only ever leaves the device via your
browser's own sync, if you already have that turned on.
