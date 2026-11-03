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
import { SettingsRouter, useEffect, useState } from "@webpack/common";
import type { ComponentType } from "react";

import ChangelogTab from "../changelog";
import PatchHelperTab from "../patchHelper";
import BackupAndRestoreTab from "../sync/BackupAndRestoreTab";
import CloudTab from "../sync/CloudTab";
import { openPluginModal } from "../plugins/PluginModal";
import UpdaterTab from "../updater";
import VencordTab from "../vencord";

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

const FEATURED: { name: string; label: string; blurb: string; }[] = [
    { name: "ProfileSpoofer", label: "Fake Profile", blurb: "Custom avatar, banner, badges and effects" },
    { name: "FakeNitro", label: "Fake Nitro", blurb: "Use any emoji and sticker, stream in HD" },
    { name: "MessageLogger", label: "Message Logger", blurb: "Keep deleted and edited messages" },
    { name: "ShowHiddenChannels", label: "Hidden Channels", blurb: "See channels you can't open" },
    { name: "BetterFolders", label: "Better Folders", blurb: "Server folders in their own sidebar" },
    { name: "TypingIndicator", label: "Typing Indicator", blurb: "See who's typing in every channel" },
];

const openSettings = (key: string) => SettingsRouter.openUserSettings(key + "_panel");

function AddonTile({ title, count, sub, onClick }: { title: string; count: number | string; sub: string; onClick(): void; }) {
    return (
        <button className={cl("tile")} onClick={onClick}>
            <span className={cl("tile-count")}>{count}</span>
            <span className={cl("tile-title")}>{title}</span>
            <span className={cl("tile-sub")}>{sub}</span>
        </button>
    );
}

function HomeTab({ go }: { go(tab: string): void; }) {
    const bd = useBDPlugins();
    const { enabledThemes, themeLinks } = useSettings(["enabledThemes", "themeLinks"]);
    const userFacing = Object.values(plugins).filter(p => !p.required && !p.hidden);
    const enabledCount = userFacing.filter(p => Settings.plugins[p.name]?.enabled).length;

    return (
        <SettingsTab>
            <div className={cl("hero")}>
                <img src={FOLDCORD_LOGO} className={cl("hero-logo")} alt="" />
                <div className={cl("hero-text")}>
                    <div className={cl("hero-title")}>Foldcord</div>
                    <div className={cl("hero-sub")}>{enabledCount} of {userFacing.length} plugins on</div>
                </div>
            </div>

            <div className={cl("label")}>Addons</div>
            <div className={cl("tiles")}>
                <AddonTile title="Plugins" count={userFacing.length} sub={enabledCount + " enabled"} onClick={() => openSettings("equicord_plugins")} />
                <AddonTile title="Themes" count={enabledThemes.length + themeLinks.length} sub="in use" onClick={() => openSettings("equicord_themes")} />
                <AddonTile title="BetterDiscord" count={bd.length} sub="BD plugins" onClick={() => go("BetterDiscord")} />
            </div>

            <div className={cl("label")}>Featured</div>
            <div className={cl("featured")}>
                {FEATURED.map(f => {
                    const plugin = plugins[f.name];
                    if (!plugin) return null;
                    const on = !!Settings.plugins[f.name]?.enabled;
                    return (
                        <button key={f.name} className={cl("feat", { "feat-on": on })} onClick={() => openPluginModal(plugin)}>
                            <span className={cl("feat-dot")} />
                            <span className={cl("feat-text")}>
                                <span className={cl("feat-name")}>{f.label}</span>
                                <span className={cl("feat-blurb")}>{f.blurb}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <p className={cl("license")}>© 2026 Foldcord. Other parts are under their own licenses.</p>
        </SettingsTab>
    );
}

function BetterDiscordTab() {
    const bd = useBDPlugins();
    return (
        <SettingsTab>
            <div className={cl("section-header")}>
                <div className={cl("label")}>BetterDiscord plugins</div>
                <Button size="small" onClick={pickPluginFile}>Add .plugin.js</Button>
            </div>
            <p className={cl("hint")}>
                Most BetterDiscord plugins work. Ones that need Node or file access don't.
                Only add plugins you trust.
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
        </SettingsTab>
    );
}

// Plugins and Themes have their own sidebar entries; the rest lives under Foldcord, switched with this tab bar.
const SUB_TABS: [string, ComponentType<any> | null][] = [
    ["Home", HomeTab],
    ["BetterDiscord", BetterDiscordTab],
    ["Settings", VencordTab],
    ["Updater", UpdaterTab],
    ["Changelog", ChangelogTab],
    ["Cloud", CloudTab],
    ["Backup", BackupAndRestoreTab],
    ["Patch Helper", PatchHelperTab],
];

function FoldcordTab() {
    const tabs = SUB_TABS.filter((t): t is [string, ComponentType<any>] => t[1] != null);
    const [current, setCurrent] = useState(tabs[0][0]);
    const Current = tabs.find(t => t[0] === current)?.[1] ?? HomeTab;

    return (
        <>
            <div className={cl("tabbar")} role="tablist">
                {tabs.map(([name]) => (
                    <button
                        key={name}
                        role="tab"
                        aria-selected={name === current}
                        className={cl("tab", { "tab-active": name === current })}
                        onClick={() => setCurrent(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <Current go={setCurrent} />
        </>
    );
}

export default wrapTab(FoldcordTab, "Foldcord");
