/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Runs BetterDiscord-format plugins (*.plugin.js) through a small BdApi
 * compatibility layer. Written for Foldcord; no BetterDiscord code is used.
 * BetterDiscord is a trademark of its authors and is licensed Apache-2.0.
 */

import * as DataStore from "@api/DataStore";
import { localStorage } from "@utils/localStorage";
import { Logger } from "@utils/Logger";
import { filters, find, findAll, waitFor } from "@webpack";
import { React, ReactDOM, showToast } from "@webpack/common";

const logger = new Logger("Foldcord BD");
const STORE_KEY = "Foldcord_BDPlugins";

export interface BDPluginMeta {
    name: string;
    author?: string;
    version?: string;
    description?: string;
}

export interface BDPluginEntry {
    id: string;
    source: string;
    enabled: boolean;
    meta: BDPluginMeta;
}

interface Running {
    instance: any;
    styles: Set<string>;
    unpatches: Set<() => void>;
}

const running = new Map<string, Running>();
let entries: BDPluginEntry[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());
export const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
export const getEntries = () => entries;

/** Reads the JSDoc header BD plugins use: `/** @name Foo @author Bar ... *\/` */
export function parseMeta(source: string, fallbackName: string): BDPluginMeta {
    const header = /^\s*\/\*\*([\s\S]*?)\*\//.exec(source)?.[1] ?? "";
    const meta: Record<string, string> = {};
    for (const m of header.matchAll(/@(\w+)[ \t]+([^\n\r]*)/g)) meta[m[1]] = m[2].trim();
    return { name: meta.name || fallbackName, author: meta.author, version: meta.version, description: meta.description };
}

function makeBdApi(id: string, state: Running) {
    const dataKey = (key: string) => `${STORE_KEY}_${id}_${key}`;
    const addUnpatch = (fn: () => void) => (state.unpatches.add(fn), () => { fn(); state.unpatches.delete(fn); });

    const patch = (type: "before" | "after" | "instead") => (_caller: string, target: any, method: string, cb: Function) => {
        const original = target[method];
        if (typeof original !== "function") return () => { };
        const wrapped = function (this: any, ...args: any[]) {
            if (type === "before") { cb(this, args); return original.apply(this, args); }
            if (type === "instead") return cb(this, args, original.bind(this));
            const ret = original.apply(this, args);
            const res = cb(this, args, ret);
            return res === undefined ? ret : res;
        };
        Object.assign(wrapped, original);
        target[method] = wrapped;
        return addUnpatch(() => { if (target[method] === wrapped) target[method] = original; });
    };

    const Webpack = {
        Filters: {
            byProps: (...props: string[]) => filters.byProps(...props),
            byStrings: (...code: string[]) => filters.byCode(...code),
            byDisplayName: (name: string) => (m: any) => m?.displayName === name,
        },
        getModule: (filter: (m: any) => boolean, opts: { first?: boolean; } = {}) => {
            try { return opts.first === false ? findAll(filter) : find(filter, { isIndirect: true }); } catch { return undefined; }
        },
        getByKeys: (...props: string[]) => { try { return find(filters.byProps(...props), { isIndirect: true }); } catch { return undefined; } },
        getByStrings: (...code: string[]) => { try { return find(filters.byCode(...code), { isIndirect: true }); } catch { return undefined; } },
        waitForModule: (filter: (m: any) => boolean) => new Promise(r => waitFor(filter, r)),
    };

    const scoped = {
        Patcher: { before: patch("before"), after: patch("after"), instead: patch("instead"), unpatchAll: () => [...state.unpatches].forEach(u => u()) },
        Data: {
            load: (_name: string, key: string) => { try { return JSON.parse(localStorage.getItem(dataKey(key)) ?? "null") ?? undefined; } catch { return undefined; } },
            save: (_name: string, key: string, value: unknown) => localStorage.setItem(dataKey(key), JSON.stringify(value)),
            delete: (_name: string, key: string) => localStorage.removeItem(dataKey(key)),
        },
        DOM: {
            addStyle: (styleId: string, css: string) => {
                const el = document.getElementById(`fc-bd-${id}-${styleId}`) ?? Object.assign(document.createElement("style"), { id: `fc-bd-${id}-${styleId}` });
                el.textContent = css; document.head.append(el); state.styles.add(el.id);
            },
            removeStyle: (styleId: string) => document.getElementById(`fc-bd-${id}-${styleId}`)?.remove(),
        },
        UI: {
            showToast: (text: string, opts: { type?: string; } = {}) => showToast({ text, ...(opts.type === "error" || opts.type === "danger" ? { variant: "critical" } : opts.type === "success" ? { variant: "success" } : {}) } as any),
            alert: (title: string, body: string) => window.alert(`${title}\n\n${typeof body === "string" ? body : ""}`),
        },
        Webpack,
        React,
        ReactDOM,
        Logger: { log: (...a: any[]) => logger.info(id, ...a), warn: (...a: any[]) => logger.warn(id, ...a), error: (...a: any[]) => logger.error(id, ...a) },
    };

    // BdApi is both a constructor (new BdApi("Name")) and a static namespace.
    function BdApi() { return scoped; }
    Object.assign(BdApi, scoped, {
        injectCSS: scoped.DOM.addStyle, clearCSS: scoped.DOM.removeStyle,
        loadData: scoped.Data.load, saveData: scoped.Data.save, deleteData: scoped.Data.delete,
        findModuleByProps: Webpack.getByKeys, findModule: Webpack.getModule, showToast: scoped.UI.showToast, alert: scoped.UI.alert,
    });
    return BdApi;
}

