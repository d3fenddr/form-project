import { UI_SELECTORS } from '../config/builderConfig.js';

function togglePanel(panelName, forceState = null) {
    const selector = panelName === 'sidebar' ? UI_SELECTORS.toolboxSidebar : UI_SELECTORS.treeSidebar;
    const panel = $(selector);

    if (forceState !== null) {
        forceState ? panel.removeClass('d-none-animated') : panel.addClass('d-none-animated');
        return;
    }

    panel.toggleClass('d-none-animated');
}

function applySettings(settings) {
    document.documentElement.setAttribute('data-bs-theme', settings.theme);
    document.documentElement.setAttribute('data-theme', settings.theme);
    $(UI_SELECTORS.rootWrapper).attr('data-layout', settings.layout);

    if (!settings.showToolbox) {
        togglePanel('sidebar', false);
    }

    if (!settings.showTree) {
        togglePanel('tree', false);
    }
}

export { togglePanel, applySettings };
