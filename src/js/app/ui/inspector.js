import { getState, setState } from '../state.js';
import { updateNode, findNodeById } from '../schema/model.js';

const inspector = {
    /**
     * Render the inspector view based on the selected node.
     * @param {Object} state - The current application state.
     */
    render(state) {
        const container = document.getElementById('inspector-container');
        if (!container) {
            return;
        }

        container.innerHTML = '';

        if (!state.selectedNodeId) {
            container.style.display = 'none';
            return;
        }

        const selectedNode = findNodeById(state.schema, state.selectedNodeId);
        if (!selectedNode) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        // Create form elements
        const form = document.createElement('form');

        // Name field
        const nameField = document.createElement('input');
        nameField.type = 'text';
        nameField.value = selectedNode.name || '';
        nameField.placeholder = 'Name';
        nameField.addEventListener('input', (e) => {
            const nextSchema = updateNode(state.schema, selectedNode.id, { name: e.target.value });
            if (nextSchema) {
                setState({ schema: nextSchema });
            }
        });
        form.appendChild(createLabeledField('Name', nameField));

        // Value type field (only for properties)
        if (selectedNode.kind === 'property') {
            const valueTypeField = document.createElement('select');
            ['string', 'number', 'boolean', 'datetime'].forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                if (selectedNode.valueType === type) {
                    option.selected = true;
                }
                valueTypeField.appendChild(option);
            });
            valueTypeField.addEventListener('change', (e) => {
                const nextSchema = updateNode(state.schema, selectedNode.id, { valueType: e.target.value });
                if (nextSchema) {
                    setState({ schema: nextSchema });
                }
            });
            form.appendChild(createLabeledField('Value Type', valueTypeField));
        }

        // Required field
        const requiredField = document.createElement('input');
        requiredField.type = 'checkbox';
        requiredField.checked = selectedNode.meta?.required || false;
        requiredField.addEventListener('change', (e) => {
            const nextSchema = updateNode(state.schema, selectedNode.id, { meta: { ...selectedNode.meta, required: e.target.checked } });
            if (nextSchema) {
                setState({ schema: nextSchema });
            }
        });
        form.appendChild(createLabeledField('Required', requiredField));

        // Label field
        const labelField = document.createElement('input');
        labelField.type = 'text';
        labelField.value = selectedNode.meta?.label || '';
        labelField.placeholder = 'Label';
        labelField.addEventListener('input', (e) => {
            const nextSchema = updateNode(state.schema, selectedNode.id, { meta: { ...selectedNode.meta, label: e.target.value } });
            if (nextSchema) {
                setState({ schema: nextSchema });
            }
        });
        form.appendChild(createLabeledField('Label', labelField));

        // Placeholder field
        const placeholderField = document.createElement('input');
        placeholderField.type = 'text';
        placeholderField.value = selectedNode.meta?.placeholder || '';
        placeholderField.placeholder = 'Placeholder';
        placeholderField.addEventListener('input', (e) => {
            const nextSchema = updateNode(state.schema, selectedNode.id, { meta: { ...selectedNode.meta, placeholder: e.target.value } });
            if (nextSchema) {
                setState({ schema: nextSchema });
            }
        });
        form.appendChild(createLabeledField('Placeholder', placeholderField));

        container.appendChild(form);
    }
};

/**
 * Create a labeled field wrapper.
 * @param {string} labelText - The label text.
 * @param {HTMLElement} field - The input/select element.
 * @returns {HTMLElement} The labeled field wrapper.
 */
function createLabeledField(labelText, field) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('form-group');

    const label = document.createElement('label');
    label.textContent = labelText;
    wrapper.appendChild(label);

    wrapper.appendChild(field);
    return wrapper;
}

export { inspector };