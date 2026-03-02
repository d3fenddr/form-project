const USER_SETTINGS = {
    layout: 'vertical',
    theme: 'light',
    showToolbox: true,
    showTree: true
};

const TYPE_STYLES = {
    string: { icon: 'ti-typography', color: 'primary' },
    number: { icon: 'ti-hash', color: 'success' },
    date: { icon: 'ti-calendar', color: 'info' },
    time: { icon: 'ti-clock', color: 'info' },
    select: { icon: 'ti-list', color: 'warning' },
    checkboxList: { icon: 'ti-checkbox', color: 'warning' },
    boolean: { icon: 'ti-toggle-right', color: 'danger' },
    complex: { icon: 'ti-box', color: 'dark' },
    sys_dictionary: { icon: 'ti-book', color: 'secondary' },
    sys_employee: { icon: 'ti-users', color: 'primary' },
    sys_org_tree: { icon: 'ti-hierarchy', color: 'success' }
};

const UI_SELECTORS = {
    rootWrapper: '#main-wrapper',
    toolboxSidebar: '#toolboxSidebar',
    treeSidebar: '#treeSidebar',
    toggleToolboxBtn: '#toggleToolboxBtn',
    toggleTreeBtn: '#toggleTreeBtn',
    renameTemplateBtn: '#renameTemplateBtn',
    previewJsonBtn: '#previewJsonBtn',
    diagramBtn: '#diagramBtn',
    formTitleDisplay: '#formTitleDisplay',
    mainFormContainer: '#mainFormContainer',
    treeViewContainer: '#treeViewContainer',
    schemaDiagramViewport: '#schemaDiagramViewport',
    schemaDiagramSvg: '#schemaDiagramSvg',
    schemaDiagramZoomIn: '#schemaDiagramZoomIn',
    schemaDiagramZoomOut: '#schemaDiagramZoomOut',
    schemaDiagramReset: '#schemaDiagramReset',
    dragHint: '#dragHint',
    fieldModal: '#fieldConfigModal',
    fieldForm: '#fieldConfigForm',
    optionsBuilderContainer: '#optionsBuilderContainer'
};

const SCHEMA_DIAGRAM_CONFIG = {
    fitPadding: 0.12,
    minZoom: 0.25,
    maxZoom: 8.0,
    initialMinReadableZoom: 4,
    wheelZoomStep: 1.25,
    buttonZoomStep: 1.2,
    dragPanMultiplier: 5,
    nodeWidth: 150,
    nodeHeight: 75,
    titleFontSize: 13,
    metaFontSize: 11,
    horizontalGap: 200,
    verticalGap: 100,
    marginX: 120,
    marginY: 78
};

function createInitialSchema() {
    return {
        title: 'Новый шаблон',
        fields: [
            { id: 'demo_str', type: 'string', label: 'Название компании', required: true, col: 12, canonical: 'C_NAME' },
            {
                id: 'demo_complex',
                type: 'complex',
                label: 'Банковские реквизиты',
                col: 12,
                fields: [
                    { id: 'demo_inn', type: 'string', label: 'ИНН', required: true, col: 6, canonical: 'C_TAX_ID' },
                    { id: 'demo_acc', type: 'number', label: 'Счет', required: false, col: 6 }
                ]
            },
            { id: 'demo_sys', type: 'sys_dictionary', label: 'Регион', required: true, col: 6 }
        ]
    };
}

export { USER_SETTINGS, TYPE_STYLES, UI_SELECTORS, SCHEMA_DIAGRAM_CONFIG, createInitialSchema };
