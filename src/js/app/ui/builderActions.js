import { deepClone, deleteFieldByIdDeep } from '../utils/schemaFields.js';

function showSchemaJsonPreview(schema, onSaveTemplate) {
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
            const success = typeof onSaveTemplate === 'function' ? onSaveTemplate(schema) : true;
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

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getEmptyTemplatesHtml() {
    return `
        <div class="d-flex justify-content-center py-4">
            <button type="button" class="btn btn-outline-primary" id="createTemplateBtnEmpty">
                <i class="ti ti-plus"></i> Создать шаблон
            </button>
        </div>
    `;
}

function showTemplateManager({ templates, onCreate, onEdit, onDelete }) {
    const hasTemplates = Array.isArray(templates) && templates.length > 0;
    const listHtml = hasTemplates
        ? templates
            .map((template) => `
                <div class="d-flex align-items-center justify-content-between border rounded-3 p-2 mb-2" data-template-row="${template.id}">
                    <div class="pe-2 text-start">
                        <div class="fw-semibold">${escapeHtml(template.title || 'Без названия')}</div>
                    </div>
                    <div class="d-flex gap-2 flex-shrink-0">
                        <button type="button" class="btn btn-sm btn-outline-primary" data-action="edit-template" data-template-id="${template.id}">Редактировать</button>
                        <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-template" data-template-id="${template.id}">Удалить</button>
                    </div>
                </div>
            `)
            .join('')
        : getEmptyTemplatesHtml();

    Swal.fire({
        title: 'Шаблоны',
        width: 760,
        showConfirmButton: false,
        showCloseButton: true,
        background: 'var(--bs-body-bg)',
        color: 'var(--bs-body-color)',
        html: `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="small text-secondary">Выберите шаблон для редактирования или удалите ненужный.</div>
                <button type="button" class="btn btn-sm btn-primary" id="createTemplateBtn">
                    <i class="ti ti-plus"></i> Добавить шаблон
                </button>
            </div>
            <div id="templatesListContainer">${listHtml}</div>
        `,
        didOpen: () => {
            const popup = Swal.getPopup();
            if (!popup) {
                return;
            }

            popup.querySelector('#createTemplateBtn')?.addEventListener('click', () => {
                Swal.close();
                if (typeof onCreate === 'function') {
                    onCreate();
                }
            });

            popup.querySelector('#createTemplateBtnEmpty')?.addEventListener('click', () => {
                Swal.close();
                if (typeof onCreate === 'function') {
                    onCreate();
                }
            });

            popup.querySelectorAll('[data-action="edit-template"]').forEach((button) => {
                button.addEventListener('click', () => {
                    const templateId = button.getAttribute('data-template-id');
                    Swal.close();
                    if (templateId && typeof onEdit === 'function') {
                        onEdit(templateId);
                    }
                });
            });

            popup.querySelectorAll('[data-action="delete-template"]').forEach((button) => {
                button.addEventListener('click', () => {
                    const templateId = button.getAttribute('data-template-id');
                    if (!templateId || typeof onDelete !== 'function') {
                        return;
                    }

                    const deleted = onDelete(templateId);
                    if (!deleted) {
                        return;
                    }

                    const row = popup.querySelector(`[data-template-row="${templateId}"]`);
                    row?.remove();

                    const listContainer = popup.querySelector('#templatesListContainer');
                    if (listContainer && !listContainer.querySelector('[data-template-row]')) {
                        listContainer.innerHTML = getEmptyTemplatesHtml();
                        listContainer.querySelector('#createTemplateBtnEmpty')?.addEventListener('click', () => {
                            Swal.close();
                            if (typeof onCreate === 'function') {
                                onCreate();
                            }
                        });
                    }
                });
            });
        }
    });
}

function promptTemplateTitle(currentTitle, onConfirm, validateTitle) {
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

            if (typeof validateTitle === 'function') {
                const validationMessage = validateTitle(nextTitle);
                if (validationMessage) {
                    return validationMessage;
                }
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

export { showSchemaJsonPreview, confirmDeleteField, promptTemplateTitle, showTemplateManager };
