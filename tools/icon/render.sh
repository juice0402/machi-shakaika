#!/bin/sh
# ホーム画面に追加のアイコン（192・512）を、ファビコン「A 森と川」（static/favicon.svg）から作る（#42）
# 白い地のまん中に、ファビコンを62%の大きさで置く（maskable の安全な範囲 80% の中に入る）。rsvg-convert を使う
set -e
cd "$(dirname "$0")/../.."
inner=$(sed -e 's/<svg [^>]*>//' -e 's#</svg>##' -e 's/@media[^}]*}[^}]*}[^}]*}}//' static/favicon.svg)
tmp=$(mktemp -d)
printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#fff"/><g transform="translate(12.16 12.16) scale(.62)">%s</g></svg>' "$inner" > "$tmp/icon.svg"
for n in 192 512; do rsvg-convert -w $n -h $n "$tmp/icon.svg" -o "static/icon-$n.png"; done
rm -rf "$tmp"
