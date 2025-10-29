import { createDataTable } from './table-handler.js';

document.addEventListener('DOMContentLoaded', () => {
    // This formatter is now more robust. It checks if it receives the whole item object
    // or just the value, and correctly formats '1' as 'Yes' and other values as 'No'.
    const booleanFormatter = (itemOrValue, headerKey) => {
        const value = (typeof itemOrValue === 'object' && itemOrValue !== null) ? itemOrValue[headerKey] : itemOrValue;
        return value == 1 ? 'Yes' : 'No';
    };

    const headers = [
        { key: 'name', label: 'Name' },
        { key: 'item_type', label: 'Item Type' },
        { key: 'material', label: 'Material' },
        { key: 'weight', label: 'Weight', isNumeric: true },
        { key: 'stackable', label: 'Stackable', formatter: (item) => booleanFormatter(item, 'stackable') },
        { key: 'trade', label: 'Tradeable', formatter: (item) => booleanFormatter(item, 'trade'), isNumeric: true },
        { key: 'cant_delete', label: 'No Delete', formatter: (item) => booleanFormatter(item, 'cant_delete'), isNumeric: true },
        { key: 'dmg_small', label: 'Dmg (S)', isNumeric: true },
        { key: 'dmg_large', label: 'Dmg (L)', isNumeric: true },
        { key: 'min_lvl', label: 'Min Lvl', isNumeric: true },
        { key: 'max_lvl', label: 'Max Lvl', isNumeric: true },
    ];

    createDataTable({
        tableId: 'etcitemTable',
        searchInputId: 'etcitem-search',
        dataUrl: 'data/etcitem.csv',
        headers: headers,
        defaultSortColumn: 'name',
        primaryKeys: ['weight', 'stackable', 'trade']
    });
});