async function persist() {
    await DataStore.set(STORE_KEY, entries.map(({ id, source, enabled }) => ({ id, source, enabled })));
}

function start(entry: BDPluginEntry) {
    if (running.has(entry.id)) return;
    const state: Running = { instance: null, styles: new Set(), unpatches: new Set() };
    try {
        const BdApi = makeBdApi(entry.id, state);
        const module = { exports: {} as any };
        // eslint-disable-next-line no-new-func
        new Function("module", "exports", "require", "BdApi", "window", entry.source + `\n//# sourceURL=foldcord-bd/${entry.id}`)(
            module, module.exports, () => ({}), BdApi, window
        );
        const Exported = module.exports?.default ?? module.exports;
        const instance = typeof Exported === "function"
            ? (Exported.prototype?.start ? new Exported(entry.meta) : Exported(entry.meta))
            : Exported;
        state.instance = instance;
        running.set(entry.id, state);
        instance?.load?.();
        instance?.start?.();
    } catch (e) {
        logger.error(`Failed to start ${entry.meta.name}`, e);
        showToast({ text: `Couldn't start ${entry.meta.name}`, variant: "critical" } as any);
        stop(entry.id);
    }
}

function stop(id: string) {
    const state = running.get(id);
    if (!state) return;
    try { state.instance?.stop?.(); } catch (e) { logger.error(`Failed to stop ${id}`, e); }
    state.unpatches.forEach(u => { try { u(); } catch { } });
    state.styles.forEach(s => document.getElementById(s)?.remove());
    running.delete(id);
}

export async function initBDPlugins() {
    const saved = (await DataStore.get<Omit<BDPluginEntry, "meta">[]>(STORE_KEY)) ?? [];
    entries = saved.map(e => ({ ...e, meta: parseMeta(e.source, e.id) }));
    for (const e of entries) if (e.enabled) start(e);
    emit();
}

export async function addBDPlugin(fileName: string, source: string) {
    const id = fileName.replace(/\.plugin\.js$/i, "");
    stop(id);
    entries = [...entries.filter(e => e.id !== id), { id, source, enabled: false, meta: parseMeta(source, id) }];
    await persist(); emit();
}

export async function setBDPluginEnabled(id: string, enabled: boolean) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    entry.enabled = enabled;
    enabled ? start(entry) : stop(id);
    entries = [...entries];
    await persist(); emit();
}

export async function removeBDPlugin(id: string) {
    stop(id);
    entries = entries.filter(e => e.id !== id);
    await persist(); emit();
}
