import { deepClone, deleteFieldByIdDeep } from '../utils/schemaFields.js';

function showSchemaJsonPreview(schema) {
    Swal.fire({
        title: 'JSON Шаблон',
        html: `<textarea class="form-control bg-body text-body border-secondary" rows="15" readonly style="font-family: monospace; font-size:12px;">${JSON.stringify(schema, null, 2)}</textarea>`,
        width: 680,
        confirmButtonColor: 'var(--bs-primary)',
        background: 'var(--bs-body-bg)',
        color: 'var(--bs-body-color)'
    });
}

function confirmDeleteField({ schema, fieldId, onConfirm }) {
    Swal.fire({
        title: 'Удалить поле?',
        text: `Вы уверены, что хотите удалить поле [${fieldId}]?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--bs-danger)',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена'
    }).then((result) => {
        if (!result.isConfirmed) {
            return;
        }

        const nextSchema = deepClone(schema);
        deleteFieldByIdDeep(nextSchema.fields, fieldId);
        onConfirm(nextSchema);
    });
}

export { showSchemaJsonPreview, confirmDeleteField };
