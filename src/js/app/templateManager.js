import { saveTemplate, listTemplates, getTemplateById, deleteTemplate } from './utils/storage.js';
import { promptTemplateTitle, showTemplateManager } from './ui/builderActions.js';

function cloneSchema(schema) {
    return JSON.parse(JSON.stringify(schema));
}

function createTemplateManager({ createInitialSchema, getSchema, setSchema, renderAllViews }) {
    let currentTemplateId = null;

    function createEmptyDraftSchema(title = '') {
        return {
            ...createInitialSchema(),
            title,
            fields: []
        };
    }

    function validateUniqueTitle(title, excludeTemplateId = null) {
        const normalizedTitle = String(title || '').trim().toLocaleLowerCase('ru-RU');
        const duplicate = listTemplates().find((template) => {
            const templateTitle = String(template.title || '').trim().toLocaleLowerCase('ru-RU');
            return template.id !== excludeTemplateId && templateTitle === normalizedTitle;
        });

        if (duplicate) {
            return 'Шаблон с таким названием уже существует';
        }

        return null;
    }

    function setCurrentTemplate(template) {
        if (!template || !template.schema) {
            return;
        }

        currentTemplateId = template.id;
        setSchema(cloneSchema(template.schema));
    }

    function init() {
        const templates = listTemplates();
        if (templates.length === 0) {
            currentTemplateId = null;
            setSchema(createEmptyDraftSchema());
            return;
        }

        setCurrentTemplate(templates[0]);
    }

    function createTemplate() {
        promptTemplateTitle(
            'Новый шаблон',
            (nextTitle) => {
                const freshSchema = createEmptyDraftSchema(nextTitle);
                const saveResult = saveTemplate(freshSchema, { title: nextTitle });

                if (!saveResult.success || !saveResult.template) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Ошибка',
                        text: 'Не удалось создать шаблон'
                    });
                    return;
                }

                setCurrentTemplate(saveResult.template);
                renderAllViews();
            },
            (title) => validateUniqueTitle(title, null)
        );
    }

    function editTemplate(templateId) {
        const template = getTemplateById(templateId);
        if (!template || !template.schema) {
            Swal.fire({
                icon: 'warning',
                title: 'Шаблон не найден'
            });
            return;
        }

        setCurrentTemplate(template);
        renderAllViews();
    }

    function deleteTemplateAndSync(templateId) {
        const deleted = deleteTemplate(templateId);
        if (!deleted) {
            return false;
        }

        const remainingTemplates = listTemplates();
        const currentStillExists = remainingTemplates.some((template) => template.id === currentTemplateId);

        if (!currentStillExists) {
            if (remainingTemplates.length > 0) {
                setCurrentTemplate(remainingTemplates[0]);
            } else {
                currentTemplateId = null;
                setSchema(createEmptyDraftSchema());
            }

            renderAllViews();
        }

        return true;
    }

    function openManager() {
        showTemplateManager({
            templates: listTemplates(),
            onCreate: () => createTemplate(),
            onEdit: (templateId) => editTemplate(templateId),
            onDelete: (templateId) => deleteTemplateAndSync(templateId)
        });
    }

    function renameCurrentTemplate() {
        const currentSchema = getSchema();
        promptTemplateTitle(
            currentSchema?.title,
            (nextTitle) => {
                const nextSchema = {
                    ...currentSchema,
                    title: nextTitle
                };

                const saveResult = saveTemplate(nextSchema, {
                    templateId: currentTemplateId,
                    title: nextTitle
                });

                if (!saveResult.success || !saveResult.template) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Ошибка',
                        text: 'Не удалось обновить название шаблона'
                    });
                    return;
                }

                setCurrentTemplate(saveResult.template);
                renderAllViews();
            },
            (title) => validateUniqueTitle(title, currentTemplateId)
        );
    }

    function saveCurrentTemplate(schema) {
        const saveResult = saveTemplate(schema, {
            templateId: currentTemplateId,
            title: schema?.title
        });

        if (!saveResult.success || !saveResult.template) {
            return false;
        }

        currentTemplateId = saveResult.id;
        return true;
    }

    return {
        init,
        openManager,
        createTemplate,
        renameCurrentTemplate,
        saveCurrentTemplate,
        hasActiveTemplate: () => Boolean(currentTemplateId)
    };
}

export { createTemplateManager };
