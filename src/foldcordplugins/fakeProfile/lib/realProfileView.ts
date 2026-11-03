/*
 * CloudCord Fake Profile (support module)
 * Copyright (c) 2026 xohus and CloudCord contributors
 * Part of the Fake Profile plugin, which is based on the Custom Profile / FakeProfile plugin
 * from Sincord, the same code also ships as customProfile in Endcord (github.com/Endcord/Endcord).
 * Portions copyright (c) 2026 Sincord contributors and Endcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { localStorage } from "@utils/localStorage";

const KEY = "CloudCord_realProfileUsers";
const users = new Set<string>();
try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(saved)) for (const id of saved) if (typeof id === "string" && /^\d{15,22}$/.test(id)) users.add(id);
} catch {}

export function isRealProfileView(userId: string): boolean {
    return users.has(userId);
}

export function setRealProfileView(userId: string, enabled: boolean) {
    if (!/^\d{15,22}$/.test(userId)) return;
    if (enabled) users.add(userId); else users.delete(userId);
    try { localStorage.setItem(KEY, JSON.stringify([...users])); } catch {}
}
