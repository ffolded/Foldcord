/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Settings, useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Switch } from "@components/Switch";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { plugins } from "@api/PluginManager";
import { classNameFactory } from "@utils/css";
import { IconProps } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

import { addBDPlugin, BDPluginEntry, getEntries, removeBDPlugin, setBDPluginEnabled, subscribe } from "./bdLoader";
import logo from "file://logo-white.png?base64";

const cl = classNameFactory("fc-");
export const FOLDCORD_LOGO = `data:image/png;base64,${logo}`;

export function FoldcordIcon({ width = 20, height = 20, className }: IconProps) {
    return <img src={FOLDCORD_LOGO} width={width} height={height} className={className} alt="" draggable={false} />;
}

function useBDPlugins() {
    const [list, setList] = useState<BDPluginEntry[]>(getEntries());
    useEffect(() => subscribe(() => setList(getEntries())), []);
    return list;
}

function pickPluginFile() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: ".js", multiple: true });
    input.onchange = async () => {
        for (const file of Array.from(input.files ?? [])) await addBDPlugin(file.name, await file.text());
    };
    input.click();
}

function Card({ name, version, author, description, enabled, onToggle, actions }: {
    name: string; version?: string; author?: string; description?: string;
    enabled: boolean; onToggle(v: boolean): void; actions?: React.ReactNode;
}) {
    return (
        <div className={cl("card", { "card-on": enabled })}>
            <div className={cl("card-header")}>
                <div className={cl("card-title")}>
                    <span className={cl("card-name")}>{name}</span>
                    {version && <span className={cl("card-version")}>v{version}</span>}
                    {author && <span className={cl("card-author")}>by {author}</span>}
                </div>
                <Switch checked={enabled} onChange={onToggle} />
            </div>
            <div className={cl("card-body")}>{description || "No description provided."}</div>
            {actions && <div className={cl("card-footer")}>{actions}</div>}
        </div>
    );
}

function FoldcordTab() {
    const bd = useBDPlugins();
    const { enabledThemes, themeLinks } = useSettings(["enabledThemes", "themeLinks"]);
    const all = Object.values(plugins);
    const userFacing = all.filter(p => !p.required && !p.hidden);
    const enabledCount = userFacing.filter(p => Settings.plugins[p.name]?.enabled).length;

    return (
        <SettingsTab>
            <div className={cl("hero")}>
                <img src={FOLDCORD_LOGO} className={cl("hero-logo")} alt="Foldcord" />
                <div>
                    <div className={cl("hero-title")}>Foldcord</div>
                    <div className={cl("hero-sub")}>A light Discord client mod, built on Equicord and Vencord.</div>
                </div>
            </div>

            <div className={cl("stats")}>
                <div className={cl("stat")}><b>{userFacing.length}</b><span>plugins</span></div>
                <div className={cl("stat")}><b>{enabledCount}</b><span>enabled</span></div>
                <div className={cl("stat")}><b>{bd.length}</b><span>BD plugins</span></div>
                <div className={cl("stat")}><b>{enabledThemes.length + themeLinks.length}</b><span>themes in use</span></div>
            </div>

            <div className={cl("section-header")}>
                <h2>BetterDiscord plugins</h2>
                <Button size="small" onClick={pickPluginFile}>Add .plugin.js</Button>
            </div>
            <p className={cl("hint")}>
                Foldcord runs most BetterDiscord plugins through a BdApi compatibility layer
                (Patcher, Webpack, Data, DOM, UI). Plugins that need Node or file system access won't work.
                Only add plugins you trust: they run with full access to your Discord session.
            </p>
            <div className={cl("grid")}>
                {bd.length === 0 && <div className={cl("empty")}>No BetterDiscord plugins yet.</div>}
                {bd.map(p => (
                    <Card
                        key={p.id}
                        name={p.meta.name}
                        version={p.meta.version}
                        author={p.meta.author}
                        description={p.meta.description}
                        enabled={p.enabled}
                        onToggle={v => setBDPluginEnabled(p.id, v)}
                        actions={<Button size="small" variant="dangerPrimary" onClick={() => removeBDPlugin(p.id)}>Remove</Button>}
                    />
                ))}
            </div>

            <div className={cl("section-header")}><h2>License</h2></div>
            <p className={cl("hint")}>
                Foldcord's name, logo and branding are © 2026 xohus and CloudCord, all rights reserved.
                Code from Vencord and Equicord, and the Fake Profile plugin (based on Sincord's plugin, also shipped by Endcord),
                remain under the GNU GPL v3.0. See LICENSE and NOTICE in the source.
            </p>
        </SettingsTab>
    );
}

export default wrapTab(FoldcordTab, "Foldcord");
