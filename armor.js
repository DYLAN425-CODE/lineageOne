import { createDataTable } from './table-handler.js';

document.addEventListener('DOMContentLoaded', () => {
    const headers = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'ac', label: 'AC', isNumeric: true },
        { key: 'm_def', label: 'MDef', isNumeric: true },
        { key: 'add_str', label: 'STR', isNumeric: true },
        { key: 'add_con', label: 'CON', isNumeric: true },
        { key: 'add_dex', label: 'DEX', isNumeric: true },
        { key: 'add_int', label: 'INT', isNumeric: true },
        { key: 'add_wis', label: 'WIS', isNumeric: true },
        { key: 'add_cha', label: 'CHA', isNumeric: true },
        { key: 'add_hp', label: 'HP', isNumeric: true },
        { key: 'add_mp', label: 'MP', isNumeric: true },
        { key: 'add_sp', label: 'SP', isNumeric: true },
        { key: 'hit_rate', label: 'Hit Rate', isNumeric: true },
        { key: 'dmg_rate', label: 'Dmg Rate', isNumeric: true },
        { key: 'damage_reduction', label: 'Dmg Reduction', isNumeric: true },
        { key: 'weight_reduction', label: 'Weight Reduction', isNumeric: true },
        { key: 'weight', label: 'Weight', isNumeric: true },
        { key: 'grade', label: 'Grade' },
        { key: 'safenchant', label: 'Safe Enchant', isNumeric: true },
    ];

    createDataTable({
        tableId: 'armorTable',
        searchInputId: 'armor-search',
        dataUrl: 'data/armor.csv', // Use actual CSV from data/
        headers: headers,
        defaultSortColumn: 'name'
    });
});