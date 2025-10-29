import { createDataTable } from './table-handler.js';

document.addEventListener('DOMContentLoaded', () => {
    const headers = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'dmg_small', label: 'Dmg (S)', isNumeric: true },
        { key: 'dmg_large', label: 'Dmg (L)', isNumeric: true },
        { key: 'add_str', label: 'STR', isNumeric: true },
        { key: 'add_con', label: 'CON', isNumeric: true },
        { key: 'add_dex', label: 'DEX', isNumeric: true },
        { key: 'add_int', label: 'INT', isNumeric: true },
        { key: 'add_wis', label: 'WIS', isNumeric: true },
        { key: 'add_cha', label: 'CHA', isNumeric: true },
        { key: 'add_hp', label: 'HP', isNumeric: true },
        { key: 'add_mp', label: 'MP', isNumeric: true },
        { key: 'add_mpr', label: 'MPR', isNumeric: true },
        { key: 'add_sp', label: 'SP', isNumeric: true },
        { key: 'add_hit', label: 'Hit Bonus', isNumeric: true },
        { key: 'add_dmg', label: 'Dmg Bonus', isNumeric: true },
        { key: 'weight', label: 'Weight', isNumeric: true },
        { key: 'grade', label: 'Grade' },
        { key: 'safenchant', label: 'Safe Enchant', isNumeric: true },
    ];

    createDataTable({
        tableId: 'weaponTable',
        searchInputId: 'weapon-search',
        dataUrl: 'data/weapon.csv',
        headers: headers,
        defaultSortColumn: 'name'
    });
});