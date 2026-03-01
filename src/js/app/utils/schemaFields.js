function deepClone(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function findFieldByIdDeep(fields, targetId) {
    for (let index = 0; index < fields.length; index += 1) {
        const field = fields[index];
        if (field.id === targetId) {
            return field;
        }

        if (field.type === 'complex' && field.fields) {
            const found = findFieldByIdDeep(field.fields, targetId);
            if (found) {
                return found;
            }
        }
    }

    return null;
}

function deleteFieldByIdDeep(fields, targetId) {
    for (let index = 0; index < fields.length; index += 1) {
        const field = fields[index];

        if (field.id === targetId) {
            fields.splice(index, 1);
            return true;
        }

        if (field.type === 'complex' && field.fields) {
            if (deleteFieldByIdDeep(field.fields, targetId)) {
                return true;
            }
        }
    }

    return false;
}

function replaceFieldDeep(fieldsArray, targetId, newFieldObj) {
    for (let index = 0; index < fieldsArray.length; index += 1) {
        const field = fieldsArray[index];

        if (field.id === targetId) {
            fieldsArray[index] = newFieldObj;
            return true;
        }

        if (field.type === 'complex' && field.fields) {
            if (replaceFieldDeep(field.fields, targetId, newFieldObj)) {
                return true;
            }
        }
    }

    return false;
}

function parseDOMContainer(containerElement, sourceFields) {
    const parsedFields = [];

    $(containerElement).children('.field-wrapper').each(function parseOne() {
        const id = $(this).data('id');
        const sourceField = findFieldByIdDeep(sourceFields, id);

        if (!sourceField) {
            return;
        }

        const fieldObj = deepClone(sourceField);
        if (fieldObj.type === 'complex') {
            const nestedContainer = $(this).find('> .complex-object-container > .sortable-container');
            fieldObj.fields = parseDOMContainer(nestedContainer, sourceFields);
        }

        parsedFields.push(fieldObj);
    });

    return parsedFields;
}

function createFieldId(prefix = 'field') {
    const seed = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return `${prefix}_${seed}`;
}

export {
    deepClone,
    findFieldByIdDeep,
    deleteFieldByIdDeep,
    replaceFieldDeep,
    parseDOMContainer,
    createFieldId
};
