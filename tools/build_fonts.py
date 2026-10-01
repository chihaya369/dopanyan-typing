# Rebuild the subset WOFF2 fonts from the Google Fonts (OFL) sources.
# Usage: python3 tools/build_fonts.py <dir with the .ttf files>
# Requires: pip install fonttools brotli
import sys, pathlib, re, subprocess
game = pathlib.Path(__file__).resolve().parent.parent / 'app'
src = pathlib.Path(sys.argv[1])
ui = {chr(c) for c in range(0x20, 0x7f)}
for f in [*game.glob('*.html'), *game.glob('*.css'), *game.glob('js/*.js')]:
    ui |= set(f.read_text(encoding='utf-8'))
ui |= set('０１２３４５６７８９＋−×÷＝、。・！？「」（）ー〜…　')
kana = {chr(c) for c in range(0x3041, 0x3097)} | {chr(c) for c in range(0x30a1, 0x30fb)} | set('ー・「」、。（）！？')
data = set(''.join(f.read_text(encoding='utf-8') for f in (game / 'data').glob('*.js')))
data = {c for c in data if '\u3000' <= c <= '\u9fff' or '\uff00' <= c <= '\uffef'}
def sub(ttf, out, chars):
    t = pathlib.Path('/tmp/chars.txt'); t.write_text(''.join(sorted(c for c in chars if ord(c) >= 0x20)), encoding='utf-8')
    subprocess.run([sys.executable, '-m', 'fontTools.subset', str(src / ttf), f'--text-file={t}', '--flavor=woff2', '--layout-features=*', f'--output-file={game / "fonts" / out}'], check=True)
    print(out, (game / 'fonts' / out).stat().st_size)
sub('DelaGothicOne-Regular.ttf', 'dela-gothic-one.woff2', ui | kana | set('0123456789.%'))
sub('ZenMaruGothic-Black.ttf', 'zen-maru-gothic-black.woff2', ui | kana | data)
sub('ZenMaruGothic-Bold.ttf', 'zen-maru-gothic-bold.woff2', ui | kana | data)
