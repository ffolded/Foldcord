/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BadgePosition, BadgeRarity, ProfileBadge } from "@api/Badges";
import { BadgeContextMenu } from "@plugins/_api/badges";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { ContextMenuApi, showToast } from "@webpack/common";

interface BadgeEntry {
    tooltip: string;
    badge: string;
}

const logger = new Logger("FoldcordBadges");
const BADGES_URL = "https://raw.githubusercontent.com/ffolded/foldcord/main/badges/badges.json";

let badges: Record<string, BadgeEntry[]> = {};
let intervalId: ReturnType<typeof setInterval> | undefined;

async function loadBadges() {
    try {
        badges = await fetch(BADGES_URL, { cache: "no-cache" }).then(r => r.json());
    } catch (e) {
        logger.warn("Could not load badges", e);
    }
}

export default definePlugin({
    name: "FoldcordBadges",
    description: "Shows Foldcord badges like Founder on profiles.",
    tags: ["Appearance"],
    authors: [{ name: "xohus (CloudCord)", id: 0n }],
    enabledByDefault: true,

    userProfileBadges: [{
        id: "foldcord_badges",
        position: BadgePosition.START,
        getBadges: ({ userId }) => (badges[userId] ?? [])
            .filter(b => URL.parse(b.badge)?.protocol === "https:")
            .map((b, idx) => ({
                id: `foldcord_badge_${idx}`,
                iconSrc: b.badge,
                description: b.tooltip,
                name: b.tooltip,
                infoLabel: "Foldcord",
                rarity: BadgeRarity.MYTHIC,
                position: BadgePosition.START,
                props: {
                    style: {
                        borderRadius: "50%",
                        transform: "scale(0.9)"
                    }
                },
                onContextMenu(event, badge) {
                    ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
                }
            } satisfies ProfileBadge))
    }],

    toolboxActions: {
        async "Refetch Foldcord Badges"() {
            await loadBadges();
            showToast({ text: "Refetched Foldcord badges.", variant: "success" });
        }
    },

    async start() {
        await loadBadges();
        clearInterval(intervalId);
        intervalId = setInterval(loadBadges, 1000 * 60 * 30);
    },

    stop() {
        clearInterval(intervalId);
        intervalId = undefined;
    }
});
