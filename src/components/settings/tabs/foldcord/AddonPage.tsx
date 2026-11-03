/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Plugins and Themes pages laid out like BetterDiscord's addon list (title and count with search,
 * then a controls row, then the cards). Written for Foldcord.
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { FolderIcon, SearchIcon } from "@components/Icons";
import { AddonCard } from "@components/settings/AddonCard";
import { openSettingsTabModal } from "@components/settings/tabs/BaseTab";
import type { UserThemeHeader } from "@main/themes";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import { classNameFactory } from "@utils/css";
import { promptToRestart } from "@utils/promptToRestart";
import { useEffect, useMemo, useState } from "@webpack/common";

import { PluginCard } from "../plugins/PluginCard";
import ThemesTab from "../themes";

const cl = classNameFactory("fc-addons-");

type Sort = "name" | "enabled";

const ListIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /></svg>
);
const GridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>
);
const OffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export function AddonHeader({ title, count, query, setQuery }: { title: string; count: number; query: string; setQuery(q: string): void; }) {
    return (
        <div className={cl("header")}>
            <h2 className={cl("title")}>{title}<span className={cl("count")}>{count}</span></h2>
            <label className={cl("search")}>
                <SearchIcon width={16} height={16} />
                <input value={query} onChange={e => setQuery(e.currentTarget.value)} placeholder={`Search ${count} ${title.toLowerCase()}...`} />
            </label>
        </div>
    );
}

export function PluginsPage() {
    useSettings(["plugins.*"]);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<Sort>("name");
    const [grid, setGrid] = useState(false);
    const [, force] = useState(0);

    const visible = useMemo(
        () => Object.values(plugins).filter(p => !p.hidden && !p.required && !(p.name.endsWith("API") && !p.settings?.def)),
        []
    );

    const q = query.trim().toLowerCase();
    const shown = visible
        .filter(p => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q)))
        .sort((a, b) => sort === "enabled"
            ? Number(isPluginEnabled(b.name)) - Number(isPluginEnabled(a.name)) || a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name));

    const onRestartNeeded = () => promptToRestart("reload", { subtitle: "Reload Discord to finish turning this plugin on or off." });

    const disableAll = () => {
        let changed = false;
        for (const p of visible) if (Settings.plugins[p.name]?.enabled) { Settings.plugins[p.name].enabled = false; changed = true; }
        force(n => n + 1);
        if (changed) promptToRestart("reload", { subtitle: "Reload Discord to turn all plugins off." });
    };

    return (
        <SettingsTab>
            <AddonHeader title="Plugins" count={shown.length} query={query} setQuery={setQuery} />
            <div className={cl("controls")}>
                <div className={cl("basic")}>
                    {!IS_WEB && (
                        <button className={cl("icon-btn")} title="Open settings folder" onClick={() => VencordNative.settings.openFolder()}><FolderIcon width={20} height={20} /></button>
                    )}
                    <button className={cl("icon-btn")} title="Disable all" onClick={disableAll}><OffIcon /></button>
                </div>
                <div className={cl("advanced")}>
                    <label className={cl("select")}>
                        Sort by:
                        <select value={sort} onChange={e => setSort(e.currentTarget.value as Sort)}>
                            <option value="name">Name</option>
                            <option value="enabled">Enabled first</option>
                        </select>
                    </label>
                    <div className={cl("views")}>
                        <button className={cl("view", { "view-on": !grid })} title="List view" onClick={() => setGrid(false)}><ListIcon /></button>
                        <button className={cl("view", { "view-on": grid })} title="Grid view" onClick={() => setGrid(true)}><GridIcon /></button>
                    </div>
                </div>
            </div>

            {shown.length === 0
                ? <div className={cl("empty")}>No plugins match “{query}”.</div>
                : (
                    <div className={cl("list", { grid })}>
                        {shown.map(p => <PluginCard key={p.name} plugin={p} disabled={false} onRestartNeeded={onRestartNeeded} />)}
                    </div>
                )}
        </SettingsTab>
    );
}

const RefreshIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
);
const LinkIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
);

export function ThemesPage() {
    const settings = useSettings(["enabledThemes"]);
    const [themes, setThemes] = useState<UserThemeHeader[] | null>(null);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<Sort>("name");
    const [grid, setGrid] = useState(false);

    const refresh = () => VencordNative.themes.getThemesList().then(setThemes);
    useEffect(() => { refresh(); }, []);

    const isOn = (f: string) => settings.enabledThemes.includes(f);
    const setOn = (f: string, on: boolean) => {
        settings.enabledThemes = on ? [...new Set([...settings.enabledThemes, f])] : settings.enabledThemes.filter(x => x !== f);
    };

    const q = query.trim().toLowerCase();
    const shown = (themes ?? [])
        .filter(t => !q || [t.name, t.author, t.description].some(v => v?.toLowerCase().includes(q)))
        .sort((a, b) => sort === "enabled"
            ? Number(isOn(b.fileName)) - Number(isOn(a.fileName)) || a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name));

    return (
        <SettingsTab>
            <AddonHeader title="Themes" count={shown.length} query={query} setQuery={setQuery} />
            <div className={cl("controls")}>
                <div className={cl("basic")}>
                    {!IS_WEB && (
                        <button className={cl("icon-btn")} title="Open themes folder" onClick={() => VencordNative.themes.openFolder()}><FolderIcon width={20} height={20} /></button>
                    )}
                    <button className={cl("icon-btn")} title="Reload themes" onClick={refresh}><RefreshIcon /></button>
                    <button className={cl("icon-btn")} title="Online themes and links" onClick={() => openSettingsTabModal(ThemesTab)}><LinkIcon /></button>
                </div>
                <div className={cl("advanced")}>
                    <label className={cl("select")}>
                        Sort by:
                        <select value={sort} onChange={e => setSort(e.currentTarget.value as Sort)}>
                            <option value="name">Name</option>
                            <option value="enabled">Enabled first</option>
                        </select>
                    </label>
                    <div className={cl("views")}>
                        <button className={cl("view", { "view-on": !grid })} title="List view" onClick={() => setGrid(false)}><ListIcon /></button>
                        <button className={cl("view", { "view-on": grid })} title="Grid view" onClick={() => setGrid(true)}><GridIcon /></button>
                    </div>
                </div>
            </div>

            {themes && themes.length === 0 && (
                <div className={cl("empty")}>
                    No themes yet. Put <code>.css</code> or <code>.theme.css</code> files in your themes folder, then reload.
                </div>
            )}
            {themes && themes.length > 0 && shown.length === 0 && <div className={cl("empty")}>No themes match “{query}”.</div>}
            {shown.length > 0 && (
                <div className={cl("list", { grid })}>
                    {shown.map(t => (
                        <AddonCard
                            key={t.fileName}
                            name={t.name}
                            author={t.author}
                            description={t.description}
                            enabled={isOn(t.fileName)}
                            setEnabled={on => setOn(t.fileName, on)}
                            footer={t.version ? <span className={cl("version")}>v{t.version}</span> : undefined}
                        />
                    ))}
                </div>
            )}
        </SettingsTab>
    );
}
