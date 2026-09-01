from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_PAGES = [
    'index.html','moerverse/index.html','live/index.html','academy/index.html',
    'arcade/index.html','moer-flip/index.html','profile/index.html',
    'docs/index.html','status/index.html'
]
REQUIRED_ASSETS = [
    'assets/based-moer-logo.jpg','assets/bald-moe-promo.gif','assets/ape-punks.gif',
    'assets/moe-ai.mp4','assets/basedmoer-token.gif','assets/moerverse-preview.png'
]
IGNORE_PREFIXES = ('http://','https://','mailto:','tel:','data:','javascript:','#')

class Collector(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        for key in ('src','href'):
            val=d.get(key)
            if val: self.refs.append((tag,key,val))

def resolve(page: Path, ref: str):
    clean=ref.split('?',1)[0].split('#',1)[0]
    if not clean or clean.startswith(IGNORE_PREFIXES): return None
    if clean.startswith('/'):
        target=ROOT/clean.lstrip('/')
    else:
        target=page.parent/clean
    if clean.endswith('/'):
        target=target/'index.html'
    return target

def main():
    errors=[]
    for rel in REQUIRED_PAGES:
        if not (ROOT/rel).is_file(): errors.append(f'missing required page: {rel}')
    for rel in REQUIRED_ASSETS:
        if not (ROOT/rel).is_file(): errors.append(f'missing required asset: {rel}')

    for page in ROOT.rglob('*.html'):
        parser=Collector()
        try: parser.feed(page.read_text(encoding='utf-8'))
        except Exception as exc:
            errors.append(f'{page.relative_to(ROOT)} parse error: {exc}'); continue
        for tag,key,ref in parser.refs:
            target=resolve(page,ref)
            if target is not None and not target.exists():
                errors.append(f'{page.relative_to(ROOT)} broken {key}: {ref}')
        text=page.read_text(encoding='utf-8')
        if '<meta name="viewport"' not in text:
            errors.append(f'{page.relative_to(ROOT)} missing viewport')
        if '<title>' not in text:
            errors.append(f'{page.relative_to(ROOT)} missing title')

    # Visual-master invariants: these must never be silently replaced again.
    home=(ROOT/'index.html').read_text(encoding='utf-8')
    for marker in [
        '/assets/bald-moe-promo.gif','PIXEL ART. ONCHAIN INTELLIGENCE.',
        'MEET THE MOERVERSE.','/assets/moerverse-preview.png','/assets/ape-punks.gif',
        '/assets/moe-ai.mp4','OWN THE NFT. ENTER THE EXPERIENCE.',
        '/assets/academy.gif','/assets/arcade.gif','/assets/moer-flip.gif'
    ]:
        if marker not in home: errors.append(f'visual master invariant missing from homepage: {marker}')

    if errors:
        print('\n'.join('ERROR: '+e for e in errors)); return 1
    print('FINAL WEBSITE AUDIT PASSED')
    print(f'Checked {len(list(ROOT.rglob("*.html")))} HTML pages plus locked visual-master invariants.')
    return 0

if __name__=='__main__': sys.exit(main())
