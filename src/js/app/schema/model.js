/**
 * Find a node by its ID in the schema tree.
 * @param {Object} schema - The root schema object.
 * @param {string} id - The ID of the node to find.
 * @returns {Object|null} The node if found, otherwise null.
 */
function findNodeById(schema, id) {
    if (schema.id === id) return schema;
    if (!schema.children) return null;

    for (const child of schema.children) {
        const result = findNodeById(child, id);
        if (result) return result;
    }
    return null;
}

/**
 * Add a child node to a parent node.
 * @param {Object} schema - The root schema object.
 * @param {string} parentId - The ID of the parent node.
 * @param {Object} node - The child node to add.
 * @returns {boolean} True if the child was added, false otherwise.
 */
function addChild(schema, parentId, node) {
    const parent = findNodeById(schema, parentId);
    if (parent && parent.children) {
        parent.children.push(node);
        return true;
    }
    return false;
}

/**
 * Remove a node by its ID.
 * @param {Object} schema - The root schema object.
 * @param {string} nodeId - The ID of the node to remove.
 * @returns {boolean} True if the node was removed, false otherwise.
 */
function removeNode(schema, nodeId) {
    if (!schema.children) return false;

    const index = schema.children.findIndex(child => child.id === nodeId);
    if (index !== -1) {
        schema.children.splice(index, 1);
        return true;
    }

    for (const child of schema.children) {
        if (removeNode(child, nodeId)) return true;
    }
    return false;
}

/**
 * Update a node by its ID with a patch.
 * @param {Object} schema - The root schema object.
 * @param {string} nodeId - The ID of the node to update.
 * @param {Object} patch - The partial data to update the node with.
 * @returns {Object|null} New schema object if node was updated, otherwise null.
 */
function updateNode(schema, nodeId, patch) {
    if (!schema || !nodeId) {
        return null;
    }

    let updated = false;

    function walk(node) {
        if (!node) {
            return node;
        }

        if (node.id === nodeId) {
            updated = true;
            const nextMeta = patch.meta ? { ...(node.meta || {}), ...patch.meta } : node.meta;

            return {
                ...node,
                ...patch,
                ...(patch.meta ? { meta: nextMeta } : {})
            };
        }

        const children = node.children || [];
        if (children.length === 0) {
            return node;
        }

        let anyChildChanged = false;
        const nextChildren = children.map((child) => {
            const nextChild = walk(child);
            if (nextChild !== child) {
                anyChildChanged = true;
            }
            return nextChild;
        });

        if (!anyChildChanged) {
            return node;
        }

        return {
            ...node,
            children: nextChildren
        };
    }

    const nextSchema = walk(schema);
    return updated ? nextSchema : null;
}

/**
 * Move a node up or down within its parent's children.
 * @param {Object} schema - The root schema object.
 * @param {string} nodeId - The ID of the node to move.
 * @param {string} direction - 'up' or 'down'.
 * @returns {boolean} True if the node was moved, false otherwise.
 */
function moveNode(schema, nodeId, direction) {
    if (!['up', 'down'].includes(direction)) return false;

    for (const child of schema.children || []) {
        const index = child.children?.findIndex(c => c.id === nodeId);
        if (index !== undefined && index !== -1) {
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex >= 0 && targetIndex < child.children.length) {
                const [node] = child.children.splice(index, 1);
                child.children.splice(targetIndex, 0, node);
                return true;
            }
        }
        if (moveNode(child, nodeId, direction)) return true;
    }
    return false;
}

export { findNodeById, addChild, removeNode, updateNode, moveNode };