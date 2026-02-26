import { serializeSchema } from '../schema/serializer.js';
import { parseSchema } from '../schema/parser.js';
import { getState, setState } from '../state.js';

const jsonView = {
    /**
     * Render the JSON view based on the state.
     * @param {Object} state - The current application state.
     */
    render(state) {
        const container = document.getElementById('json-editor');
        if (!container) {
            return;
        }

        container.value = serializeSchema(state.schema);
    },

    /**
     * Initialize event listeners for the JSON view.
     */
    init() {
        const container = document.getElementById('json-editor');
        const copyButton = document.getElementById('copy-json');
        const importButton = document.getElementById('import-json');
        const exportButton = document.getElementById('export-json');
        if (!container || !copyButton || !importButton || !exportButton) {
            return;
        }

        copyButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(container.value);
            } catch (error) {
                console.error('Error copying JSON:', error);
            }
        });

        importButton.addEventListener('click', () => {
            try {
                const parsedSchema = parseSchema(container.value);
                if (parsedSchema) {
                    setState({ schema: parsedSchema, selectedNodeId: parsedSchema.id || null });
                } else {
                    alert('Invalid JSON. Please fix errors and try again.');
                }
            } catch (error) {
                console.error('Error importing JSON:', error);
            }
        });

        exportButton.addEventListener('click', () => {
            try {
                const state = getState();
                const json = serializeSchema(state.schema);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'schema.json';
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error exporting JSON:', error);
            }
        });
    }
};

export { jsonView };