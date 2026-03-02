import { TYPE_STYLES, UI_SELECTORS } from '../config/builderConfig.js';
import { parseDOMContainer, deepClone, findFieldByIdDeep, createFieldId } from '../utils/schemaFields.js';

function createBuilderView({ getSchema, setSchema, onSchemaChange, onEdit, onDelete }) {
    let sortableInstances = [];
    let toolboxSortables = [];
    let handlersBound = false;

    function createDefaultFieldByType(type) {
        const safeType = String(type || 'string');
        const baseField = {
            id: createFieldId(safeType),
            type: safeType,
            label: 'Новое поле',
            col: 6,
            required: false
        };

        if (safeType === 'complex') {
            return {
                ...baseField,
                col: 12,
                fields: []
            };
        }

        if (safeType === 'select' || safeType === 'checkboxList') {
            return {
                ...baseField,
                options: []
            };
        }

        if (safeType === 'sys_dictionary') {
            return {
                ...baseField,
                dictId: 'regions_dict'
            };
        }

        if (safeType === 'sys_employee' || safeType === 'sys_org_tree') {
            return {
                ...baseField,
                mode: 'single'
            };
        }

        return baseField;
    }

    function insertFieldByDrop({ fieldType, parentId, dropIndex }) {
        const currentSchema = getSchema();
        const nextSchema = deepClone(currentSchema);
        const nextField = createDefaultFieldByType(fieldType);

        if (parentId) {
            const parentField = findFieldByIdDeep(nextSchema.fields, parentId);
            if (!parentField || parentField.type !== 'complex') {
                return;
            }

            if (!Array.isArray(parentField.fields)) {
                parentField.fields = [];
            }

            const safeIndex = Math.max(0, Math.min(dropIndex, parentField.fields.length));
            parentField.fields.splice(safeIndex, 0, nextField);
        } else {
            const safeIndex = Math.max(0, Math.min(dropIndex, nextSchema.fields.length));
            nextSchema.fields.splice(safeIndex, 0, nextField);
        }

        setSchema(nextSchema);
        if (typeof onSchemaChange === 'function') {
            onSchemaChange(nextSchema, 'add');
        }
        renderAll();
    }

    function renderAll() {
        renderFormCanvas();
        renderTreeView();
        initSortable();
    }

    function renderFormCanvas() {
        const schema = getSchema();
        $(UI_SELECTORS.formTitleDisplay).text(schema.title);

        const container = $(UI_SELECTORS.mainFormContainer);
        container.empty();
        renderFieldsToDOM(schema.fields, container);

        if (schema.fields.length > 0) {
            $(UI_SELECTORS.dragHint).hide();
        } else {
            $(UI_SELECTORS.dragHint).show();
        }
    }

    function renderFieldsToDOM(fields, parentElement) {
        fields.forEach((field) => {
            const colClass = `col-md-${field.col || 12}`;
            const wrapper = $(`<div class="${colClass} field-wrapper bg-body" data-id="${field.id}" data-type="${field.type}"></div>`);

            wrapper.append(`
                <div class="drag-handle"><i class="ti ti-grip-vertical"></i></div>
                <div class="field-actions">
                    <button class="btn btn-sm btn-primary rounded-circle p-2" data-action="edit" data-field-id="${field.id}" title="Редактировать"><i class="ti ti-pencil"></i></button>
                    <button class="btn btn-sm btn-danger rounded-circle p-2" data-action="delete" data-field-id="${field.id}" title="Удалить"><i class="ti ti-trash"></i></button>
                </div>
            `);

            const reqHtml = field.required ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle ms-1">Req</span>' : '';
            const canonHtml = field.canonical ? `<span class="badge bg-primary-subtle text-primary border border-primary-subtle ms-1"><i class="ti ti-database"></i> ${field.canonical}</span>` : '';
            wrapper.append(`<div class="builder-meta mb-2"><span class="badge bg-secondary-subtle text-secondary border">col-${field.col || 12}</span>${canonHtml}${reqHtml}</div>`);

            const style = TYPE_STYLES[field.type] || { icon: 'ti-point', color: 'secondary' };
            let inputHtml = '';

            if (field.type === 'complex') {
                inputHtml = `
                    <div class="complex-object-container w-100 bg-body">
                        <h6 class="fw-bold mb-2 text-${style.color} d-flex align-items-center gap-2">
                            <span class="bg-${style.color}-subtle text-${style.color} p-1 rounded"><i class="ti ${style.icon}"></i></span>
                            ${field.label}
                            <span class="badge bg-light text-secondary border fw-normal ms-auto">ID: ${field.id}</span>
                        </h6>
                        <div class="row sortable-container nested-sortable bg-body-tertiary" data-parent-id="${field.id}"></div>
                    </div>
                `;
                wrapper.append(inputHtml);
                parentElement.append(wrapper);
                renderFieldsToDOM(field.fields || [], wrapper.find('.nested-sortable'));
                return;
            }

            if (field.type === 'boolean') {
                inputHtml = `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" disabled><label class="form-check-label fw-semibold text-${style.color}"><i class="ti ${style.icon}"></i> ${field.label}</label></div>`;
            } else {
                inputHtml = `
                    <label class="form-label fw-semibold text-${style.color}"><i class="ti ${style.icon}"></i> ${field.label}</label>
                    <input type="text" class="form-control bg-body-tertiary" placeholder="${field.type} field..." disabled>
                `;
            }

            wrapper.append(inputHtml);
            parentElement.append(wrapper);
        });
    }

    function renderTreeView() {
        const schema = getSchema();
        const container = $(UI_SELECTORS.treeViewContainer);
        container.empty();

        const rootUl = $('<ul class="tree-ul root-tree"></ul>');
        buildTreeList(schema.fields, rootUl);
        container.append(rootUl);
    }

    function buildTreeList(fields, parentUl) {
        fields.forEach((field) => {
            const style = TYPE_STYLES[field.type] || { icon: 'ti-point', color: 'secondary' };
            const isComplex = field.type === 'complex';

            const li = $(`<li class="tree-li ${isComplex ? 'tree-li-complex' : ''}"></li>`);
            const content = $(`<div class="tree-item-content bg-body" title="Нажмите для редактирования" data-action="edit" data-field-id="${field.id}"></div>`);

            content.append(`
                <div class="tree-icon-wrapper bg-${style.color}-subtle text-${style.color}">
                    <i class="ti ${style.icon} fs-5"></i>
                </div>
            `);
            content.append(`<span class="tree-label text-body">${field.label}</span>`);
            content.append(`<span class="tree-id">${field.id}</span>`);

            li.append(content);

            if (isComplex && field.fields && field.fields.length > 0) {
                const subUl = $('<ul class="tree-ul"></ul>');
                buildTreeList(field.fields, subUl);
                li.append(subUl);
            }

            parentUl.append(li);
        });
    }

    function initSortable() {
        sortableInstances.forEach((inst) => inst.destroy());
        sortableInstances = [];
        toolboxSortables.forEach((inst) => inst.destroy());
        toolboxSortables = [];

        const toolboxGroups = document.querySelectorAll('#toolboxAccordion .accordion-body .d-flex.flex-wrap.gap-2');
        toolboxGroups.forEach((groupElement) => {
            const toolboxInst = new Sortable(groupElement, {
                group: {
                    name: 'toolbox',
                    pull: 'clone',
                    put: false
                },
                sort: false,
                animation: 120,
                draggable: '.toolbox-icon-btn',
                fallbackOnBody: true
            });
            toolboxSortables.push(toolboxInst);
        });

        const containers = document.querySelectorAll('.sortable-container');
        containers.forEach((container) => {
            const inst = new Sortable(container, {
                group: {
                    name: 'shared',
                    pull: true,
                    put: ['shared', 'toolbox']
                },
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.drag-handle',
                fallbackOnBody: true,
                swapThreshold: 0.65,
                onAdd(event) {
                    const fromToolbox = event.from && event.from.closest('#toolboxAccordion');
                    if (!fromToolbox) {
                        return;
                    }

                    const droppedElement = event.item;
                    const fieldType = droppedElement?.dataset?.fieldType;
                    if (!fieldType) {
                        droppedElement?.remove();
                        return;
                    }

                    const parentId = event.to?.dataset?.parentId || null;
                    const dropIndex = Number.isInteger(event.newIndex) ? event.newIndex : 0;

                    droppedElement.remove();
                    insertFieldByDrop({ fieldType, parentId, dropIndex });
                },
                onEnd() {
                    rebuildSchemaFromDOM();
                }
            });
            sortableInstances.push(inst);
        });
    }

    function rebuildSchemaFromDOM() {
        const schema = getSchema();
        const nextSchema = {
            ...schema,
            fields: parseDOMContainer($(UI_SELECTORS.mainFormContainer), schema.fields)
        };
        setSchema(nextSchema);
        if (typeof onSchemaChange === 'function') {
            onSchemaChange(nextSchema, 'reorder');
        }
        renderTreeView();
    }

    function bindContainerEvents() {
        if (handlersBound) {
            return;
        }

        $(`${UI_SELECTORS.mainFormContainer}, ${UI_SELECTORS.treeViewContainer}`).on('click', '[data-action="edit"]', function onEditClick(event) {
            event.preventDefault();
            event.stopPropagation();
            const fieldId = $(this).data('fieldId');
            if (fieldId) {
                onEdit(fieldId);
            }
        });

        $(UI_SELECTORS.mainFormContainer).on('click', '[data-action="delete"]', function onDeleteClick(event) {
            event.preventDefault();
            event.stopPropagation();
            const fieldId = $(this).data('fieldId');
            if (fieldId) {
                onDelete(fieldId);
            }
        });

        handlersBound = true;
    }

    function dispose() {
        sortableInstances.forEach((inst) => inst.destroy());
        sortableInstances = [];
        toolboxSortables.forEach((inst) => inst.destroy());
        toolboxSortables = [];
    }

    return {
        renderAll,
        renderTreeView,
        bindContainerEvents,
        dispose
    };
}

export { createBuilderView };
