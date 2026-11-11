#!/bin/bash
# part1.js + part2.js -> scene.html
D=${1:-.}
cat > $D/scene.html <<HTML
<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:NunitoX;font-weight:900;src:url(fonts/nunito-latin-900-normal.woff2)}
@font-face{font-family:NunitoX;font-weight:800;src:url(fonts/nunito-latin-800-normal.woff2)}
@font-face{font-family:CaveatB;font-weight:400;src:url(fonts/caveat-brush-latin-400-normal.woff2)}
html,body{margin:0;background:#000;width:1080px;height:1920px;overflow:hidden}
</style></head><body><div id="st"></div><script>
$(cat $D/part1.js)
$(cat $D/part2.js)
</script></body></html>
HTML
