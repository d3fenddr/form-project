import { getState, setState } from '../state.js';

function cloneValue(value) {
    if (Array.isArray(value)) {
        return value.map(cloneValue);
    }

    if (value && typeof value === 'object') {
        return Object.keys(value).reduce((acc, key) => {
            acc[key] = cloneValue(value[key]);
            return acc;
        }, {});
    }

    return value;
}

function getAtPath(source, path) {
    return path.reduce((acc, segment) => {
        if (acc === undefined || acc === null) {
            return undefined;
        }

        return acc[segment];
    }, source);
}

function setAtPath(source, path, value) {
    if (path.length === 0) {
        return value;
    }

    const root = cloneValue(source ?? {});
    let cursor = root;

    for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        const nextKey = path[i + 1];
        const existing = cursor[key];

        if (existing === undefined || existing === null) {
            cursor[key] = typeof nextKey === 'number' ? [] : {};
        } else {
            cursor[key] = cloneValue(existing);
        }

        cursor = cursor[key];
    }

    cursor[path[path.length - 1]] = value;
    return root;
}

function removeArrayIndex(source, arrayPath, index) {
    const root = cloneValue(source ?? {});
    const targetArray = getAtPath(root, arrayPath);

    if (!Array.isArray(targetArray)) {
        return root;
    }

    targetArray.splice(index, 1);
    return root;
}

function defaultValueForNode(node) {
    if (!node) {
        return null;
    }

    if (node.kind === 'property') {
        if (node.meta && Object.prototype.hasOwnProperty.call(node.meta, 'defaultValue')) {
            return cloneValue(node.meta.defaultValue);
        }

        if (node.valueType === 'number') {
            return '';
        }

        if (node.valueType === 'boolean') {
            return false;
        }

        return '';
    }

    if (node.kind === 'object') {
        return (node.children || []).reduce((acc, child) => {
            const childName = child.name || 'field';
            acc[childName] = defaultValueForNode(child);
            return acc;
        }, {});
    }

    if (node.kind === 'array') {
        return [];
    }

    return null;
}

function pathToKey(path) {
    return JSON.stringify(path);
}

