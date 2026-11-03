/*
 * CloudCord Fake Profile (support module)
 * Copyright (c) 2026 xohus and CloudCord contributors
 * Part of the Fake Profile plugin, which is based on the Custom Profile / FakeProfile plugin
 * from Sincord, the same code also ships as customProfile in Endcord (github.com/Endcord/Endcord).
 * Portions copyright (c) 2026 Sincord contributors and Endcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Bound an async load even when its transport ignores cancellation. */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 12000, message = "Loading took too long. Check your connection and retry."): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
        Promise.resolve(promise),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })
    ]).finally(() => { if (timer !== undefined) clearTimeout(timer); });
}
