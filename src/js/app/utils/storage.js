const STORAGE_KEY = 'form-builder:state';

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

export { saveState, loadState, resetState };
