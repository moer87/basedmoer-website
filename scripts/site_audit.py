from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_PAGES = [
    "index.html",
    "moerverse/index.html",
    "live/index.html",
    "academy/index.html",
    "arcade/index.html",
    "moer-flip/index.html",
    "profile/index.html",
    "docs/index.html",
    "status/index.html",
]


class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title_seen = False
        self.viewport_seen = False
        self.refs: list[tuple[str, str, dict[str, str]]] = []
        self.in_title = False
        self.title_text = ""

    def handle_starttag(self, tag, attrs):
        data = {k: (v or "") for k, v in attrs}
        if tag == "title":
            self.in_title = True
        if tag == "meta" and data.get("name", "").lower() == "viewport":
            self.viewport_seen = True
        if tag == "a" and data.get("href"):
            self.refs.append(("href", data["href"], data))
        elif tag == "script" and data.get("src"):
            self.refs.append(("src", data["src"], data))
        elif tag == "link" and data.get("href"):
            self.refs.append(("href", data["href"], data))
        elif tag in {"video", "source"} and data.get("src"):
            self.refs.append(("src", data["src"], data))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
            self.title_seen = bool(self.title_text.strip())

    def handle_data(self, data):
        if self.in_title:
            self.title_text += data


def local_target_exists(raw: str) -> bool:
    parsed = urlparse(raw)
    path = parsed.path
    if not path or path.startswith("#"):
        return True
    if path.startswith("//"):
        return True
    if not path.startswith("/"):
        return True

    relative = path.lstrip("/")
    if not relative:
        return (ROOT / "index.html").exists()

    target = ROOT / relative
    if path.endswith("/"):
        target = target / "index.html"
    return target.exists()


def audit_html(path: Path) -> list[str]:
    failures: list[str] = []
    text = path.read_text(encoding="utf-8")
    parser = AuditParser()
    parser.feed(text)
    rel = path.relative_to(ROOT)

    if not parser.title_seen:
        failures.append(f"{rel}: missing non-empty <title>")
    if not parser.viewport_seen:
        failures.append(f"{rel}: missing viewport meta")
    if "http://" in text:
        failures.append(f"{rel}: insecure http:// reference")

    for kind, raw, attrs in parser.refs:
        if raw.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        if raw.startswith("https://"):
            if attrs.get("target") == "_blank" and "noopener" not in attrs.get("rel", ""):
                failures.append(f"{rel}: target=_blank without noopener for {raw}")
            continue
        if raw.startswith("/") and not local_target_exists(raw):
            failures.append(f"{rel}: broken local {kind} {raw}")

    return failures


def main() -> int:
    failures: list[str] = []
    for required in REQUIRED_PAGES:
        if not (ROOT / required).exists():
            failures.append(f"missing required page: {required}")

    for page in ROOT.rglob("*.html"):
        if any(part in {"node_modules", ".git"} for part in page.parts):
            continue
        failures.extend(audit_html(page))

    home = (ROOT / "index.html").read_text(encoding="utf-8")
    live = (ROOT / "live/index.html").read_text(encoding="utf-8")
    for rel, text in [("index.html", home), ("live/index.html", live)]:
        if "MINT BASED APE PUNKS" in text:
            failures.append(f"{rel}: public mint CTA must remain disabled before testnet")

    required_copy = {
        "docs/index.html": ["Testnet Plan", "Safety Architecture", "Moer Agent"],
        "status/index.html": ["PRE-TESTNET", "Base Sepolia", "Mainnet Agent"],
    }
    for rel, phrases in required_copy.items():
        text = (ROOT / rel).read_text(encoding="utf-8")
        for phrase in phrases:
            if phrase not in text:
                failures.append(f"{rel}: missing required release copy: {phrase}")

    if failures:
        print("SITE RELEASE AUDIT FAILED")
        for failure in failures:
            print(f"- {failure}")
        return 1

    pages = list(ROOT.rglob("*.html"))
    print(f"SITE RELEASE AUDIT PASSED: {len(pages)} HTML pages checked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
