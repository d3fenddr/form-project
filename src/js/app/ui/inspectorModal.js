import { getState, setState } from '../state.js';
import { findNodeById, updateNode } from '../schema/model.js';

const MODAL_ID = 'node-edit-modal';
const FORM_ID = 'node-edit-form';

let modalInstance = null;
let bound = false;
let currentNodeId = null;

function modalMarkup() {
    return `
<div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Edit node</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <form id="${FORM_ID}" novalidate></form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="save-node">Save</button>
      </div>
    </div>
  </div>
</div>`;
}

function ensureModal() {
    let $modal = $(`#${MODAL_ID}`);
    if ($modal.length === 0) {
        $('body').append(modalMarkup());
        $modal = $(`#${MODAL_ID}`);
    }

    const modalEl = $modal.get(0);
    modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);

    if (!bound) {
        bindEvents($modal);
        bound = true;
    }

    return $modal;
}

function asNullableNumber(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const number = Number(value);
    return Number.isNaN(number) ? null : number;
}

function formGroup({ label, name, type = 'text', value = '', checked = false, placeholder = '', options = null, disabled = false }) {
    if (type === 'checkbox') {
        return `
<div class="form-check mb-3">
  <input class="form-check-input" type="checkbox" id="field-${name}" name="${name}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
  <label class="form-check-label" for="field-${name}">${label}</label>
</div>`;
    }

    if (type === 'select') {
        const optionMarkup = (options || []).map((opt) => {
            const selected = opt.value === value ? 'selected' : '';
            return `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
        }).join('');

        return `
<div class="mb-3">
  <label class="form-label" for="field-${name}">${label}</label>
  <select class="form-select" id="field-${name}" name="${name}" ${disabled ? 'disabled' : ''}>${optionMarkup}</select>
</div>`;
    }

    return `
<div class="mb-3">
  <label class="form-label" for="field-${name}">${label}</label>
  <input class="form-control" id="field-${name}" name="${name}" type="${type}" value="${value ?? ''}" placeholder="${placeholder}" ${disabled ? 'disabled' : ''}>
  ${name === 'name' ? '<div class="invalid-feedback">Name is required and must be unique among sibling nodes.</div>' : ''}
</div>`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function render(node) {
    const $form = $(`#${FORM_ID}`);
    if (!node || $form.length === 0) {
        return;
    }

    const name = escapeHtml(node.name || '');
    const label = escapeHtml(node.meta?.label || '');
    const placeholder = escapeHtml(node.meta?.placeholder || '');
    const defaultValue = escapeHtml(node.meta?.defaultValue ?? '');
    const required = Boolean(node.meta?.required);
    const rulesMin = escapeHtml(node.meta?.rules?.min || '');
    const rulesMax = escapeHtml(node.meta?.rules?.max || '');
    const minItems = node.meta?.array?.minItems ?? '';
    const maxItems = node.meta?.array?.maxItems ?? '';

    let html = '';
    html += formGroup({ label: 'Key', name: 'name', value: name, placeholder: 'Enter key' });
    html += formGroup({ label: 'Title', name: 'meta.label', value: label, placeholder: 'Enter title' });

    if (node.kind === 'property') {
        html += formGroup({
            label: 'Type',
            name: 'valueType',
            type: 'select',
            value: node.valueType || 'string',
            options: [
                { value: 'string', label: 'String' },
                { value: 'number', label: 'Number' },
                { value: 'datetime', label: 'Datetime' },
                { value: 'boolean', label: 'Boolean' }
            ]
        });

        html += formGroup({ label: 'Required', name: 'meta.required', type: 'checkbox', checked: required });
        html += formGroup({ label: 'Placeholder', name: 'meta.placeholder', value: placeholder });
        html += formGroup({ label: 'Default value', name: 'meta.defaultValue', value: defaultValue });

        const showDateRules = (node.valueType || 'string') === 'datetime' ? '' : 'd-none';
        html += `
<div data-datetime-rules class="${showDateRules}">
  ${formGroup({ label: 'Min datetime', name: 'meta.rules.min', type: 'datetime-local', value: rulesMin })}
  ${formGroup({ label: 'Max datetime', name: 'meta.rules.max', type: 'datetime-local', value: rulesMax })}
</div>`;
    }

    if (node.kind === 'object') {
        const isRoot = node.id === getState().schema?.id;
        html += formGroup({ label: 'Required', name: 'meta.required', type: 'checkbox', checked: required, disabled: isRoot });
    }

    if (node.kind === 'array') {
        html += formGroup({ label: 'Required', name: 'meta.required', type: 'checkbox', checked: required });
        html += formGroup({ label: 'Min items', name: 'meta.array.minItems', type: 'number', value: minItems });
        html += formGroup({ label: 'Max items', name: 'meta.array.maxItems', type: 'number', value: maxItems });
    }

    $form.html(html);
}

function readForm() {
    const $form = $(`#${FORM_ID}`);
    if ($form.length === 0) {
        return {};
    }

    const kind = $form.data('node-kind');
    const patch = {
        name: String($form.find('[name="name"]').val() || '').trim(),
        meta: {
            ...($form.data('node-meta') || {}),
            label: String($form.find('[name="meta.label"]').val() || '').trim()
        }
    };

    if (kind === 'property') {
        const valueType = String($form.find('[name="valueType"]').val() || 'string');
        patch.valueType = valueType;
        patch.meta.required = $form.find('[name="meta.required"]').is(':checked');
        patch.meta.placeholder = String($form.find('[name="meta.placeholder"]').val() || '');
        patch.meta.defaultValue = String($form.find('[name="meta.defaultValue"]').val() || '');
        patch.meta.rules = {
            ...($form.data('node-meta')?.rules || {})
        };

        if (valueType === 'datetime') {
            const minValue = String($form.find('[name="meta.rules.min"]').val() || '');
            const maxValue = String($form.find('[name="meta.rules.max"]').val() || '');
            patch.meta.rules.min = minValue || null;
            patch.meta.rules.max = maxValue || null;
        } else {
            delete patch.meta.rules.min;
            delete patch.meta.rules.max;
        }
    }

    if (kind === 'object') {
        const requiredInput = $form.find('[name="meta.required"]');
        if (requiredInput.length > 0 && !requiredInput.is(':disabled')) {
            patch.meta.required = requiredInput.is(':checked');
        }
    }

    if (kind === 'array') {
        patch.meta.required = $form.find('[name="meta.required"]').is(':checked');
        patch.meta.array = {
            ...($form.data('node-meta')?.array || {}),
            minItems: asNullableNumber($form.find('[name="meta.array.minItems"]').val()),
            maxItems: asNullableNumber($form.find('[name="meta.array.maxItems"]').val())
        };
    }

    return patch;
}

function findParentNode(schema, nodeId, parent = null) {
    if (!schema) {
        return null;
    }

    if (schema.id === nodeId) {
        return parent;
    }

    for (const child of schema.children || []) {
        const found = findParentNode(child, nodeId, schema);
        if (found !== null) {
            return found;
        }
    }

    return null;
}

function validateName(name, selectedNodeId) {
    const $nameInput = $(`#${FORM_ID} [name="name"]`);
    const normalized = String(name || '').trim();
    const state = getState();

    let valid = normalized.length > 0;
    if (valid) {
        const parent = findParentNode(state.schema, selectedNodeId);
        if (parent) {
            const duplicate = (parent.children || []).some((child) => {
                return child.id !== selectedNodeId && String(child.name || '').trim() === normalized;
            });
            valid = !duplicate;
        }
    }

    $nameInput.toggleClass('is-invalid', !valid);
    return valid;
}

function handleSave() {
    const state = getState();
    if (!currentNodeId) {
        return;
    }

    const patch = readForm();
    if (!validateName(patch.name, currentNodeId)) {
        return;
    }

    const nextSchema = updateNode(state.schema, currentNodeId, patch);
    if (!nextSchema) {
        return;
    }

    setState({ schema: nextSchema });
    close();
}

function bindEvents($modal) {
    $modal.on('input', `#${FORM_ID} [name="name"]`, (event) => {
        const value = $(event.currentTarget).val();
        validateName(value, currentNodeId);
    });

    $modal.on('change', `#${FORM_ID} [name="valueType"]`, (event) => {
        const value = String($(event.currentTarget).val() || 'string');
        const $rules = $modal.find('[data-datetime-rules]');
        $rules.toggleClass('d-none', value !== 'datetime');
    });

    $modal.on('click', '[data-action="save-node"]', () => {
        handleSave();
    });

    $modal.on('hidden.bs.modal', () => {
        currentNodeId = null;
        $(`#${FORM_ID}`).empty();
    });
}

function open(nodeId) {
    const state = getState();
    const node = findNodeById(state.schema, nodeId);
    if (!node) {
        return;
    }

    currentNodeId = nodeId;
    const $modal = ensureModal();
    const $form = $(`#${FORM_ID}`);
    $form.data('node-kind', node.kind);
    $form.data('node-meta', node.meta || {});
    render(node);
    modalInstance.show();
}

function close() {
    ensureModal();
    modalInstance.hide();
}

const inspectorModal = {
    open,
    close,
    render,
    readForm
};

export { inspectorModal, open, close, render, readForm };
