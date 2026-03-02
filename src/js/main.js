import { USER_SETTINGS, UI_SELECTORS, createInitialSchema } from './app/config/builderConfig.js';
import { createBuilderView } from './app/ui/builderView.js';
import { createFieldConfigModal } from './app/ui/fieldConfigModal.js';
import { createSchemaDiagramWidget } from './app/ui/diagramView.js';
import { showSchemaJsonPreview, confirmDeleteField } from './app/ui/builderActions.js';
import { findFieldByIdDeep } from './app/utils/schemaFields.js';
import { applySettings, togglePanel } from './app/ui/layoutControls.js';
import { createTemplateManager } from './app/templateManager.js';

let formSchema = createInitialSchema();

function getSchema() {
    return formSchema;
}

function setSchema(nextSchema) {
    formSchema = nextSchema;
}

$(document).ready(() => {
    let modal;
    let rightPanelMode = 'tree';

    const diagram = createSchemaDiagramWidget({
        getSchema,
        onNodeClick: (fieldId) => {
            const field = findFieldByIdDeep(getSchema().fields, fieldId);
            if (field && modal) {
                modal.open(field.type, field.id);
            }
        }
    });

    function setRightPanelMode(mode) {
        const isDiagram = mode === 'diagram';

        $('#treePanelContent').toggleClass('d-none', isDiagram);
        $('#diagramPanelContent').toggleClass('d-none', !isDiagram);

        $('#rightPanelTitle').text(isDiagram ? 'Диаграмма структуры' : 'Структура объекта');
        $('#rightPanelHint').text(isDiagram ? 'Визуальное представление схемы' : 'Кликните на элемент для редактирования');

        $(UI_SELECTORS.diagramBtn)
            .toggleClass('btn-primary', isDiagram)
            .toggleClass('btn-outline-primary', !isDiagram)
            .html(isDiagram
                ? '<i class="ti ti-list-tree"></i> Структура'
                : '<i class="ti ti-chart-dots-3"></i> Диаграмма');

        rightPanelMode = isDiagram ? 'diagram' : 'tree';

        if (isDiagram) {
            diagram.render();
        }
    }

    const view = createBuilderView({
        getSchema,
        setSchema,
        onSchemaChange: () => {
            if (rightPanelMode === 'diagram') {
                diagram.render();
            }
        },
        onEdit: (fieldId) => {
            const field = findFieldByIdDeep(getSchema().fields, fieldId);
            if (field) {
                modal.open(field.type, field.id);
            }
        },
        onDelete: (fieldId) => {
            confirmDeleteField({
                schema: getSchema(),
                fieldId,
                onConfirm: (nextSchema) => {
                    setSchema(nextSchema);
                    $('.tooltip').remove();
                    renderAllViews();
                }
            });
        }
    });

    modal = createFieldConfigModal({
        getSchema,
        setSchema,
        onAfterSave: () => renderAllViews()
    });

    const templateManager = createTemplateManager({
        createInitialSchema,
        getSchema,
        setSchema,
        renderAllViews
    });

    function syncTemplateEditingState() {
        const hasActiveTemplate = templateManager.hasActiveTemplate();

        $(UI_SELECTORS.noTemplateState).toggleClass('d-none', hasActiveTemplate);
        $(UI_SELECTORS.mainFormContainer).toggleClass('d-none', !hasActiveTemplate);
        $(UI_SELECTORS.dragHint).toggleClass('d-none', !hasActiveTemplate);
        $(UI_SELECTORS.renameTemplateBtn).toggleClass('d-none', !hasActiveTemplate);

        $(UI_SELECTORS.previewJsonBtn).prop('disabled', !hasActiveTemplate);
        $(UI_SELECTORS.renameTemplateBtn).prop('disabled', !hasActiveTemplate);

        $('.toolbox-icon-btn').prop('disabled', !hasActiveTemplate);
    }

    function renderAllViews() {
        view.renderAll();
        syncTemplateEditingState();
        if (rightPanelMode === 'diagram') {
            diagram.render();
        }
    }

    modal.init();
    applySettings(USER_SETTINGS);

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].forEach((tooltipEl) => new bootstrap.Tooltip(tooltipEl));

    $(UI_SELECTORS.toggleToolboxBtn).on('click', () => togglePanel('sidebar'));
    $(UI_SELECTORS.toggleTreeBtn).on('click', () => togglePanel('tree'));
    $(UI_SELECTORS.templatesBtn).on('click', () => templateManager.openManager());
    $(UI_SELECTORS.createTemplatePageBtn).on('click', () => templateManager.createTemplate());
    $(UI_SELECTORS.renameTemplateBtn).on('click', () => templateManager.renameCurrentTemplate());

    $(UI_SELECTORS.previewJsonBtn).on('click', () => showSchemaJsonPreview(getSchema(), (schema) => templateManager.saveCurrentTemplate(schema)));
    $(UI_SELECTORS.diagramBtn).on('click', () => {
        setRightPanelMode(rightPanelMode === 'diagram' ? 'tree' : 'diagram');
    });

    $('.toolbox-icon-btn').on('click', function onToolboxClick() {
        const type = $(this).data('fieldType');
        if (type) {
            modal.open(type);
        }
    });

    view.bindContainerEvents();
    templateManager.init();
    setRightPanelMode('tree');
    renderAllViews();
});
