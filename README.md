# QR Code Generator

A free, private QR code and barcode generator that runs entirely in your browser and works offline.
Install it as an app on **Linux**, **Windows 11** and **Android**.

> 🤖 This app was vibe-coded with [Claude](https://claude.com/claude-code) (Anthropic's AI) using Claude Code.

**Live app:** https://seiko95.github.io/qr-generator/

## Features

| Type | What the code does when scanned |
|---|---|
| Link | Opens a website |
| Text | Shows a text message |
| E-mail | Opens a new e-mail with recipient, subject and body |
| Call | Dials a phone number |
| SMS | Opens a text message with number and content |
| V-card | Saves a contact (name, phones, e-mail, company, address…) |
| WhatsApp | Opens a WhatsApp chat, with an optional message |
| Wi-Fi | Joins a Wi-Fi network (WPA/WEP/open, hidden networks) |
| PDF | Opens a PDF hosted online (Drive, Dropbox, your site…) |
| App | Opens an app in Google Play, the App Store, or any download link |
| Images | Opens a photo or album hosted online |
| Video | Plays a YouTube / Vimeo / TikTok / Drive video |
| Social Media | Opens a profile on Instagram, Facebook, X, TikTok, LinkedIn, YouTube, GitHub… |
| Event | Adds an event to the calendar (timed or all-day) |
| 2D Barcode | Data Matrix, PDF417, Aztec, plus Code 128, Code 39, EAN-13, EAN-8, UPC-A |

Design options: colors, square / rounded / dot style, error correction level, center logo,
quiet zone, and export size. Export as **PNG** or **SVG**, copy to the clipboard, or share (Android).

PDF, images, videos and apps are too big to fit inside a QR code. Upload the file somewhere
(Google Drive, Dropbox, YouTube…), set it to "anyone with the link", and paste the link.

## Install

- **Windows 11 / Linux:** open the live app in Chrome or Edge, then click **Install app**
  (or the install icon in the address bar). It gets its own window and a Start-menu / launcher entry.
- **Android:** open the live app in Chrome, then tap **Install app**, or ⋮ → **Add to Home screen**.
- **Offline / no install:** download this repository and open `index.html` in a browser.

## Development

No build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Tests:

```sh
node --test tests/                       # payload builders
uv run --with playwright --with zxing-cpp --with pillow \
  python tests/e2e.py --chromium /usr/bin/chromium   # browser: generate + decode every type
```

When you change a file, bump `CACHE` in `sw.js` so installed apps pick up the update.

## Credits

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT)
- [bwip-js](https://github.com/metafloor/bwip-js) by Mark Warren (MIT)

QR Code is a registered trademark of DENSO WAVE INCORPORATED.
