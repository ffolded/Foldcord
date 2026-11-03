/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { plugins } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { BackupRestoreIcon, FolderIcon, LogIcon, MainSettingsIcon, PaintbrushIcon, PatchHelperIcon, PluginsIcon, RestartIcon, UpdaterIcon } from "@components/Icons";
import { classNameFactory } from "@utils/css";
import { relaunch } from "@utils/native";
import { IconProps } from "@utils/types";
import { SettingsRouter, useState } from "@webpack/common";
import type { ComponentType } from "react";

import ChangelogTab from "../changelog";
import PatchHelperTab from "../patchHelper";
import { PluginsPage, ThemesPage } from "./AddonPage";
import { openPluginModal } from "../plugins/PluginModal";
import BackupAndRestoreTab from "../sync/BackupAndRestoreTab";
import UpdaterTab from "../updater";
import VencordTab from "../vencord";
import logo from "file://logo-white.png?base64";

const cl = classNameFactory("fc-");
export const FOLDCORD_LOGO = `data:image/png;base64,${logo}`;

export function FoldcordIcon({ width = 20, height = 20, className }: IconProps) {
    return <img src={FOLDCORD_LOGO} width={width} height={height} className={className} alt="" draggable={false} />;
}

const FEATURED: { name: string; label: string; blurb: string; }[] = [
    { name: "ProfileSpoofer", label: "Fake Profile", blurb: "Custom avatar, banner, badges and effects" },
    { name: "FakeNitro", label: "Fake Nitro", blurb: "Use any emoji and sticker, stream in HD" },
    { name: "MessageLogger", label: "Message Logger", blurb: "Keep deleted and edited messages" },
    { name: "ShowHiddenChannels", label: "Hidden Channels", blurb: "See channels you can't open" },
    { name: "BetterFolders", label: "Better Folders", blurb: "Server folders in their own sidebar" },
    { name: "TypingIndicator", label: "Typing Indicator", blurb: "See who's typing in every channel" },
];

const HomeIcon = ({ width = 16, height = 16, className }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M11.3 2.3a1 1 0 0 1 1.4 0l9 8.5A1 1 0 0 1 21 12.5h-1V20a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-5h-4v5a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2v-7.5H3a1 1 0 0 1-.7-1.7l9-8.5Z" /></svg>
);

const openAddons = () => SettingsRouter.openUserSettings("foldcord_addons_panel");

function AddonTile({ title, count, sub, onClick }: { title: string; count: number | string; sub: string; onClick(): void; }) {
    return (
        <button className={cl("tile")} onClick={onClick}>
            <span className={cl("tile-count")}>{count}</span>
            <span className={cl("tile-title")}>{title}</span>
            <span className={cl("tile-sub")}>{sub}</span>
        </button>
    );
}

function HomeTab() {
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
                <AddonTile title="Plugins" count={userFacing.length} sub={enabledCount + " enabled"} onClick={openAddons} />
                <AddonTile title="Themes" count={enabledThemes.length + themeLinks.length} sub="in use" onClick={openAddons} />
            </div>

            <div className={cl("label")}>Quick actions</div>
            <div className={cl("actions")}>
                <button className={cl("action")} onClick={() => VencordNative.quickCss.openEditor()}><PaintbrushIcon width={18} height={18} />QuickCSS</button>
                {!IS_WEB && <button className={cl("action")} onClick={() => VencordNative.settings.openFolder()}><FolderIcon width={18} height={18} />Settings folder</button>}
                {!IS_WEB && <button className={cl("action")} onClick={relaunch}><RestartIcon width={18} height={18} />Relaunch</button>}
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

type SubTab = [name: string, Component: ComponentType<any> | null, Icon: ComponentType<IconProps>];

function TabbedPage({ tabs }: { tabs: SubTab[]; }) {
    const shown = tabs.filter(t => t[1] != null) as [string, ComponentType<any>, ComponentType<IconProps>][];
    const [current, setCurrent] = useState(shown[0][0]);
    const Current = shown.find(t => t[0] === current)?.[1] ?? shown[0][1];

    return (
        <>
            <nav className={cl("seg")} role="tablist">
                {shown.map(([name, , Icon]) => (
                    <button
                        key={name}
                        role="tab"
                        aria-selected={name === current}
                        className={cl("seg-item", { "seg-active": name === current })}
                        onClick={() => setCurrent(name)}
                    >
                        <Icon width={16} height={16} className={cl("seg-icon")} />
                        <span>{name}</span>
                    </button>
                ))}
            </nav>
            <div className={cl("page")} key={current}>
                <Current />
            </div>
        </>
    );
}

// Two sidebar entries: Foldcord (home and settings) and Addons (plugins and themes).
const FoldcordPage = () => <TabbedPage tabs={[
    ["Home", HomeTab, HomeIcon],
    ["Settings", VencordTab, MainSettingsIcon],
    ["Updater", UpdaterTab, UpdaterIcon],
    ["Changelog", ChangelogTab, LogIcon],
    ["Backup", BackupAndRestoreTab, BackupRestoreIcon],
    ["Patch Helper", PatchHelperTab, PatchHelperIcon],
]} />;

const AddonsPage = () => <TabbedPage tabs={[
    ["Plugins", PluginsPage, PluginsIcon],
    ["Themes", ThemesPage, PaintbrushIcon],
]} />;

export const AddonsTab = wrapTab(AddonsPage, "Addons");
export default wrapTab(FoldcordPage, "Foldcord");
