const STORAGE_KEY = 'form-builder:state';
const TEMPLATE_STORAGE_KEY = 'form-builder:template';
const TEMPLATES_STORAGE_KEY = 'form-builder:templates';

function createTemplateId() {
    return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getRawTemplates() {
    try {
        const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to read templates:', error);
        return [];
    }
}

function writeTemplates(templates) {
    try {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
        return true;
    } catch (error) {
        console.error('Failed to write templates:', error);
        return false;
    }
}

function normalizeTemplateRecord(template) {
    if (!template || typeof template !== 'object' || !template.schema) {
        return null;
    }

    const title = String(template.title || template.schema?.title || 'Новый шаблон').trim() || 'Новый шаблон';

    return {
        id: String(template.id || createTemplateId()),
        title,
        schema: {
            ...template.schema,
            title
        },
        createdAt: template.createdAt || new Date().toISOString(),
        updatedAt: template.updatedAt || new Date().toISOString()
    };
}

function normalizeLoadedState(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    return {
        schema: raw.schema ?? null,
        selectedNodeId: raw.selectedNodeId ?? null,
        formData: raw.formData ?? {}
    };
}

function saveState(state) {
    try {
        const payload = {
            schema: state?.schema ?? null,
            selectedNodeId: state?.selectedNodeId ?? null,
            formData: state?.formData ?? {}
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return true;
    } catch (error) {
        console.error('Failed to save state:', error);
        return false;
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        return normalizeLoadedState(parsed);
    } catch (error) {
        console.error('Failed to load state:', error);
        return null;
    }
}

function resetState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Failed to reset state:', error);
        return false;
    }
}

function listTemplates() {
    const hasTemplatesStorage = localStorage.getItem(TEMPLATES_STORAGE_KEY) !== null;
    const templates = getRawTemplates()
        .map(normalizeTemplateRecord)
        .filter(Boolean)
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    if (templates.length > 0) {
        return templates;
    }

    if (hasTemplatesStorage) {
        return [];
    }

    try {
        const rawLegacy = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (!rawLegacy) {
            return [];
        }

        const parsedLegacy = JSON.parse(rawLegacy);
        const legacySchema = parsedLegacy?.schema ?? null;
        if (!legacySchema) {
            return [];
        }

        const migrated = normalizeTemplateRecord({
            id: createTemplateId(),
            title: legacySchema.title,
            schema: legacySchema,
            createdAt: parsedLegacy.savedAt,
            updatedAt: parsedLegacy.savedAt
        });

        if (!migrated) {
            return [];
        }

        writeTemplates([migrated]);
        return [migrated];
    } catch (error) {
        console.error('Failed to migrate legacy template:', error);
        return [];
    }
}

function saveTemplate(schema, { templateId = null, title = null } = {}) {
    try {
        const templates = listTemplates();
        const nowIso = new Date().toISOString();
        const resolvedTitle = String(title || schema?.title || 'Новый шаблон').trim() || 'Новый шаблон';
        const resolvedSchema = {
            ...(schema || {}),
            title: resolvedTitle
        };

        const existingIndex = templateId
            ? templates.findIndex((template) => template.id === templateId)
            : -1;

        let nextTemplate;
        if (existingIndex >= 0) {
            const current = templates[existingIndex];
            nextTemplate = {
                ...current,
                title: resolvedTitle,
                schema: resolvedSchema,
                updatedAt: nowIso
            };
            templates.splice(existingIndex, 1, nextTemplate);
        } else {
            nextTemplate = {
                id: createTemplateId(),
                title: resolvedTitle,
                schema: resolvedSchema,
                createdAt: nowIso,
                updatedAt: nowIso
            };
            templates.unshift(nextTemplate);
        }

        if (!writeTemplates(templates)) {
            return { success: false, id: null, template: null };
        }

        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify({ schema: resolvedSchema, savedAt: nowIso }));
        return { success: true, id: nextTemplate.id, template: nextTemplate };
    } catch (error) {
        console.error('Failed to save template:', error);
        return { success: false, id: null, template: null };
    }
}

function getTemplateById(templateId) {
    if (!templateId) {
        return null;
    }

    const templates = listTemplates();
    return templates.find((template) => template.id === templateId) || null;
}

function deleteTemplate(templateId) {
    if (!templateId) {
        return false;
    }

    const templates = listTemplates();
    const nextTemplates = templates.filter((template) => template.id !== templateId);
    if (nextTemplates.length === templates.length) {
        return false;
    }

    const success = writeTemplates(nextTemplates);
    if (!success) {
        return false;
    }

    if (nextTemplates.length === 0) {
        localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    }

    return true;
}

function loadTemplate() {
    const templates = listTemplates();
    if (templates.length > 0) {
        return templates[0].schema;
    }

    try {
        const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return parsed.schema ?? null;
    } catch (error) {
        console.error('Failed to load template:', error);
        return null;
    }
}

export { saveState, loadState, resetState, saveTemplate, loadTemplate, listTemplates, getTemplateById, deleteTemplate };
