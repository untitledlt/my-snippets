# Chrome Filler

A personal Chrome extension that lets you right-click on an `<input>` or
`<textarea>` and pick a predefined value from a nested context menu. No
autofill, no field matching — purely a manual "paste this value into the
field I right-clicked" tool. Values are organized into folders of
arbitrary depth and stored only on your local machine.

## Features

- Native right-click context menu, nested to match your folder structure.
- Clicking a value replaces the field's contents and dispatches
  `input`/`change` events, so frameworks (React, Vue, plain JS) pick up
  the change.
- Options page to add, edit, delete, and reorder folders/values.
- Values persist across restarts, scoped to your browser profile only.
  No sync, no export/import, no network access.

See [`docs/superpowers/specs/2026-10-13-chrome-filler-design.md`](docs/superpowers/specs/2026-10-13-chrome-filler-design.md)
for the full design.

## Installing (unpacked, for development)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this repository's root directory.
4. Open the extension's options page (click "Details" → "Extension
   options", or right-click the toolbar icon → "Options") to add your
   folders and values.

## Usage

1. Right-click any text input or textarea on a page.
2. Pick a value from the "Chrome Filler" submenu.
3. The field's contents are replaced with that value.

## Building a release package

```sh
./scripts/build.sh
```

Produces `dist/chrome-filler-<version>.zip`, containing exactly the
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

See [PRIVACY.md](PRIVACY.md). Short version: nothing leaves your
machine.
