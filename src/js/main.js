import { USER_SETTINGS, UI_SELECTORS, createInitialSchema } from './app/config/builderConfig.js';
import { createBuilderView } from './app/ui/builderView.js';
import { createFieldConfigModal } from './app/ui/fieldConfigModal.js';
import { createSchemaDiagramWidget } from './app/ui/diagramView.js';
import { showSchemaJsonPreview, confirmDeleteField } from './app/ui/builderActions.js';
import { findFieldByIdDeep } from './app/utils/schemaFields.js';
import { applySettings, togglePanel } from './app/ui/layoutControls.js';

let formSchema = createInitialSchema();

function getSchema() {
    return formSchema;
}

function setSchema(nextSchema) {
    formSchema = nextSchema;
}

$(document).ready(() => {
    let modal;

    const diagram = createSchemaDiagramWidget({
        getSchema,
        onNodeClick: (fieldId) => {
            const field = findFieldByIdDeep(getSchema().fields, fieldId);
            if (field && modal) {
                modal.open(field.type, field.id);
            }
        }
    });

    const view = createBuilderView({
        getSchema,
        setSchema,
        onSchemaChange: () => {
            diagram.render();
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

    function renderAllViews() {
        view.renderAll();
        diagram.render();
    }

    modal.init();
    applySettings(USER_SETTINGS);

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].forEach((tooltipEl) => new bootstrap.Tooltip(tooltipEl));

    $(UI_SELECTORS.toggleToolboxBtn).on('click', () => togglePanel('sidebar'));
    $(UI_SELECTORS.toggleTreeBtn).on('click', () => togglePanel('tree'));

    $(UI_SELECTORS.previewJsonBtn).on('click', () => showSchemaJsonPreview(getSchema()));
    $(UI_SELECTORS.saveTemplateBtn).on('click', () => showSchemaJsonPreview(getSchema()));

    $('.toolbox-icon-btn').on('click', function onToolboxClick() {
        const type = $(this).data('fieldType');
        if (type) {
            modal.open(type);
        }
    });

    view.bindContainerEvents();
    renderAllViews();
});
