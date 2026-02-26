import { v4 as uuidv4 } from '../utils/uuid.js';

/**
 * Create a root object node.
 * @returns {Object} The root object node.
 */
function createRootObject() {
    return {
        id: uuidv4(),
        kind: 'object',
        name: 'root',
        children: [],
        meta: {}
    };
}

/**
 * Create a property node.
 * @returns {Object} The property node.
 */
function createPropertyNode() {
    return {
        id: uuidv4(),
        kind: 'property',
        name: 'property',
        valueType: 'string',
        meta: {
            label: '',
            placeholder: '',
            required: false,
            defaultValue: ''
        }
    };
}

/**
 * Create an object node.
 * @returns {Object} The object node.
 */
function createObjectNode() {
    return {
        id: uuidv4(),
        kind: 'object',
        name: 'object',
        children: [],
        meta: {}
    };
}

/**
 * Create an array node.
 * @returns {Object} The array node.
 */
function createArrayNode() {
    return {
        id: uuidv4(),
        kind: 'array',
        name: 'array',
        children: [],
        meta: {
            minItems: 0,
            maxItems: Infinity
        }
    };
}

export { createRootObject, createPropertyNode, createObjectNode, createArrayNode };