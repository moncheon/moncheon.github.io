"""Dependency-free structural regression checks for the root homepage."""
from html.parser import HTMLParser
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parent
class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.ids = []; self.links = []; self.scripts = []; self.lang = None
        self.feed(path.read_text())
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag == 'html': self.lang = attrs.get('lang')
        if tag in ('a','link') and 'href' in attrs: self.links.append(attrs['href'])
        if tag == 'script': self.scripts.append(attrs.get('src'))
for filename in ('index.html','privacy.html'):
    doc = Document(ROOT / filename)
    assert doc.lang == 'ko'
    assert len(doc.ids) == len(set(doc.ids)), 'Duplicate IDs'
    for href in doc.links + doc.scripts:
        assert href, 'Empty resource reference'
        if href.startswith(('https://','mailto:')): continue
        path, _, fragment = href.partition('#')
        target = ROOT / (path or filename)
        if target.is_dir(): target = target / 'index.html'
        assert target.exists(), f'Missing local link: {href}'
        if fragment: assert fragment in Document(target).ids, f'Missing fragment: {href}'
    assert not any(src.startswith('http') for src in doc.scripts)
script = (ROOT / 'script.js').read_text()
assert not re.search(r'fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie',script)
assert 'prefers-reduced-motion' in (ROOT / 'styles.css').read_text()
assert 'https://moncheon.github.io/' in (ROOT / 'index.html').read_text()
assert (ROOT / '.nojekyll').exists()
for path in ('e1/index.html','meetplace/index.html','.github/workflows/static.yml'): assert (ROOT / path).exists()
print('PASS: Korean documents, IDs, links/fragments, resources, privacy boundaries, reduced motion, Pages and sibling projects')
