import { treeView } from './treeView.js';
import { jsonView } from './jsonView.js';
import { formPreview } from './formPreview.js';
import { diagramView } from './diagramView.js';

/**
 * Render all UI components based on the current state.
 * @param {Object} state - The current application state.
 */
function renderAll(state) {
    treeView.render(state);
    jsonView.render(state);
    formPreview.render(state);

    const diagramTab = document.getElementById('diagram-tab');
    if (diagramTab && diagramTab.classList.contains('active') && diagramTab.classList.contains('show')) {
        diagramView.render(state);
    }
}

export { renderAll };