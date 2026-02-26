import { setState } from '../state.js';
import { inspectorModal } from './inspectorModal.js';

function centerOnRoot(host) {
    const rootX = Number(host.dataset.rootX || 0);
    const rootY = Number(host.dataset.rootY || 0);
    if (!rootX || !rootY) {
        return;
    }

    const targetLeft = rootX - host.clientWidth / 2;
    const targetTop = rootY - host.clientHeight * 0.42;
    const maxLeft = Math.max(0, host.scrollWidth - host.clientWidth);
    const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);

    host.scrollLeft = Math.min(Math.max(0, targetLeft), maxLeft);
    host.scrollTop = Math.min(Math.max(0, targetTop), maxTop);
}

function bindPan(host) {
    if (!host || host.dataset.boundPan) {
        return;
    }

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let suppressClick = false;

    host.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }

        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startScrollLeft = host.scrollLeft;
        startScrollTop = host.scrollTop;
        suppressClick = false;
        host.classList.add('dragging');
        if (host.setPointerCapture) {
            host.setPointerCapture(event.pointerId);
        }
    });

    host.addEventListener('pointermove', (event) => {
        if (!dragging) {
            return;
        }

        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;

        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
            suppressClick = true;
        }

        host.scrollLeft = startScrollLeft - deltaX;
        host.scrollTop = startScrollTop - deltaY;
    });

    const stopDragging = (event) => {
        if (!dragging) {
            return;
        }

        dragging = false;
        host.classList.remove('dragging');
        if (host.releasePointerCapture) {
            try {
                host.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
        }
    };

    host.addEventListener('pointerup', stopDragging);
    host.addEventListener('pointercancel', stopDragging);
    host.addEventListener('pointerleave', stopDragging);

    host.addEventListener('click', (event) => {
        if (!suppressClick) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
    }, true);

    host.addEventListener('wheel', (event) => {
        event.preventDefault();
    }, { passive: false });

    host.dataset.boundPan = 'true';
}

function collectByDepth(node, depth = 0, rows = []) {
    if (!node) {
        return rows;
    }

    if (!rows[depth]) {
        rows[depth] = [];
    }

    rows[depth].push(node);
    (node.children || []).forEach((child) => collectByDepth(child, depth + 1, rows));
    return rows;
}

function assignPositions(root) {
    const byDepth = collectByDepth(root);
    const positions = new Map();
    const verticalGap = 150;
    const horizontalGap = 240;
    const marginX = 100;
    const marginY = 70;

    byDepth.forEach((nodes, depth) => {
        const rowWidth = (nodes.length - 1) * horizontalGap;
        const startX = marginX + Math.max(0, (1280 - rowWidth) / 2);

        nodes.forEach((node, index) => {
            positions.set(node.id, {
                x: startX + index * horizontalGap,
                y: marginY + depth * verticalGap
            });
        });
    });

    return { positions, depthCount: byDepth.length, maxCount: Math.max(...byDepth.map((r) => r.length), 1) };
}

function flattenEdges(node, edges = []) {
    if (!node) {
        return edges;
    }

    (node.children || []).forEach((child) => {
        edges.push({ from: node.id, to: child.id });
        flattenEdges(child, edges);
    });

    return edges;
}

function nodeLabel(node) {
    const name = node.name || node.kind;
    const meta = node.kind === 'property' ? (node.valueType || 'string') : node.kind;
    return { name, meta };
}

function render(state) {
    const host = document.getElementById('diagram-canvas');
    if (!host) {
        return;
    }

    bindPan(host);

    host.innerHTML = '';

    const schema = state?.schema;
    if (!schema || !schema.id) {
        host.innerHTML = '<div class="text-muted small">No schema to display.</div>';
        return;
    }

    const { positions, depthCount, maxCount } = assignPositions(schema);
    const edges = flattenEdges(schema);

    const width = Math.max(1400, maxCount * 250 + 180);
    const height = Math.max(760, depthCount * 170 + 140);

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'diagram-svg');

    const rootPos = positions.get(schema.id);
    if (rootPos) {
        host.dataset.rootX = String(rootPos.x);
        host.dataset.rootY = String(rootPos.y);
    }

    const defs = document.createElementNS(svgNs, 'defs');
    const marker = document.createElementNS(svgNs, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '7');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');

    const arrowPath = document.createElementNS(svgNs, 'path');
    arrowPath.setAttribute('d', 'M0,0 L8,3 L0,6 Z');
    arrowPath.setAttribute('fill', '#a78bcb');

    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    edges.forEach((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) {
            return;
        }

        const line = document.createElementNS(svgNs, 'path');
        const sx = from.x;
        const sy = from.y + 36;
        const tx = to.x;
        const ty = to.y - 36;
        const cy = (sy + ty) / 2;
        line.setAttribute('d', `M ${sx} ${sy} C ${sx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`);
        line.setAttribute('class', 'diagram-edge');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        svg.appendChild(line);
    });

    const allNodes = [];
    collectByDepth(schema).forEach((row) => row.forEach((node) => allNodes.push(node)));

    allNodes.forEach((node) => {
        const pos = positions.get(node.id);
        if (!pos) {
            return;
        }

        const group = document.createElementNS(svgNs, 'g');
        group.setAttribute('class', `diagram-node ${node.kind}`);
        group.setAttribute('data-node-id', node.id);
        group.style.cursor = 'pointer';

        const rect = document.createElementNS(svgNs, 'rect');
        rect.setAttribute('x', String(pos.x - 90));
        rect.setAttribute('y', String(pos.y - 36));
        rect.setAttribute('rx', '10');
        rect.setAttribute('ry', '10');
        rect.setAttribute('width', '180');
        rect.setAttribute('height', '72');

        const labels = nodeLabel(node);

        const textName = document.createElementNS(svgNs, 'text');
        textName.setAttribute('x', String(pos.x));
        textName.setAttribute('y', String(pos.y - 9));
        textName.setAttribute('text-anchor', 'middle');
        textName.setAttribute('class', 'name');
        textName.textContent = labels.name;

        const textMeta = document.createElementNS(svgNs, 'text');
        textMeta.setAttribute('x', String(pos.x));
        textMeta.setAttribute('y', String(pos.y + 16));
        textMeta.setAttribute('text-anchor', 'middle');
        textMeta.setAttribute('class', 'meta');
        textMeta.textContent = `(${labels.meta})`;

        group.appendChild(rect);
        group.appendChild(textName);
        group.appendChild(textMeta);
        svg.appendChild(group);
    });

    host.appendChild(svg);

    if (!host.dataset.initialCentered) {
        requestAnimationFrame(() => {
            centerOnRoot(host);
            host.dataset.initialCentered = 'true';
        });
    }

    if (!host.dataset.boundClicks) {
        host.addEventListener('click', (event) => {
            const target = event.target;
            const nodeGroup = target.closest('[data-node-id]');
            if (!nodeGroup) {
                return;
            }

            const nodeId = nodeGroup.getAttribute('data-node-id');
            if (!nodeId) {
                return;
            }

            setState({ selectedNodeId: nodeId });
            inspectorModal.open(nodeId);
        });
        host.dataset.boundClicks = 'true';
    }
}

const diagramView = { render };

export { diagramView };
