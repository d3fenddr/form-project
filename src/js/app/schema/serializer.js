/**
 * Serialize the internal schema into a reversible JSON format.
 * @param {Object} schema - The internal schema object.
 * @returns {string} The serialized JSON string.
 */
function serializeSchema(schema) {
    return JSON.stringify(schema, null, 2);
}

export { serializeSchema };