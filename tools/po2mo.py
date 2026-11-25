#!/usr/bin/env python3
"""Compile a .po file into .mo (GNU gettext format) without installing gettext/Poedit.

Usage:
    python tools/po2mo.py languages/ct-pro-quiz-lite-vi.po
    -> writes languages/ct-pro-quiz-lite-vi.mo next to it

Supports: msgctxt, msgid_plural/msgstr[n], multi-line strings; skips untranslated and "#, fuzzy" entries.
"""
import ast
import struct
import sys
from pathlib import Path


def parse_po(text):
    entries = []
    cur = {}
    key = None
    fuzzy = False

    def flush():
        nonlocal cur, key, fuzzy
        if 'msgid' in cur and not fuzzy:
            entries.append(cur)
        cur = {}
        key = None
        fuzzy = False

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            flush()
            continue
        if line.startswith('#,') and 'fuzzy' in line:
            fuzzy = True
            continue
        if line.startswith('#'):
            continue
        if line.startswith('"'):
            if key is None:
                raise ValueError('Continuation line without a key: %r' % raw)
            cur[key] += ast.literal_eval(line)
            continue

        word, _, rest = line.partition(' ')
        if word == 'msgid' and 'msgid' in cur and 'msgstr' in ''.join(cur.keys()):
            flush()
        key = word
        cur[key] = ast.literal_eval(rest)

    flush()
    return entries


def build_mo(entries):
    catalog = {}
    for e in entries:
        msgid = e['msgid']
        if 'msgid_plural' in e:
            forms = []
            i = 0
            while 'msgstr[%d]' % i in e:
                forms.append(e['msgstr[%d]' % i])
                i += 1
            if not any(forms):
                continue
            k = msgid + '\0' + e['msgid_plural']
            v = '\0'.join(forms)
        else:
            v = e.get('msgstr', '')
            if not v and msgid != '':
                continue
            k = msgid
        if 'msgctxt' in e:
            k = e['msgctxt'] + '\x04' + k
        catalog[k] = v

    keys = sorted(catalog.keys(), key=lambda s: s.encode('utf-8'))
    ids = b''
    strs = b''
    offsets = []
    for k in keys:
        kb = k.encode('utf-8')
        vb = catalog[k].encode('utf-8')
        offsets.append((len(ids), len(kb), len(strs), len(vb)))
        ids += kb + b'\0'
        strs += vb + b'\0'

    n = len(keys)
    keystart = 7 * 4 + 16 * n
    valuestart = keystart + len(ids)
    koffsets = []
    voffsets = []
    for o1, l1, o2, l2 in offsets:
        koffsets += [l1, o1 + keystart]
        voffsets += [l2, o2 + valuestart]

    out = struct.pack('Iiiiiii', 0x950412de, 0, n, 7 * 4, 7 * 4 + n * 8, 0, 0)
    out += struct.pack('%di' % len(koffsets), *koffsets)
    out += struct.pack('%di' % len(voffsets), *voffsets)
    out += ids + strs
    return out, n


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    for name in sys.argv[1:]:
        po = Path(name)
        data, n = build_mo(parse_po(po.read_text(encoding='utf-8')))
        mo = po.with_suffix('.mo')
        mo.write_bytes(data)
        print('%s -> %s (%d strings)' % (po, mo, n))
    return 0


if __name__ == '__main__':
    sys.exit(main())
