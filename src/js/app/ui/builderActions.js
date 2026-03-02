import { deepClone, deleteFieldByIdDeep } from '../utils/schemaFields.js';
import { saveTemplate } from '../utils/storage.js';

function showSchemaJsonPreview(schema) {
    Swal.fire({
        title: 'JSON Шаблон',
        html: `<textarea class="form-control bg-body text-body border-secondary" rows="15" readonly style="font-family: monospace; font-size:12px;">${JSON.stringify(schema, null, 2)}</textarea>`,
        width: 680,
        showCancelButton: true,
        confirmButtonText: 'Сохранить шаблон',
        cancelButtonText: 'Закрыть',
        confirmButtonColor: 'var(--bs-primary)',
        background: 'var(--bs-body-bg)',
        color: 'var(--bs-body-color)',
        preConfirm: () => {
            const success = saveTemplate(schema);
            if (!success) {
                Swal.showValidationMessage('Не удалось сохранить шаблон в браузере');
                return false;
            }

            return true;
        }
    }).then((result) => {
        if (!result.isConfirmed) {
            return;
        }

        Swal.fire({
            icon: 'success',
            title: 'Шаблон сохранён',
            text: 'Шаблон сохранён локально в браузере',
            timer: 1300,
            showConfirmButton: false,
            background: 'var(--bs-body-bg)',
            color: 'var(--bs-body-color)'
        });
    });
}

function promptTemplateTitle(currentTitle, onConfirm) {
    Swal.fire({
        title: 'Название шаблона',
        input: 'text',
        inputLabel: 'Введите новое название',
        inputValue: currentTitle || '',
        inputPlaceholder: 'Например: Анкета клиента',
        showCancelButton: true,
        confirmButtonText: 'Сохранить',
        cancelButtonText: 'Отмена',
        confirmButtonColor: 'var(--bs-primary)',
        background: 'var(--bs-body-bg)',
        color: 'var(--bs-body-color)',
        inputValidator: (value) => {
            const nextTitle = String(value || '').trim();
            if (!nextTitle) {
                return 'Название не может быть пустым';
            }

            return undefined;
        }
    }).then((result) => {
        if (!result.isConfirmed) {
            return;
        }

        const nextTitle = String(result.value || '').trim();
        if (!nextTitle) {
            return;
        }

        if (typeof onConfirm === 'function') {
            onConfirm(nextTitle);
        }
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

export { showSchemaJsonPreview, confirmDeleteField, promptTemplateTitle };
