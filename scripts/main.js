import { initConfig } from './config.js';
import {registerSettings} from './settings.js';
import {CombatDock} from './app/CombatDock.js';
import {CombatantPortrait} from './app/CombatantPortrait.js';
import {defaultAttributesConfig, generateDescription} from './systems.js';
import { showWelcome } from './lib/welcome.js';
import "../scss/module.scss";

export const MODULE_ID = 'combat-tracker-dock';

export function getCurrentCombat(){
    return ui.combat.viewed;
}

Hooks.once('init', function () {
    registerWrappers();
    registerHotkeys();
    CONFIG.combatTrackerDock = {
        CombatDock,
        CombatantPortrait,
        defaultAttributesConfig,
        generateDescription,
        INTRO_ANIMATION_DURATION: 1000,
        INTRO_ANIMATION_DELAY: 0.25,
    }

    Hooks.callAll(`${MODULE_ID}-init`, CONFIG.combatTrackerDock);
});

Hooks.on('ready', () => {
    registerSettings();
    initConfig();
    const currentCombat = getCurrentCombat();
    if(currentCombat && !ui.combatDock && game.settings.get("core", "noCanvas")) {
        new CONFIG.combatTrackerDock.CombatDock(currentCombat).render(true);
    }
    showWelcome();
});

Hooks.on('createCombat', (combat) => {
    if (game.combat === combat) {
        new CONFIG.combatTrackerDock.CombatDock(combat).render(true);
    }
});

Hooks.on('updateCombat', (combat, updates) => {
    if(updates.active || updates.scene === null) {
        new CONFIG.combatTrackerDock.CombatDock(combat).render(true);
    }
    if(updates.scene && combat.scene !== game.scenes.viewed && ui.combatDock?.combat === combat) {
        ui.combatDock.close();
    }
});

Hooks.on('canvasReady', () => {
    Hooks.once("renderCombatTracker", (tab) => {
        const currentCombat = getCurrentCombat();
            if(currentCombat) {
                new CONFIG.combatTrackerDock.CombatDock(currentCombat).render(true);
            } else {
                ui.combatDock?.close();
            }
    })
});

Hooks.on("getActorSheetHeaderButtons", addCarouselImageHeaderButton);
Hooks.on("renderActorSheet", ensureCarouselImageHeaderButton);
Hooks.on("renderActorSheetV2", ensureCarouselImageHeaderButton);

function getCarouselImage(actor) {
    return actor?.getFlag?.(MODULE_ID, "carouselImage")
        ?? foundry.utils.getProperty(actor?.flags, `${MODULE_ID}.carouselImage`)
        ?? "";
}

async function saveCarouselImage(actor, value) {
    const path = String(value ?? "").trim();
    if (path) await actor.setFlag(MODULE_ID, "carouselImage", path);
    else await actor.unsetFlag(MODULE_ID, "carouselImage");
    ui.combatDock?.refresh?.();
}

function addCarouselImageHeaderButton(app, buttons) {
    const actor = app?.actor ?? app?.document ?? app?.object;
    if (!actor?.isOwner || game.system?.id !== "gum") return;
    if (buttons.some(button => button.class === "combat-tracker-dock-carousel-image-header")) return;

    buttons.push({
        label: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.button`),
        class: "combat-tracker-dock-carousel-image-header",
        icon: "fas fa-images",
        onclick: () => openCarouselImageDialog(actor),
    });
}

/**
 * Foundry V14 still renders the GUM sheet through the V1 ActorSheet API, but
 * the render fallback keeps the control available for sheets that do not call
 * the actor-header hook (including V2 applications and older compatibility
 * layers). It deliberately uses Foundry's native header-button classes.
 */
function ensureCarouselImageHeaderButton(app, html) {
    const actor = app?.actor ?? app?.document ?? app?.object;
    if (!actor?.isOwner || game.system?.id !== "gum") return;

    const appElement = app?.element instanceof HTMLElement
        ? app.element
        : app?.element?.[0] ?? app?.element;
    const renderedRoot = html instanceof HTMLElement ? html : html?.[0] ?? html;
    const windowRoot = appElement?.querySelector?.(".window-header")
        ? appElement
        : renderedRoot?.closest?.(".app, .window-app") ?? renderedRoot?.parentElement;
    const header = windowRoot?.querySelector?.(".window-header");
    if (!header || header.querySelector(".combat-tracker-dock-carousel-image-header")) return;

    const button = document.createElement("a");
    button.className = "header-button control-icon combat-tracker-dock-carousel-image-header";
    button.dataset.tooltip = game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.button`);
    button.title = button.dataset.tooltip;
    button.innerHTML = `<i class="fas fa-images"></i><span>${button.dataset.tooltip}</span>`;
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openCarouselImageDialog(actor);
    });

    const closeButton = header.querySelector(".header-button.close, [data-action='close'], .close");
    if (closeButton?.parentElement) closeButton.parentElement.insertBefore(button, closeButton);
    else header.appendChild(button);
}

