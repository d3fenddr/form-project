import { createRootObject } from './app/schema/factory.js';
import { getState, setState, subscribe } from './app/state.js';
import { renderAll } from './app/ui/renderAll.js';
import { treeView } from './app/ui/treeView.js';
import { jsonView } from './app/ui/jsonView.js';

$(document).ready(() => {
    subscribe(renderAll);

    treeView.init();
    jsonView.init();

    const root = createRootObject();
    setState({
        schema: root,
        selectedNodeId: root.id,
        formData: getState().formData || {},
        ui: {
            ...(getState().ui || {}),
            expandedNodeIds: [root.id]
        }
    });
});