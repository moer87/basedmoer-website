from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(ROOT.rglob('*.html'))
SHARED = (ROOT / 'shared.css').read_text(encoding='utf-8')

REQUIRED_SHARED_MARKERS = [
    'overflow-x:hidden',
    'img,video,svg,canvas{max-width:100%}',
    'input,select,textarea{width:100%;max-width:100%;min-width:0}',
    'min-height:44px',
    '@media(max-width:560px)',
    'font-size:16px',
    '-webkit-overflow-scrolling:touch',
    '.wallet-address',
]

INTERACTIVE_PAGES = {
    'live/index.html': ['@media(max-width:600px)', '.table-wrap'],
    'academy/index.html': ['@media(max-width:700px)', '.visual'],
    'arcade/index.html': ['@media(max-width:760px)', '.mobile-controls'],
    'arcade/event-preview.html': ['@media(max-width:800px)', '.mobile-controls'],
    'arcade/anomaly-preview.html': ['@media(max-width:700px)', '.reels'],
    'moer-flip/index.html': ['@media(max-width:760px)', '.flip-stage'],
    'profile/index.html': ['@media(max-width:760px)', '.identity'],
    'profile/legend-preview.html': ['@media(max-width:760px)', '.identity'],
    'docs/index.html': ['@media(max-width:820px)', '.docs-layout'],
    'status/index.html': ['@media(max-width:760px)', '.status-grid'],
    'moerverse/index.html': ['@media(max-width:780px)', '.collection'],
}


def main():
    errors = []

    for marker in REQUIRED_SHARED_MARKERS:
        if marker not in SHARED:
            errors.append(f'shared mobile safeguard missing: {marker}')

    for page in PAGES:
        rel = page.relative_to(ROOT).as_posix()
        text = page.read_text(encoding='utf-8')
        if '<meta name="viewport"' not in text:
            errors.append(f'{rel}: missing viewport meta')
        if 'width=device-width' not in text:
            errors.append(f'{rel}: viewport does not use device width')

        # Images/videos/canvases should rely on shared responsive safeguards or local responsive CSS.
        if re.search(r'<(?:img|video|canvas)\b', text) and '/shared.css' not in text:
            errors.append(f'{rel}: media page missing shared responsive stylesheet')

        # Prevent the most common accidental fixed page widths. Wide data rows are allowed only
        # when a horizontal-scrolling wrapper is present on the same page.
        fixed = [int(x) for x in re.findall(r'min-width\s*:\s*(\d+)px', text)]
        if any(v > 760 for v in fixed) and not any(k in text for k in ('overflow-x:auto', 'table-wrap', 'overflow:auto')):
            errors.append(f'{rel}: fixed desktop min-width without mobile scroll container')

    for rel, markers in INTERACTIVE_PAGES.items():
        path = ROOT / rel
        if not path.exists():
            errors.append(f'missing interactive page: {rel}')
            continue
        text = path.read_text(encoding='utf-8')
        for marker in markers:
            if marker not in text:
                errors.append(f'{rel}: mobile invariant missing: {marker}')

    home = (ROOT / 'index.html').read_text(encoding='utf-8')
    for marker in ('aspect-ratio:1/1', '.experience-media>img{display:block;width:100%;height:100%;object-fit:contain}'):
        if marker not in home:
            errors.append(f'homepage GIF fitting invariant missing: {marker}')

    radar = (ROOT / 'live' / 'radar-weekly.js').read_text(encoding='utf-8')
    if '@media(max-width:650px)' not in radar or '.radar-card{grid-template-columns:1fr 1fr}' not in radar:
        errors.append('Token Radar injected UI missing phone layout')

    if errors:
        print('\n'.join('ERROR: ' + e for e in errors))
        return 1

    print('MOBILE SITE AUDIT PASSED')
    print(f'Checked {len(PAGES)} HTML pages plus shared CSS and dynamic Radar UI.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
