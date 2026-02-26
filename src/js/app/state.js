// State management module
const state = {
    schema: {},
    selectedNodeId: null,
    formData: {},
    ui: {
        expandedNodeIds: []
    },
    subscribers: []
};

/**
 * Get the current state.
 * @returns {Object} The current state.
 */
function getState() {
    return { ...state, subscribers: undefined }; // Exclude subscribers from the returned state
}

/**
 * Update the state with a patch and notify subscribers.
 * @param {Object} patch - Partial state to update.
 */
function setState(patch) {
    Object.assign(state, patch);
    notifySubscribers();
}

/**
 * Subscribe to state changes.
 * @param {Function} callback - Function to call when state changes.
 */
function subscribe(callback) {
    if (typeof callback === 'function') {
        state.subscribers.push(callback);
    }
}

/**
 * Notify all subscribers of state changes.
 */
function notifySubscribers() {
    const currentState = getState();
    state.subscribers.forEach(callback => callback(currentState));
}

// Export the state management functions
export { getState, setState, subscribe };