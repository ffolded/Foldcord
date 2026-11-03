/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

// Main-process helpers for Addons > Themes > Browse (see native.ts).
export default definePlugin({
    name: "FoldcordStore",
    description: "Lets the Themes page browse and install themes",
    authors: [{ name: "xohus (CloudCord)", id: 0n }],
    required: true,
});
