"""End-to-end test: fill every tab in a real browser, export PNG + SVG, decode them and compare.

Run:  uv run --with playwright --with zxing-cpp --with pillow python tests/e2e.py [--chromium /usr/bin/chromium]
"""
import argparse
import base64
import functools
import http.server
import io
import pathlib
import sys
import threading

import zxingcpp
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (tab, {field: value}, expected decoded text, barcode format check)
CASES = [
    ("link", {"url": "example.com/hello?x=1"}, "https://example.com/hello?x=1"),
    ("text", {"text": "Bonjour, ça marche ! 🎉\nLigne 2"}, "Bonjour, ça marche ! 🎉\nLigne 2"),
    ("email", {"to": "a@b.co", "subject": "Hi there", "body": "Hello"}, "mailto:a@b.co?subject=Hi%20there&body=Hello"),
    ("call", {"phone": "+33 6 12 34 56 78"}, "tel:+33612345678"),
    ("sms", {"phone": "+33612345678", "message": "On my way"}, "SMSTO:+33612345678:On my way"),
    ("vcard", {"firstName": "Jean", "lastName": "Dupont", "mobile": "+33600000000", "email": "j@d.fr", "org": "ACME"},
     "BEGIN:VCARD\nVERSION:3.0\nN:Dupont;Jean;;;\nFN:Jean Dupont\nORG:ACME\nTEL;TYPE=CELL:+33600000000\nEMAIL;TYPE=INTERNET:j@d.fr\nEND:VCARD"),
    ("whatsapp", {"phone": "+33 6 12 34 56 78", "message": "Salut"}, "https://wa.me/33612345678?text=Salut"),
    ("wifi", {"ssid": "Home;Net", "password": "secret:123"}, "WIFI:T:WPA;S:Home\\;Net;P:secret\\:123;;"),
    ("app", {"value": "com.whatsapp"}, "https://play.google.com/store/apps/details?id=com.whatsapp"),
    ("social", {"platform": "github", "username": "@torvalds"}, "https://github.com/torvalds"),
    ("event", {"title": "Party", "allDay": True, "startDate": "2026-12-31", "location": "Paris"},
     "BEGIN:VEVENT\nSUMMARY:Party\nDTSTART;VALUE=DATE:20261231\nDTEND;VALUE=DATE:20270101\nLOCATION:Paris\nEND:VEVENT"),
    ("barcode", {"format": "datamatrix", "value": "Data Matrix 123 é"}, "Data Matrix 123 é"),
    ("barcode", {"format": "pdf417", "value": "PDF417 test"}, "PDF417 test"),
    ("barcode", {"format": "azteccode", "value": "Aztec test"}, "Aztec test"),
    ("barcode", {"format": "code128", "value": "ABC-123-xyz"}, "ABC-123-xyz"),
    ("barcode", {"format": "code39", "value": "code39"}, "CODE39"),
    ("barcode", {"format": "ean13", "value": "400638133393"}, "4006381333931"),
    ("barcode", {"format": "ean8", "value": "9638507"}, "96385074"),
    ("barcode", {"format": "upca", "value": "03600029145"}, "036000291452"),
]


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def decode(png_bytes):
    img = Image.open(io.BytesIO(png_bytes)).convert("L")
    res = zxingcpp.read_barcodes(img)
    return [r.text for r in res]


