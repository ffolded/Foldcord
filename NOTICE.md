# Foldcord notices

Foldcord is a Discord client mod by xohus and CloudCord.

## Upstream projects

- **Equicord** — https://github.com/Equicord/Equicord, GPL-3.0-or-later. Foldcord starts from Equicord commit `00abcbe` ("collapsibleui: hopefully fix"). All Equicord plugin authors are credited in each plugin's `authors` list and file headers.
- **Vencord** — https://github.com/Vendicated/Vencord, Copyright (c) Vendicated and contributors, GPL-3.0-or-later. Equicord is built on Vencord.

## Fake Profile plugin

`src/foldcordplugins/fakeProfile/` comes from CloudCord (`xohus/cloudcord`, branch `license/fakeprofile-attribution`, `desktop/client/src/sincordplugins/fakeProfile/` plus the helper modules it imports, now in `lib/`). It is based on the Custom Profile / FakeProfile plugin from **Sincord**, the same code also ships as `customProfile` in **Endcord** (github.com/Endcord/Endcord). Portions copyright (c) 2026 Sincord contributors and Endcord contributors. GPL-3.0-or-later.

Changes for Foldcord: moved helper modules into the plugin folder, adapted toasts and the profile modal call to the current Equicord API, and removed the CloudCord staff-badge list.

## Endcord plugins

`src/endcordplugins/` holds 131 plugins from **Endcord** (github.com/Endcord/Endcord, commit `ff97e15`), GPL-3.0-or-later, credited to Endcord and its contributors ewlle, rootpoi, kraethis and vpg. Endcord rewrites author credits in its source, so original authors (possibly including Sincord contributors) may not be named; see `docs/ENDCORD-PLUGINS.md`.

## BetterDiscord

Foldcord's BetterDiscord plugin support (`src/components/settings/tabs/foldcord/bdLoader.ts`) and BD-style cards are written for Foldcord and contain no BetterDiscord code. BetterDiscord (https://github.com/BetterDiscord/BetterDiscord) is licensed Apache-2.0.

## Licenses

- Code: GNU GPL v3.0 or later, see `LICENSE`.
- Foldcord name, logo and branding: see `FOLDCORD-LICENSE.md`.
