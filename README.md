# HTML Preview

> Inline preview for embedded HTML files in Obsidian.
> Expand `![[page.html]]` directly inside your note and render the HTML page there.

**Author:** [SATOSprod](https://github.com/SATOSprod)  
**License:** Proprietary — see [LICENSE](./LICENSE)

---

## Features

- **Inline HTML rendering** — replace the default “open file” behavior with an expandable preview for embedded `.html` and `.htm` files
- **Expand / collapse** — each embed can be opened inline and collapsed back at any time
- **Two display modes**:
  - **Fixed 16:9** — ideal for desktop; large pages scroll inside the frame
  - **Infinite height** — the iframe grows to the full document height, even for very tall pages
- **Open file button** — keep a direct button to open the HTML file in its own Obsidian tab
- **Minimal UI** — SVG icons only, no emoji, flat business-style design
- **GitHub-ready project** — includes README, LICENSE, `.gitignore`, `manifest.json`, `versions.json`, `tsconfig.json`, and `esbuild.config.mjs`

---

## Requirements

- Obsidian **0.15.0** or later
- Works with embedded HTML files referenced like:

```md
![[plugin_style.html]]
```

---

## Installation

### From source

```bash
git clone https://github.com/SATOSprod/html-preview.git
cd html-preview
npm install
npm run build
```

Copy these files into your vault:

```text
<your-vault>/.obsidian/plugins/html-preview/
├── main.js
├── manifest.json
└── styles.css
```

Then open Obsidian → **Settings → Community plugins → Installed plugins** and enable **HTML Preview**.

### Development mode

```bash
npm run dev
```

---

## Configuration

Open **Settings → HTML Preview**.

| Setting | Default | Description |
|---|---|---|
| **Display mode** | Fixed 16:9 | Render large pages in a standard 16:9 frame with internal scrolling |
| **Infinite height** | — | Grow the iframe to the full page height; very large pages make the note very large |

---

## Usage

1. Put an HTML file in your vault, for example `plugin_style.html`
2. Embed it in a note:

```md
![[plugin_style.html]]
```

3. Switch to **Reading view**
4. Click **Expand preview**
5. The HTML page is rendered inline in the note
6. Click **Collapse preview** to hide it again

---

## Notes

- The plugin targets **embedded HTML files** only (`.html`, `.htm`)
- Inline replacement is implemented with a **Markdown post processor**, so the inline HTML preview is designed for **Reading view**
- **Fixed 16:9** is better for large or complex pages because the note height stays manageable
- **Infinite height** is useful when you want the entire page rendered at once inside the note

---

## File Structure

```text
html-preview/
├── main.ts
├── main.js
├── styles.css
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── versions.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## License

This project is released under a **proprietary license**.  
Copying source code into other projects is **not permitted**.  
See [LICENSE](./LICENSE) for full terms.

© 2026 SATOSprod
