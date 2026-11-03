/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { initBDPlugins } from "@components/settings/tabs/foldcord/bdLoader";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "FoldcordBDCompat",
    description: "Loads BetterDiscord plugins added in the Foldcord settings tab",
    authors: [{ name: "xohus", id: 0n }],
    required: true,

    start() {
        initBDPlugins();
    }
});