def fill(page, fields):
    for name, value in fields.items():
        sel = f"#f-{name}"
        el = page.locator(sel)
        tag = el.evaluate("e => e.tagName + ':' + (e.type || '')")
        if tag.startswith("SELECT"):
            el.select_option(value)
        elif tag.endswith("checkbox"):
            el.set_checked(bool(value))
        else:
            el.fill(value)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chromium", default=None)
    ap.add_argument("--screens", default=None, help="folder to save screenshots")
    args = ap.parse_args()
    srv = serve()
    url = f"http://127.0.0.1:{srv.server_address[1]}/"
    failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium) if args.chromium else p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url)
        page.evaluate("localStorage.clear()")
        page.reload()
        for case in CASES:
            tab, fields, expected = case
            page.click(f"#tab-{tab}")
            fill(page, fields)
            page.wait_for_function("() => window.__qrgen.state.result || !document.getElementById('error').hidden", timeout=15000)
            page.wait_for_timeout(300)
            err = page.locator("#error")
            if not err.is_hidden():
                print(f"FAIL {tab}: form error: {err.inner_text()}")
                failures += 1
                continue
            data = page.evaluate("() => window.__qrgen.state.result.data")
            b64 = page.evaluate("""async () => {
                const blob = await window.__qrgen.pngBlob();
                const buf = new Uint8Array(await blob.arrayBuffer());
                let s = ''; for (const b of buf) s += String.fromCharCode(b);
                return btoa(s);
            }""")
            decoded = decode(base64.b64decode(b64))
            if fields.get("format") == "upca":
                # zxing reports UPC-A as EAN-13 with a leading 0.
                decoded = [d[1:] if len(d) == 13 and d[0] == "0" else d for d in decoded]
            # SVG export: rasterise in the browser and decode too.
            svg_b64 = page.evaluate("""async () => {
                const svg = await window.__qrgen.svgText();
                const img = new Image();
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
                await img.decode();
                const w = Math.max(600, img.naturalWidth), h = Math.round(w * img.naturalHeight / img.naturalWidth) || w;
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
                return c.toDataURL('image/png').split(',')[1];
            }""")
            svg_decoded = decode(base64.b64decode(svg_b64))
            if fields.get("format") == "upca":
                svg_decoded = [d[1:] if len(d) == 13 and d[0] == "0" else d for d in svg_decoded]
            label = tab + ("/" + fields.get("format", "") if tab == "barcode" else "")
            ok = data == expected and decoded == [expected] and svg_decoded == [expected]
            print(("ok  " if ok else "FAIL") + f" {label:22} png={decoded!r:.60} svg={'ok' if svg_decoded == [expected] else svg_decoded!r}")
            if not ok:
                print(f"     payload={data!r}\n     expected={expected!r}")
                failures += 1

        # Style variants + logo must still scan.
        page.click("#tab-link")
        for style in ["rounded", "dots"]:
            page.click(f"#style button[data-v={style}]")
            page.wait_for_timeout(300)
            b64 = page.evaluate("async () => { const b = await window.__qrgen.pngBlob(); const u = new Uint8Array(await b.arrayBuffer()); let s=''; for (const x of u) s+=String.fromCharCode(x); return btoa(s); }")
            d = decode(base64.b64decode(b64))
            ok = d == ["https://example.com/hello?x=1"]
            print(("ok  " if ok else "FAIL") + f" style={style} -> {d}")
            failures += not ok
        page.set_input_files("#logo", str(ROOT / "icons" / "icon-512.png"))
        page.wait_for_timeout(500)
        ecc = page.evaluate("window.__qrgen.state.result.ecc")
        b64 = page.evaluate("async () => { const b = await window.__qrgen.pngBlob(); const u = new Uint8Array(await b.arrayBuffer()); let s=''; for (const x of u) s+=String.fromCharCode(x); return btoa(s); }")
        d = decode(base64.b64decode(b64))
        ok = d == ["https://example.com/hello?x=1"] and ecc == "H"
        print(("ok  " if ok else "FAIL") + f" logo (ecc={ecc}) -> {d}")
        failures += not ok

        # Validation messages.
        page.click("#tab-email")
        page.fill("#f-to", "not-an-email")
        page.wait_for_timeout(300)
        ok = "not valid" in page.locator("#error").inner_text()
        print(("ok  " if ok else "FAIL") + " email validation message shown")
        failures += not ok

        if args.screens:
            out = pathlib.Path(args.screens)
            out.mkdir(parents=True, exist_ok=True)
            page.click("#style button[data-v=square]")
            page.click("#tab-wifi")
            page.wait_for_timeout(400)
            page.screenshot(path=str(out / "desktop.png"), full_page=True)
            for scheme in ["dark"]:
                page.emulate_media(color_scheme=scheme)
                page.screenshot(path=str(out / f"desktop-{scheme}.png"), full_page=True)
            mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            mobile.goto(url)
            mobile.click("#tab-link")
            mobile.fill("#f-url", "example.com")
            mobile.wait_for_timeout(400)
            mobile.screenshot(path=str(out / "mobile.png"), full_page=True)
            sw = mobile.evaluate("async () => { const r = await navigator.serviceWorker.ready; return !!r.active; }")
            print(("ok  " if sw else "FAIL") + " service worker active")
            failures += not sw
            overflow = mobile.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            print(("ok  " if not overflow else "FAIL") + " no horizontal scroll on phone width")
            failures += overflow

        if errors:
            print("JS errors:", errors)
            failures += len(errors)
        browser.close()
    srv.shutdown()
    print(f"\n{len(CASES)} code cases, {failures} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
