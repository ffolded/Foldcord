/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showTutorialOnce } from "@components/settings/tabs/foldcord/Tutorial";
import definePlugin from "@utils/types";

// Foldcord's own core: the first-run tour, plus main-process helpers for
// Addons > Themes > Browse (see native.ts).
export default definePlugin({
    name: "FoldcordCore",
    description: "Foldcord's tour and theme store",
    authors: [{ name: "xohus (CloudCord)", id: 0n }],
    required: true,

    start() {
        setTimeout(showTutorialOnce, 3000);
    }
});
