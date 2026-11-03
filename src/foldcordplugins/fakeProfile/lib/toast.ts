/*
 * CloudCord Fake Profile (support module)
 * Copyright (c) 2026 xohus and CloudCord contributors
 * Part of the Fake Profile plugin, which is based on the Custom Profile / FakeProfile plugin
 * from Sincord, the same code also ships as customProfile in Endcord (github.com/Endcord/Endcord).
 * Portions copyright (c) 2026 Sincord contributors and Endcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
// Foldcord: adapts the plugin's old showToast(text, type) calls to the current Equicord toast API.
import { showToast as nativeShowToast } from "@webpack/common";

export const Toasts = { Type: { MESSAGE: "message", SUCCESS: "success", FAILURE: "failure" } } as const;

export function showToast(text: string, type: string = Toasts.Type.MESSAGE) {
    nativeShowToast({ text, ...(type === "success" ? { variant: "success" } : type === "failure" ? { variant: "critical" } : {}) } as any);
}
