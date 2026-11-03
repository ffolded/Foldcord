#!/usr/bin/env bash
# Builds installer/out/FoldcordInstaller.exe with the C# compiler that ships with
# Windows (.NET Framework 4.8). Runs a standalone build first, so Foldcord uses the
# GitHub Releases updater instead of git, and embeds dist/desktop.asar.
set -euo pipefail
cd "$(dirname "$0")"

FW=/c/Windows/Microsoft.NET/Framework64/v4.0.30319
ASAR=out/foldcord.asar
OUT=out
mkdir -p "$OUT"

if [ "${SKIP_BUILD:-}" != "1" ]; then
    (cd .. && npx -y pnpm@10 build --standalone)
fi
# Lean asar: everything in dist/desktop except source maps.
rm -rf "$OUT/lean" && mkdir -p "$OUT/lean"
for f in ../dist/desktop/*; do case "$f" in *.map) ;; *) cp "$f" "$OUT/lean/" ;; esac; done
(cd .. && node -e "require(\"@electron/asar\").createPackage(\"installer/$OUT/lean\", \"installer/$ASAR\")")
rm -rf "$OUT/lean"
[ -f "$ASAR" ] || { echo "missing $ASAR" >&2; exit 1; }

"$FW/csc.exe" -nologo -target:winexe -optimize+ -out:"$OUT/FoldcordInstaller.exe" \
    -win32icon:icon.ico \
    -r:"$FW/WPF/PresentationCore.dll" -r:"$FW/WPF/PresentationFramework.dll" -r:"$FW/WPF/WindowsBase.dll" \
    -r:"$FW/System.Xaml.dll" -r:System.dll -r:System.Core.dll \
    -resource:"$ASAR",foldcord.asar \
    -resource:../branding/logo-white.png,logo.png \
    Installer.cs

# The same asar, named desktop.asar, goes on a GitHub release for the in-app updater.
cp "$ASAR" "$OUT/desktop.asar"
ls -la "$OUT/FoldcordInstaller.exe" "$OUT/desktop.asar"