function openCarouselImageDialog(actor) {
    if (!actor?.isOwner || typeof Dialog !== "function") return;

    const current = getCarouselImage(actor);
    const esc = value => foundry.utils.escapeHTML(String(value ?? ""));
    const labels = {
        title: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.dialogTitle`),
        name: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.name`),
        browse: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.browse`),
        hint: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.hint`),
        save: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.save`),
        clear: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.clear`),
        cancel: game.i18n.localize(`${MODULE_ID}.actorSheet.carouselImage.cancel`),
    };

    const content = `
        <form class="combat-tracker-dock-carousel-image-dialog">
            <div class="form-group">
                <label>${esc(labels.name)}</label>
                <div class="form-fields">
                    <input type="text" name="carouselImage" value="${esc(current)}" autocomplete="off">
                    <button type="button" data-action="browse" title="${esc(labels.browse)}">
                        <i class="fas fa-file-image"></i>
                    </button>
                </div>
                <p class="hint">${esc(labels.hint)}</p>
            </div>
        </form>`;

    const persistFromDialog = async html => {
        const root = html?.[0] ?? html;
        const input = root?.querySelector?.("input[name='carouselImage']");
        await saveCarouselImage(actor, input?.value ?? "");
    };

    new Dialog({
        title: labels.title,
        content,
        buttons: {
            save: {
                label: labels.save,
                icon: "fas fa-save",
                callback: persistFromDialog,
            },
            clear: {
                label: labels.clear,
                icon: "fas fa-trash",
                callback: () => saveCarouselImage(actor, ""),
            },
            cancel: { label: labels.cancel },
        },
        default: "save",
        render: html => {
            const root = html?.[0] ?? html;
            const input = root?.querySelector?.("input[name='carouselImage']");
            const browse = root?.querySelector?.("[data-action='browse']");
            browse?.addEventListener("click", event => {
                event.preventDefault();
                if (typeof FilePicker !== "function") return;
                new FilePicker({
                    type: "image",
                    current: input?.value ?? "",
                    callback: path => {
                        if (input) input.value = path;
                    },
                }).render(true);
            });
        },
    }, { width: 560 }).render(true);
}


function registerWrappers() {
    if (!game.modules.get("lib-wrapper")?.active) return;

    libWrapper.register(MODULE_ID, "Combatant.prototype.visible", function (wrapped, ...args) {
        const visible = wrapped(...args);
        if (!ui.combatDock?.rendered) return visible;
        const cDVisible = ui.combatDock.portraits.find((p) => p.combatant == this)?.firstTurnHidden;
        return visible && !cDVisible;
    });
}

function registerHotkeys() {
    game.keybindings.register(MODULE_ID, "combatPrev", {
        name: `${MODULE_ID}.hotkeys.combatPrev.name`,
        editable: [{ key: "KeyN", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT] }],
        restricted: false,
        onDown: () => {},
        onUp: () => {
            if (!game.combat) return;
            const isOwner = game.combat.combatant?.isOwner;
            if (!isOwner) return;
            game.combat.previousTurn();
        },
    });

    game.keybindings.register(MODULE_ID, "combatNext", {
        name: `${MODULE_ID}.hotkeys.combatNext.name`,
        editable: [{ key: "KeyM", modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT] }],
        restricted: false,
        onDown: () => {},
        onUp: () => {
            if (!game.combat) return;
            const isOwner = game.combat.combatant?.isOwner;
            if (!isOwner) return;
            game.combat.nextTurn();
        },
    });
}
