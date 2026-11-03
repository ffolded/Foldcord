/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./tutorial.css";

import * as DataStore from "@api/DataStore";
import { classNameFactory } from "@utils/css";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { SettingsRouter, useEffect, useState } from "@webpack/common";

import logo from "file://logo-white.png?base64";
import sidebarShot from "file://tutorial/1-sidebar.webp?base64";
import pluginsShot from "file://tutorial/2-plugins.webp?base64";
import themesShot from "file://tutorial/3-themes.webp?base64";

const cl = classNameFactory("fc-tut-");
const Root = ModalRoot as any;
const SEEN_KEY = "Foldcord_tutorialSeen";

const STEPS: { title: string; body: string; image?: string; }[] = [
    {
        title: "Welcome to Foldcord",
        body: "Hundreds of plugins and a whole theme store, kept light. Here's a quick look around. It takes about 20 seconds.",
    },
    {
        title: "Two places to know",
        body: "Open User Settings. Foldcord holds your home page and settings. Addons is where your plugins and themes live.",
        image: "data:image/webp;base64," + sidebarShot,
    },
    {
        title: "Turn plugins on",
        body: "Search for anything, flip the switch to turn a plugin on, and use the gear to change its settings.",
        image: "data:image/webp;base64," + pluginsShot,
    },
    {
        title: "Make it yours",
        body: "In Themes, open Browse to see the theme store. One click installs a theme and turns it on.",
        image: "data:image/webp;base64," + themesShot,
    },
    {
        title: "You're all set",
        body: "You can replay this tour any time from Foldcord → Home.",
    },
];

function Tutorial({ transitionState, onClose }: { transitionState: any; onClose(): void; }) {
    const [step, setStep] = useState(0);
    const last = step === STEPS.length - 1;
    const { title, body, image } = STEPS[step];

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") setStep(s => Math.min(s + 1, STEPS.length - 1));
            if (e.key === "ArrowLeft") setStep(s => Math.max(s - 1, 0));
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const finish = (openAddons: boolean) => {
        onClose();
        if (openAddons) SettingsRouter.openUserSettings("foldcord_addons_panel");
    };

    return (
        <Root transitionState={transitionState} size={ModalSize.LARGE} className={cl("root")}>
            <div className={cl("wrap")}>
                <button className={cl("skip")} onClick={() => finish(false)}>{last ? "Close" : "Skip"}</button>

                <div className={cl("stage")} key={step}>
                    {image
                        ? <img className={cl("shot")} src={image} alt="" draggable={false} />
                        : (
                            <div className={cl("hero")}>
                                <div className={cl("glow")} />
                                <img className={cl("logo")} src={`data:image/png;base64,${logo}`} alt="" draggable={false} />
                            </div>
                        )}
                </div>

                <div className={cl("text")} key={"t" + step}>
                    <h2 className={cl("title")}>{title}</h2>
                    <p className={cl("body")}>{body}</p>
                </div>

                <div className={cl("footer")}>
                    <div className={cl("dots")}>
                        {STEPS.map((_, i) => (
                            <button key={i} aria-label={`Step ${i + 1}`} className={cl("dot", { "dot-on": i === step })} onClick={() => setStep(i)} />
                        ))}
                    </div>
                    <div className={cl("buttons")}>
                        {step > 0 && <button className={cl("back")} onClick={() => setStep(step - 1)}>Back</button>}
                        {last
                            ? <button className={cl("next")} onClick={() => finish(true)}>Open Addons</button>
                            : <button className={cl("next")} onClick={() => setStep(step + 1)}>{step === 0 ? "Show me" : "Next"}</button>}
                    </div>
                </div>
            </div>
        </Root>
    );
}

export function openTutorial() {
    DataStore.set(SEEN_KEY, true);
    openModal(props => <Tutorial {...props} />);
}

export async function showTutorialOnce() {
    if (await DataStore.get(SEEN_KEY)) return;
    openTutorial();
}
