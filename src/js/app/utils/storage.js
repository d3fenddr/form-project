const STORAGE_KEY = 'form-builder:state';
const TEMPLATE_STORAGE_KEY = 'form-builder:template';

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

function saveTemplate(schema) {
    try {
        const payload = {
            schema: schema ?? null,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
        return true;
    } catch (error) {
        console.error('Failed to save template:', error);
        return false;
    }
}

function loadTemplate() {
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

export { saveState, loadState, resetState, saveTemplate, loadTemplate };
