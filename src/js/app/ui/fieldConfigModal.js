import { UI_SELECTORS } from '../config/builderConfig.js';
import {
    deepClone,
    findFieldByIdDeep,
    replaceFieldDeep,
    createFieldId
} from '../utils/schemaFields.js';

function createFieldConfigModal({ getSchema, setSchema, onAfterSave }) {
    let modalInstance;
    let handlersBound = false;

    function init() {
        modalInstance = new bootstrap.Modal(document.querySelector(UI_SELECTORS.fieldModal));
        bindEvents();
    }

    function bindEvents() {
        if (handlersBound) {
            return;
        }

        $('#addOptionBtn').on('click', () => addOptionRow());

        $(UI_SELECTORS.optionsBuilderContainer).on('click', '[data-action="remove-option"]', function removeOption() {
            $(this).parent().remove();
        });

        $('#saveFieldBtn').on('click', () => saveFieldFromModal());

        $('#conf_str_pattern').on('change', function onPatternChange() {
            if ($(this).val() === 'custom') {
                $('#conf_str_custom_wrap').show();
            } else {
                $('#conf_str_custom_wrap').hide();
            }
        });

        handlersBound = true;
    }

    function addOptionRow(value = '', text = '') {
        const html = `
            <div class="d-flex gap-2 mb-2 option-row">
                <input type="text" class="form-control form-control-sm opt-val" placeholder="Значение (ID)" value="${value}" required>
                <input type="text" class="form-control form-control-sm opt-text" placeholder="Текст (Отображение)" value="${text}" required>
                <button type="button" class="btn btn-sm btn-outline-danger px-3 rounded-pill" data-action="remove-option"><i class="ti ti-trash"></i></button>
            </div>
        `;
        $(UI_SELECTORS.optionsBuilderContainer).append(html);
    }

    function open(type, existingFieldId = null, targetParentId = null) {
        document.querySelector(UI_SELECTORS.fieldForm).reset();
        $('#conf_type').val(type);
        $('#conf_type_display').text(type.toUpperCase());

        $('#conf_target_parent_id').val(targetParentId || '');
        $(UI_SELECTORS.optionsBuilderContainer).empty();

        if (type === 'select' || type === 'checkboxList') {
            addOptionRow();
        }

        $('.setting-section').hide();
        $('.setting-section').each(function toggleSection() {
            const types = String($(this).data('types')).split(',');
            if (types.includes(type)) {
                $(this).show();
            }
        });

        if (existingFieldId) {
            fillEditForm(type, existingFieldId);
        } else {
            fillAddForm();
        }

        modalInstance.show();
    }

    function fillEditForm(type, existingFieldId) {
        $('#conf_mode').val('edit');
        $('#conf_original_id').val(existingFieldId);
        $('#fieldModalTitle').html('<i class="ti ti-pencil text-primary me-2"></i>Редактирование поля');

        const schema = getSchema();
        const field = findFieldByIdDeep(schema.fields, existingFieldId);

        if (!field) {
            return;
        }

        $('#conf_id').val(field.id);
        $('#conf_label').val(field.label);
        $('#conf_col').val(field.col || 12);
        $('#conf_canonical').val(field.canonical || '');
        $('#conf_required').prop('checked', field.required || false);

        if (type === 'string') {
            $('#conf_str_min').val(field.minLength || '');
            $('#conf_str_max').val(field.maxLength || '');
            if (field.pattern && field.pattern !== 'email' && field.pattern !== 'tel') {
                $('#conf_str_pattern').val('custom').trigger('change');
                $('#conf_str_custom_regex').val(field.pattern);
            } else {
                $('#conf_str_pattern').val(field.pattern || '').trigger('change');
            }
            return;
        }

        if (type === 'number') {
            $('#conf_num_min').val(field.min !== undefined ? field.min : '');
            $('#conf_num_max').val(field.max !== undefined ? field.max : '');
            return;
        }

        if (type === 'select' || type === 'checkboxList') {
            $(UI_SELECTORS.optionsBuilderContainer).empty();
            if (field.options && field.options.length) {
                field.options.forEach((opt) => addOptionRow(opt.value, opt.text));
            } else {
                addOptionRow();
            }
            return;
        }

        if (type.startsWith('sys_')) {
            if (field.dictId) {
                $('#conf_sys_dict').val(field.dictId);
            }
            if (field.mode) {
                $('#conf_sys_mode').val(field.mode);
            }
        }
    }

    function fillAddForm() {
        $('#conf_mode').val('add');
        $('#conf_original_id').val('');
        $('#fieldModalTitle').html('<i class="ti ti-plus text-primary me-2"></i>Добавление поля');
        $('#conf_id').val(createFieldId('field'));
    }

    function saveFieldFromModal() {
        const form = document.querySelector(UI_SELECTORS.fieldForm);
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const mode = $('#conf_mode').val();
        const type = $('#conf_type').val();
        const originalId = $('#conf_original_id').val();
        const targetParentId = $('#conf_target_parent_id').val();

        const nextSchema = deepClone(getSchema());
        const fieldData = collectFieldData(mode, type, originalId, nextSchema.fields);

        if (mode === 'add') {
            if (targetParentId) {
                const parentObj = findFieldByIdDeep(nextSchema.fields, targetParentId);
                if (parentObj && parentObj.type === 'complex') {
                    if (!parentObj.fields) {
                        parentObj.fields = [];
                    }
                    parentObj.fields.push(fieldData);
                }
            } else {
                nextSchema.fields.push(fieldData);
            }
        } else {
            replaceFieldDeep(nextSchema.fields, originalId, fieldData);
        }

        setSchema(nextSchema);
        $('.tooltip').remove();
        modalInstance.hide();
        onAfterSave();
    }

    function collectFieldData(mode, type, originalId, schemaFields) {
        const fieldData = {
            id: $('#conf_id').val(),
            type,
            label: $('#conf_label').val(),
            col: parseInt($('#conf_col').val(), 10),
            required: $('#conf_required').is(':checked')
        };

        if ($('#conf_canonical').val()) {
            fieldData.canonical = $('#conf_canonical').val();
        }

        if (type === 'string') {
            if ($('#conf_str_min').val()) {
                fieldData.minLength = parseInt($('#conf_str_min').val(), 10);
            }
            if ($('#conf_str_max').val()) {
                fieldData.maxLength = parseInt($('#conf_str_max').val(), 10);
            }
            const pattern = $('#conf_str_pattern').val();
            if (pattern === 'custom') {
                fieldData.pattern = $('#conf_str_custom_regex').val();
            } else if (pattern) {
                fieldData.pattern = pattern;
            }
            return fieldData;
        }

        if (type === 'number') {
            if ($('#conf_num_min').val() !== '') {
                fieldData.min = parseFloat($('#conf_num_min').val());
            }
            if ($('#conf_num_max').val() !== '') {
                fieldData.max = parseFloat($('#conf_num_max').val());
            }
            return fieldData;
        }

        if (type === 'select' || type === 'checkboxList') {
            fieldData.options = [];
            $('.option-row').each(function collectOption() {
                fieldData.options.push({
                    value: $(this).find('.opt-val').val(),
                    text: $(this).find('.opt-text').val()
                });
            });
            return fieldData;
        }

        if (type === 'complex') {
            fieldData.fields = [];
            if (mode === 'edit') {
                const oldField = findFieldByIdDeep(schemaFields, originalId);
                if (oldField && oldField.fields) {
                    fieldData.fields = oldField.fields;
                }
            }
            return fieldData;
        }

        if (type === 'sys_dictionary') {
            fieldData.dictId = $('#conf_sys_dict').val();
            return fieldData;
        }

        if (type === 'sys_employee' || type === 'sys_org_tree') {
            fieldData.mode = $('#conf_sys_mode').val();
        }

        return fieldData;
    }

    return {
        init,
        open
    };
}

export { createFieldConfigModal };
