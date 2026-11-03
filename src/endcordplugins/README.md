# Endcord plugins

These 131 plugins come from Endcord (https://github.com/Endcord/Endcord, commit `ff97e15`), GPL-3.0-or-later.
They are the Endcord plugins that Vencord and Equicord don't already have. Endcord's `customProfile` is left out,
because Foldcord ships CloudCord's Fake Profile instead.

Credit: Endcord and its contributors ewlle, rootpoi, kraethis and vpg, as listed in each plugin's `authors`.

Endcord's own source maps every author, including Vendicated (Ven), to these four names, so the `authors`
lists here may not name the people who originally wrote each plugin. Some of these plugins may come from
Sincord or other mods. If an original author is identified, add them to that plugin's `authors` and header.

Changes for Foldcord: `@endcord/discord-types` → `@vencord/discord-types`, `EndcordNative` → `VencordNative`,
`@plugins/...` → `@endcordplugins/...`, and older UI and toast imports now come from `src/utils/endcordCompat.tsx`.
Support files copied from Endcord: `src/api/EndcordVisibility.ts`, `src/shared/externalLinks.ts`,
`src/main/utils/endcordHttp.ts`. `src/utils/i18n.ts` is an English-only stand-in for Endcord's translations.
