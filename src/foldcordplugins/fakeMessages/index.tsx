/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, generateId, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

const cl = classNameFactory("vc-fakemessages-");
const localIds = new Set<string>();

const settings = definePluginSettings({
    showTag: {
        type: OptionType.BOOLEAN,
        description: "Show a small Local only tag under fake messages.",
        default: true
    }
});

export default definePlugin({
    name: "FakeMessages",
    description: "Adds messages to a channel as any user. Only you can see them.",
    authors: [{ name: "folded", id: 0n }],
    settings,

    commands: [{
        name: "fakemessage",
        description: "Add a fake message from any user. Only you can see it.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "user", description: "Who sends it", type: ApplicationCommandOptionType.USER, required: true },
            { name: "content", description: "What it says", type: ApplicationCommandOptionType.STRING, required: true }
        ],
        execute(args, ctx) {
            const user = UserStore.getUser(findOption<string>(args, "user"));
            const id = generateId();
            localIds.add(id);

            sendBotMessage(ctx.channel.id, {
                id,
                content: findOption<string>(args, "content"),
                author: { id: user.id, username: user.username, discriminator: user.discriminator, avatar: user.avatar, globalName: user.globalName, bot: user.bot }
            });
        }
    }],

    renderMessageAccessory: {
        render: ({ message }) => settings.store.showTag && localIds.has(message.id)
            ? <span className={cl("tag")}>Local only, only you can see this</span>
            : null
    }
});
