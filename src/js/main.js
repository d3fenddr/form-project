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
    let formBuilderExist = true;
    let offPanelMode = 'tree';

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
        if (!formBuilderExist) {
            return;
        }

        const isDiagram = mode === 'diagram';

        $(UI_SELECTORS.treePanelContent).toggleClass('d-none', isDiagram);
        $(UI_SELECTORS.diagramPanelContent).toggleClass('d-none', !isDiagram);

        $(UI_SELECTORS.rightPanelTitle).text(isDiagram ? 'Диаграмма структуры' : 'Структура объекта');
        $(UI_SELECTORS.rightPanelHint).text(isDiagram ? 'Визуальное представление схемы' : 'Кликните на элемент для редактирования');

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

    function syncDiagramButtonByMode() {
        if (!formBuilderExist) {
            $(UI_SELECTORS.diagramBtn)
                .removeClass('btn-primary')
                .addClass('btn-outline-primary')
                .html(offPanelMode === 'diagram'
                    ? '<i class="ti ti-list-tree"></i> Структура'
                    : '<i class="ti ti-chart-dots-3"></i> Диаграмма');
            return;
        }

        $(UI_SELECTORS.diagramBtn)
            .toggleClass('btn-primary', rightPanelMode === 'diagram')
            .toggleClass('btn-outline-primary', rightPanelMode !== 'diagram')
            .html(rightPanelMode === 'diagram'
                ? '<i class="ti ti-list-tree"></i> Структура'
                : '<i class="ti ti-chart-dots-3"></i> Диаграмма');
    }

    function setOffPanelMode(mode) {
        if (formBuilderExist) {
            return;
        }

        offPanelMode = mode === 'diagram' ? 'diagram' : 'tree';
        const isDiagram = offPanelMode === 'diagram';

        $(UI_SELECTORS.treePanelContent).toggleClass('d-none', isDiagram);
        $(UI_SELECTORS.diagramPanelContent).toggleClass('d-none', !isDiagram);
        $(UI_SELECTORS.rightPanelTitle).text(isDiagram ? 'Диаграмма структуры' : 'Объектная структура');
        $(UI_SELECTORS.rightPanelHint).text(isDiagram ? 'Визуальное представление схемы' : 'Обзор структуры без FormBuilder');

        if (isDiagram) {
            diagram.render();
        }

        syncDiagramButtonByMode();
    }

    function applyFormBuilderExistMode() {
        if (!formBuilderExist) {
            $(UI_SELECTORS.canvasPanel).addClass('d-none');
            $(UI_SELECTORS.treeSidebar).addClass('formbuilder-replaced');
            setOffPanelMode(offPanelMode);
            return;
        }

        $(UI_SELECTORS.canvasPanel).removeClass('d-none');
        $(UI_SELECTORS.treeSidebar).removeClass('formbuilder-replaced');
        setRightPanelMode(rightPanelMode);
        syncDiagramButtonByMode();
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
        isFormBuilderEnabled: () => formBuilderExist,
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
    $(UI_SELECTORS.toggleFormBuilderBtn).on('click', () => {
        formBuilderExist = !formBuilderExist;
        $(UI_SELECTORS.toggleFormBuilderBtn)
            .toggleClass('btn-outline-secondary', formBuilderExist)
            .toggleClass('btn-warning', !formBuilderExist)
            .html(formBuilderExist
                ? '<i class="ti ti-layout"></i> FormBuilder: ON'
                : '<i class="ti ti-layout-off"></i> FormBuilder: OFF');
        applyFormBuilderExistMode();
    });
    $(UI_SELECTORS.templatesBtn).on('click', () => templateManager.openManager());
    $(UI_SELECTORS.createTemplatePageBtn).on('click', () => templateManager.createTemplate());
    $(UI_SELECTORS.renameTemplateBtn).on('click', () => templateManager.renameCurrentTemplate());

    $(UI_SELECTORS.previewJsonBtn).on('click', () => showSchemaJsonPreview(getSchema(), (schema) => templateManager.saveCurrentTemplate(schema)));
    $(UI_SELECTORS.diagramBtn).on('click', () => {
        if (!formBuilderExist) {
            setOffPanelMode(offPanelMode === 'diagram' ? 'tree' : 'diagram');
            return;
        }

        setRightPanelMode(rightPanelMode === 'diagram' ? 'tree' : 'diagram');
        syncDiagramButtonByMode();
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
    syncDiagramButtonByMode();
    renderAllViews();
    applyFormBuilderExistMode();
});