function keyToPath(key) {
    try {
        const parsed = JSON.parse(key);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function createPropertyControl(node, path, formData) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-3';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = node.meta?.label || node.name || 'Field';
    wrapper.appendChild(label);

    const pathKey = pathToKey(path);
    const currentValue = getAtPath(formData, path);

    if (node.valueType === 'boolean') {
        const checkWrap = document.createElement('div');
        checkWrap.className = 'form-check';

        const input = document.createElement('input');
        input.className = 'form-check-input';
        input.type = 'checkbox';
        input.checked = Boolean(currentValue);
        input.setAttribute('data-field-path', pathKey);
        input.setAttribute('data-value-type', 'boolean');

        const checkLabel = document.createElement('label');
        checkLabel.className = 'form-check-label';
        checkLabel.textContent = node.meta?.placeholder || 'Enabled';

        checkWrap.appendChild(input);
        checkWrap.appendChild(checkLabel);
        wrapper.appendChild(checkWrap);
        return wrapper;
    }

    const input = document.createElement('input');
    input.className = 'form-control';
    input.setAttribute('data-field-path', pathKey);
    input.setAttribute('data-value-type', node.valueType || 'string');
    input.placeholder = node.meta?.placeholder || '';

    if (node.valueType === 'number') {
        input.type = 'number';
        input.value = currentValue ?? '';
    } else if (node.valueType === 'datetime') {
        input.type = 'datetime-local';
        input.value = currentValue ?? '';
    } else {
        input.type = 'text';
        input.value = currentValue ?? '';
    }

    wrapper.appendChild(input);
    return wrapper;
}

function renderNode(node, path, formData) {
    if (!node) {
        return document.createElement('div');
    }

    if (node.kind === 'property') {
        return createPropertyControl(node, path, formData);
    }

    if (node.kind === 'object') {
        const card = document.createElement('div');
        card.className = 'card mb-3';

        const body = document.createElement('div');
        body.className = 'card-body';

        const title = document.createElement('h6');
        title.className = 'card-title';
        title.textContent = node.meta?.label || node.name || 'Object';
        body.appendChild(title);

        (node.children || []).forEach((child) => {
            const childName = child.name || 'field';
            const childPath = [...path, childName];
            body.appendChild(renderNode(child, childPath, formData));
        });

        card.appendChild(body);
        return card;
    }

    if (node.kind === 'array') {
        const wrapper = document.createElement('div');
        wrapper.className = 'card mb-3';

        const body = document.createElement('div');
        body.className = 'card-body';

        const title = document.createElement('h6');
        title.className = 'card-title';
        title.textContent = node.meta?.label || node.name || 'Array';
        body.appendChild(title);

        const arrayPathKey = pathToKey(path);
        const items = getAtPath(formData, path);
        const safeItems = Array.isArray(items) ? items : [];
        const itemTemplate = (node.children || [])[0] || null;

        safeItems.forEach((_, index) => {
            const itemWrap = document.createElement('div');
            itemWrap.className = 'border rounded p-2 mb-2';

            const itemPath = [...path, index];
            itemWrap.appendChild(renderNode(itemTemplate, itemPath, formData));

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-outline-danger btn-sm mt-2';
            removeBtn.textContent = 'Remove item';
            removeBtn.setAttribute('data-array-remove', arrayPathKey);
            removeBtn.setAttribute('data-array-index', String(index));
            itemWrap.appendChild(removeBtn);

            body.appendChild(itemWrap);
        });

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-outline-primary btn-sm';
        addBtn.textContent = 'Add item';
        addBtn.setAttribute('data-array-add', arrayPathKey);
        body.appendChild(addBtn);

        wrapper.appendChild(body);
        return wrapper;
    }

    return document.createElement('div');
}

let handlersBound = false;

function bindHandlersOnce() {
    if (handlersBound) {
        return;
    }

    const container = document.getElementById('form-preview');
    if (!container) {
        return;
    }

    container.addEventListener('input', (event) => {
        const field = event.target.closest('[data-field-path]');
        if (!field) {
            return;
        }

        const current = getState();
        const path = keyToPath(field.getAttribute('data-field-path'));
        const valueType = field.getAttribute('data-value-type');

        let nextValue;
        if (valueType === 'number') {
            nextValue = field.value === '' ? '' : Number(field.value);
        } else if (valueType === 'boolean') {
            nextValue = Boolean(field.checked);
        } else {
            nextValue = field.value;
        }

        const nextFormData = setAtPath(current.formData, path, nextValue);
        setState({ formData: nextFormData });
    });

    container.addEventListener('click', (event) => {
        const addButton = event.target.closest('[data-array-add]');
        if (addButton) {
            const current = getState();
            const path = keyToPath(addButton.getAttribute('data-array-add'));
            const nodePathParent = path[path.length - 1];

            const templateNode = (function findTemplateNode(schemaNode, targetPath, depth = 0) {
                if (!schemaNode) {
                    return null;
                }

                if (depth === targetPath.length) {
                    return schemaNode;
                }

                const segment = targetPath[depth];
                if (schemaNode.kind === 'object') {
                    const nextNode = (schemaNode.children || []).find((child) => (child.name || 'field') === segment);
                    return findTemplateNode(nextNode, targetPath, depth + 1);
                }

                if (schemaNode.kind === 'array' && typeof segment === 'number') {
                    return findTemplateNode((schemaNode.children || [])[0], targetPath, depth + 1);
                }

                return null;
            }(current.schema, path));

            const arrayNode = templateNode && templateNode.kind === 'array' ? templateNode : null;
            const itemTemplate = arrayNode ? (arrayNode.children || [])[0] : null;
            const existing = getAtPath(current.formData, path);
            const items = Array.isArray(existing) ? [...existing] : [];
            items.push(defaultValueForNode(itemTemplate));

            const nextFormData = setAtPath(current.formData, path, items);
            setState({ formData: nextFormData, selectedNodeId: current.selectedNodeId ?? nodePathParent });
            return;
        }

        const removeButton = event.target.closest('[data-array-remove]');
        if (!removeButton) {
            return;
        }

        const current = getState();
        const path = keyToPath(removeButton.getAttribute('data-array-remove'));
        const index = Number(removeButton.getAttribute('data-array-index'));

        if (!Number.isInteger(index) || index < 0) {
            return;
        }

        const nextFormData = removeArrayIndex(current.formData, path, index);
        setState({ formData: nextFormData });
    });

    handlersBound = true;
}

const formPreview = {
    render(state) {
        const container = document.getElementById('form-preview');
        if (!container) {
            return;
        }

        bindHandlersOnce();
        container.innerHTML = '';

        if (!state.schema || state.schema.kind !== 'object') {
            container.innerHTML = '<div class="text-muted">Schema preview unavailable</div>';
            return;
        }

        const view = renderNode(state.schema, [], state.formData || {});
        container.appendChild(view);
    }
};

export { formPreview };