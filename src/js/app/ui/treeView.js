import { setState, getState } from '../state.js';
import { createPropertyNode, createObjectNode, createArrayNode } from '../schema/factory.js';
import { addChild, removeNode, findNodeById } from '../schema/model.js';
import { inspectorModal } from './inspectorModal.js';

function getExpandedIds(state) {
    return state?.ui?.expandedNodeIds || [];
}

function nodeTypeLabel(node) {
    if (node.kind === 'property') {
        return node.valueType || 'string';
    }

    return node.kind;
}

function nodeTypeClass(node, rootId) {
    if (node.id === rootId) {
        return 'root';
    }

    if (node.kind === 'property') {
        return node.valueType || 'string';
    }

    return node.kind;
}

function buildTreeNode(node, depth, state, expandedSet, rootId) {
    const hasChildren = (node.children || []).length > 0;
    const isExpanded = expandedSet.has(node.id);
    const isSelected = state.selectedNodeId === node.id;
    const safeDepth = Math.min(depth, 12);
    const typeClass = nodeTypeClass(node, rootId);

    const li = document.createElement('li');
    li.className = 'tree-item';

    const row = document.createElement('div');
    row.className = `tree-node tree-depth-${safeDepth} tree-type-${typeClass}${isSelected ? ' tree-selected' : ''}`;
    row.dataset.nodeId = node.id;
    row.dataset.depth = String(depth);
    row.dataset.hasChildren = hasChildren ? 'true' : 'false';

    if (hasChildren) {
        const chevron = document.createElement('button');
        chevron.type = 'button';
        chevron.className = `tree-chevron${isExpanded ? ' expanded' : ''}`;
        chevron.dataset.action = 'toggle';
        chevron.dataset.nodeId = node.id;
        chevron.setAttribute('aria-label', 'Toggle children');
        chevron.textContent = '▸';
        row.appendChild(chevron);
    } else {
        const spacer = document.createElement('span');
        spacer.className = 'tree-chevron-spacer';
        row.appendChild(spacer);
    }

    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = node.name || node.kind;

    const badge = document.createElement('span');
    badge.className = `badge rounded-pill tree-badge tree-badge-${typeClass}`;
    badge.textContent = nodeTypeLabel(node);

    row.appendChild(name);
    row.appendChild(badge);
    li.appendChild(row);

    if (hasChildren && isExpanded) {
        const childList = document.createElement('ul');
        childList.className = 'tree-children';
        (node.children || []).forEach((child) => {
            childList.appendChild(buildTreeNode(child, depth + 1, state, expandedSet, rootId));
        });
        li.appendChild(childList);
    }

    return li;
}

const treeView = {
    /**
     * Render the tree view based on the state.
     * @param {Object} state - The current application state.
     */
    render(state) {
        const container = document.getElementById('tree-container');
        if (!container) {
            return;
        }

        container.innerHTML = '';

        const root = state.schema;
        if (!root || !root.id) {
            return;
        }

        const expandedIds = getExpandedIds(state);
        const expandedSet = new Set(expandedIds);

        const list = document.createElement('ul');
        list.className = 'tree-list';
        list.appendChild(buildTreeNode(root, 0, state, expandedSet, root.id));
        container.appendChild(list);
    },

    /**
     * Initialize event listeners for the tree view.
     */
    init() {
        const $container = $('#tree-container');
        if ($container.length === 0) {
            return;
        }

        let lastClickNodeId = null;
        let lastClickTs = 0;

        $container.on('click', '[data-action="toggle"]', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const nodeId = $(event.currentTarget).data('nodeId');
            const state = getState();
            const expandedSet = new Set(getExpandedIds(state));

            if (expandedSet.has(nodeId)) {
                expandedSet.delete(nodeId);
            } else {
                expandedSet.add(nodeId);
            }

            setState({
                ui: {
                    ...(state.ui || {}),
                    expandedNodeIds: Array.from(expandedSet)
                }
            });
        });

        $container.on('click', '.tree-node', (event) => {
            const nodeId = $(event.currentTarget).data('nodeId');
            if (!nodeId) {
                return;
            }

            const now = Date.now();
            const isDoubleClick = lastClickNodeId === nodeId && (now - lastClickTs) < 320;

            setState({ selectedNodeId: nodeId });

            if (isDoubleClick) {
                inspectorModal.open(nodeId);
                lastClickNodeId = null;
                lastClickTs = 0;
            } else {
                lastClickNodeId = nodeId;
                lastClickTs = now;
            }
        });

        $('#add-property').on('click', () => {
            const state = getState();
            const selectedNode = findNodeById(state.schema, state.selectedNodeId);
            if (selectedNode && (selectedNode.kind === 'object' || selectedNode.kind === 'array')) {
                const newNode = createPropertyNode();
                addChild(state.schema, selectedNode.id, newNode);

                const expandedSet = new Set(getExpandedIds(state));
                expandedSet.add(selectedNode.id);
                setState({
                    schema: state.schema,
                    ui: {
                        ...(state.ui || {}),
                        expandedNodeIds: Array.from(expandedSet)
                    }
                });
            }
        });

        $('#add-object').on('click', () => {
            const state = getState();
            const selectedNode = findNodeById(state.schema, state.selectedNodeId);
            if (selectedNode && (selectedNode.kind === 'object' || selectedNode.kind === 'array')) {
                const newNode = createObjectNode();
                addChild(state.schema, selectedNode.id, newNode);

                const expandedSet = new Set(getExpandedIds(state));
                expandedSet.add(selectedNode.id);
                setState({
                    schema: state.schema,
                    ui: {
                        ...(state.ui || {}),
                        expandedNodeIds: Array.from(expandedSet)
                    }
                });
            }
        });

        $('#add-array').on('click', () => {
            const state = getState();
            const selectedNode = findNodeById(state.schema, state.selectedNodeId);
            if (selectedNode && (selectedNode.kind === 'object' || selectedNode.kind === 'array')) {
                const newNode = createArrayNode();
                addChild(state.schema, selectedNode.id, newNode);

                const expandedSet = new Set(getExpandedIds(state));
                expandedSet.add(selectedNode.id);
                setState({
                    schema: state.schema,
                    ui: {
                        ...(state.ui || {}),
                        expandedNodeIds: Array.from(expandedSet)
                    }
                });
            }
        });

        $('#delete-node').on('click', () => {
            const state = getState();
            if (state.selectedNodeId && state.selectedNodeId !== state.schema.id) {
                removeNode(state.schema, state.selectedNodeId);

                const expandedSet = new Set(getExpandedIds(state));
                expandedSet.delete(state.selectedNodeId);

                setState({
                    schema: state.schema,
                    selectedNodeId: null,
                    ui: {
                        ...(state.ui || {}),
                        expandedNodeIds: Array.from(expandedSet)
                    }
                });
            }
        });
    }
};

export { treeView };