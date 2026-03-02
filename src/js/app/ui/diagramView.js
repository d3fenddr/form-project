import { UI_SELECTORS, SCHEMA_DIAGRAM_CONFIG } from '../config/builderConfig.js';

function createSchemaDiagramWidget({ getSchema, onNodeClick }) {
    const config = SCHEMA_DIAGRAM_CONFIG;

    const state = {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        contentWidth: 0,
        contentHeight: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        dragOriginX: 0,
        dragOriginY: 0,
        bound: false,
        hasFittedAtLeastOnce: false,
        fitQueued: false,
        pendingRafTransform: 0,
        pendingResizeRaf: 0,
        schemaSignature: '',
        viewportGroupEl: null,
        layoutCache: null,
        svgMarkupCache: ''
    };

    let resizeObserver = null;

    function getViewport() {
        return document.querySelector(UI_SELECTORS.schemaDiagramViewport);
    }

    function getSvg() {
        return document.querySelector(UI_SELECTORS.schemaDiagramSvg);
    }

    function clampScale(scale) {
        return Math.min(config.maxZoom, Math.max(config.minZoom, scale));
    }

    function safeTypeClass(type) {
        return String(type || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    function getSchemaSignature(schema) {
        if (!schema) {
            return '';
        }

        return JSON.stringify(schema);
    }

    function buildGraph(schema) {
        const nodes = [];
        const edges = [];
        const rootId = '__schema_root__';

        nodes.push({ id: rootId, label: schema.title || 'Форма', type: 'root', depth: 0, parentId: null });

        function walk(fields, parentId, depth) {
            (fields || []).forEach((field) => {
                nodes.push({
                    id: field.id,
                    label: field.label || field.id,
                    type: field.type || 'field',
                    depth,
                    parentId
                });

                edges.push({ from: parentId, to: field.id });

                if (field.type === 'complex' && Array.isArray(field.fields) && field.fields.length > 0) {
                    walk(field.fields, field.id, depth + 1);
                }
            });
        }

        walk(schema.fields || [], rootId, 1);
        return { nodes, edges, rootId };
    }

    function buildLayout(graph) {
        const grouped = new Map();

        graph.nodes.forEach((node) => {
            if (!grouped.has(node.depth)) {
                grouped.set(node.depth, []);
            }
            grouped.get(node.depth).push(node);
        });

        const levels = Array.from(grouped.keys()).sort((left, right) => left - right);
        const positions = new Map();
        const maxRowLength = Math.max(...Array.from(grouped.values()).map((row) => row.length), 1);
        const depthCount = levels.length;
        const maxRowWidth = Math.max(0, (maxRowLength - 1) * config.horizontalGap);

        const contentWidth = Math.max(1260, maxRowWidth + config.marginX * 2 + config.nodeWidth);
        const contentHeight = Math.max(620, depthCount * config.verticalGap + config.marginY * 2 + config.nodeHeight);

        levels.forEach((depth) => {
            const row = grouped.get(depth);
            const rowWidth = Math.max(0, (row.length - 1) * config.horizontalGap);
            const startX = (contentWidth - rowWidth) / 2;

            row.forEach((node, index) => {
                positions.set(node.id, {
                    x: startX + index * config.horizontalGap,
                    y: config.marginY + depth * config.verticalGap,
                    width: config.nodeWidth,
                    height: config.nodeHeight
                });
            });
        });

        const nodeBounds = calculateNodeBounds(graph.nodes, positions);

        return {
            graph,
            positions,
            contentWidth,
            contentHeight,
            nodeBounds
        };
    }

    function calculateNodeBounds(nodes, positions) {
        if (!nodes.length) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        nodes.forEach((node) => {
            const pos = positions.get(node.id);
            if (!pos) {
                return;
            }

            const left = pos.x - pos.width / 2;
            const right = pos.x + pos.width / 2;
            const top = pos.y - pos.height / 2;
            const bottom = pos.y + pos.height / 2;

            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        });

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY)
        };
    }

    function buildSvgMarkup(layout) {
        const defs = `
            <defs>
                <marker id="schemaDiagramArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#9aa7c7"></path>
                </marker>
            </defs>
        `;

        const edgePaths = layout.graph.edges
            .map((edge) => {
                const from = layout.positions.get(edge.from);
                const to = layout.positions.get(edge.to);
                if (!from || !to) {
                    return '';
                }

                const startX = from.x;
                const startY = from.y + from.height / 2;
                const endX = to.x;
                const endY = to.y - to.height / 2;
                const middleY = (startY + endY) / 2;

                return `<path class="schema-diagram-edge" d="M ${startX} ${startY} C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}" marker-end="url(#schemaDiagramArrow)"></path>`;
            })
            .join('');

        const nodes = layout.graph.nodes
            .map((node) => {
                const pos = layout.positions.get(node.id);
                if (!pos) {
                    return '';
                }

                const typeClass = safeTypeClass(node.type);
                const clickableClass = node.id === layout.graph.rootId ? '' : 'is-clickable';
                const meta = node.id === layout.graph.rootId ? 'schema' : node.type;

                return `
                    <g class="schema-diagram-node node-${typeClass} ${clickableClass}" data-node-id="${node.id}">
                        <rect x="${pos.x - pos.width / 2}" y="${pos.y - pos.height / 2}" width="${pos.width}" height="${pos.height}" rx="10" ry="10"></rect>
                        <text class="node-title" x="${pos.x}" y="${pos.y - 10}" text-anchor="middle">${escapeXml(node.label)}</text>
                        <text class="node-meta" x="${pos.x}" y="${pos.y + 14}" text-anchor="middle">(${escapeXml(meta)})</text>
                    </g>
                `;
            })
            .join('');

        return `${defs}<g data-layer="viewport">${edgePaths}${nodes}</g>`;
    }

    function scheduleTransformUpdate() {
        if (state.pendingRafTransform) {
            return;
        }

        state.pendingRafTransform = requestAnimationFrame(() => {
            state.pendingRafTransform = 0;
            if (!state.viewportGroupEl) {
                return;
            }

            state.viewportGroupEl.setAttribute(
                'transform',
                `translate(${state.offsetX.toFixed(2)} ${state.offsetY.toFixed(2)}) scale(${state.scale.toFixed(3)})`
            );
        });
    }

    function fitToView({ padding = config.fitPadding, ensureReadable = false } = {}) {
        const viewport = getViewport();
        const layout = state.layoutCache;

        if (!viewport || !layout || !layout.nodeBounds) {
            return;
        }

        const bounds = layout.nodeBounds;
        const viewportWidth = Math.max(1, viewport.clientWidth);
        const viewportHeight = Math.max(1, viewport.clientHeight);

        const targetWidth = bounds.width * (1 + padding * 2);
        const targetHeight = bounds.height * (1 + padding * 2);

        let nextScale = Math.min(viewportWidth / targetWidth, viewportHeight / targetHeight);
        nextScale = clampScale(nextScale);

        if (ensureReadable) {
            nextScale = Math.max(nextScale, config.initialMinReadableZoom);
            nextScale = clampScale(nextScale);
        }

        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;

        state.scale = nextScale;
        state.offsetX = viewportWidth / 2 - centerX * nextScale;
        state.offsetY = viewportHeight / 2 - centerY * nextScale;
        scheduleTransformUpdate();
    }

    function queueDoubleRafFit({ ensureReadable }) {
        if (state.fitQueued) {
            return;
        }

        state.fitQueued = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fitToView({ padding: config.fitPadding, ensureReadable });
                state.fitQueued = false;
            });
        });
    }

    function zoomBy(multiplier, centerX, centerY) {
        const viewport = getViewport();
        if (!viewport) {
            return;
        }

        const oldScale = state.scale;
        const nextScale = clampScale(oldScale * multiplier);
        if (nextScale === oldScale) {
            return;
        }

        const rect = viewport.getBoundingClientRect();
        const targetX = centerX ?? rect.left + viewport.clientWidth / 2;
        const targetY = centerY ?? rect.top + viewport.clientHeight / 2;

        const localX = targetX - rect.left;
        const localY = targetY - rect.top;

        const worldX = (localX - state.offsetX) / oldScale;
        const worldY = (localY - state.offsetY) / oldScale;

        state.scale = nextScale;
        state.offsetX = localX - worldX * nextScale;
        state.offsetY = localY - worldY * nextScale;

        scheduleTransformUpdate();
    }

    function bindResizeObserver() {
        const viewport = getViewport();
        if (!viewport || resizeObserver) {
            return;
        }

        resizeObserver = new ResizeObserver(() => {
            if (state.pendingResizeRaf) {
                cancelAnimationFrame(state.pendingResizeRaf);
            }

            state.pendingResizeRaf = requestAnimationFrame(() => {
                state.pendingResizeRaf = 0;
                fitToView({ padding: config.fitPadding, ensureReadable: true });
            });
        });

        resizeObserver.observe(viewport);
    }

    function bindEvents() {
        if (state.bound) {
            return;
        }

        const viewport = getViewport();
        const svg = getSvg();
        if (!viewport || !svg) {
            return;
        }

        viewport.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) {
                return;
            }

            event.preventDefault();
            state.isDragging = true;
            state.dragStartX = event.clientX;
            state.dragStartY = event.clientY;
            state.dragOriginX = state.offsetX;
            state.dragOriginY = state.offsetY;
            viewport.classList.add('dragging');
            if (viewport.setPointerCapture) {
                viewport.setPointerCapture(event.pointerId);
            }
        });

        viewport.addEventListener('pointermove', (event) => {
            if (!state.isDragging) {
                return;
            }

            event.preventDefault();
            const deltaX = event.clientX - state.dragStartX;
            const deltaY = event.clientY - state.dragStartY;
            const panMultiplier = config.dragPanMultiplier || 1;
            state.offsetX = state.dragOriginX + deltaX * panMultiplier;
            state.offsetY = state.dragOriginY + deltaY * panMultiplier;
            scheduleTransformUpdate();
        });

        const stopDrag = (event) => {
            if (!state.isDragging) {
                return;
            }

            state.isDragging = false;
            viewport.classList.remove('dragging');
            if (viewport.releasePointerCapture) {
                try {
                    viewport.releasePointerCapture(event.pointerId);
                } catch {
                    // noop
                }
            }
        };

        viewport.addEventListener('pointerup', stopDrag);
        viewport.addEventListener('pointercancel', stopDrag);
        viewport.addEventListener('pointerleave', stopDrag);

        viewport.addEventListener(
            'wheel',
            (event) => {
                event.preventDefault();
                const multiplier = event.deltaY < 0 ? config.wheelZoomStep : 1 / config.wheelZoomStep;
                zoomBy(multiplier, event.clientX, event.clientY);
            },
            { passive: false }
        );

        document.querySelector(UI_SELECTORS.schemaDiagramZoomIn)?.addEventListener('click', () => {
            zoomBy(config.buttonZoomStep);
        });

        document.querySelector(UI_SELECTORS.schemaDiagramZoomOut)?.addEventListener('click', () => {
            zoomBy(1 / config.buttonZoomStep);
        });

        document.querySelector(UI_SELECTORS.schemaDiagramReset)?.addEventListener('click', () => {
            fitToView({ padding: config.fitPadding, ensureReadable: true });
        });

        svg.addEventListener('click', (event) => {
            const target = event.target;
            const node = target.closest('[data-node-id]');
            if (!node) {
                return;
            }

            const nodeId = node.getAttribute('data-node-id');
            if (!nodeId || nodeId === '__schema_root__') {
                return;
            }

            if (typeof onNodeClick === 'function') {
                onNodeClick(nodeId);
            }
        });

        state.bound = true;
        bindResizeObserver();
    }

    function render() {
        const viewport = getViewport();
        const svg = getSvg();
        if (!viewport || !svg) {
            return;
        }

        bindEvents();

        const schema = getSchema();
        if (!schema) {
            svg.innerHTML = '';
            state.viewportGroupEl = null;
            state.layoutCache = null;
            state.svgMarkupCache = '';
            state.schemaSignature = '';
            state.hasFittedAtLeastOnce = false;
            return;
        }

        const signature = getSchemaSignature(schema);
        const schemaChanged = signature !== state.schemaSignature;

        if (schemaChanged || !state.layoutCache) {
            const graph = buildGraph(schema);
            const layout = buildLayout(graph);

            state.layoutCache = layout;
            state.contentWidth = layout.contentWidth;
            state.contentHeight = layout.contentHeight;
            state.svgMarkupCache = buildSvgMarkup(layout);
            state.schemaSignature = signature;

            svg.setAttribute('viewBox', `0 0 ${layout.contentWidth} ${layout.contentHeight}`);
            svg.innerHTML = state.svgMarkupCache;
            state.viewportGroupEl = svg.querySelector('[data-layer="viewport"]');

            queueDoubleRafFit({ ensureReadable: true });
            state.hasFittedAtLeastOnce = true;
            return;
        }

        if (!state.viewportGroupEl) {
            state.viewportGroupEl = svg.querySelector('[data-layer="viewport"]');
        }

        if (!state.hasFittedAtLeastOnce) {
            queueDoubleRafFit({ ensureReadable: true });
            state.hasFittedAtLeastOnce = true;
        } else {
            scheduleTransformUpdate();
        }
    }

    return {
        render,
        fitToView: () => fitToView({ padding: config.fitPadding, ensureReadable: true })
    };
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export { createSchemaDiagramWidget };
