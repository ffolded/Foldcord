#!/usr/bin/env bash
# Builds installer/FoldcordInstaller.exe with the C# compiler that ships with
# Windows (.NET Framework 4.8). Run `pnpm build` first so dist/desktop exists.
set -euo pipefail
cd "$(dirname "$0")"

FW=/c/Windows/Microsoft.NET/Framework64/v4.0.30319
DIST=../dist/desktop
OUT=out
mkdir -p "$OUT"

for f in patcher.js preload.js renderer.js renderer.css package.json; do
    [ -f "$DIST/$f" ] || { echo "missing $DIST/$f, run pnpm build first" >&2; exit 1; }
done

"$FW/csc.exe" -nologo -target:winexe -optimize+ -out:"$OUT/FoldcordInstaller.exe" \
    -win32icon:icon.ico \
    -r:"$FW/WPF/PresentationCore.dll" -r:"$FW/WPF/PresentationFramework.dll" -r:"$FW/WPF/WindowsBase.dll" \
    -r:"$FW/System.Xaml.dll" -r:System.dll -r:System.Core.dll \
    -resource:"$DIST/patcher.js",dist.patcher.js \
    -resource:"$DIST/preload.js",dist.preload.js \
    -resource:"$DIST/renderer.js",dist.renderer.js \
    -resource:"$DIST/renderer.css",dist.renderer.css \
    -resource:"$DIST/package.json",dist.package.json \
    -resource:../branding/logo-white.png,logo.png \
    Installer.cs

ls -la "$OUT/FoldcordInstaller.exe"
