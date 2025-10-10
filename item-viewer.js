document.addEventListener('DOMContentLoaded', () => {
    const itemViewerSection = document.getElementById('itemViewer');
    if (!itemViewerSection) return;

    const itemContainer = document.getElementById('item-viewer-container');
    const loadingText = document.getElementById('item-viewer-loading');
    const searchInput = document.getElementById('item-search');
    let allItems = [];
    let isLoaded = false;

    /**
     * A robust parser for SQL INSERT values using a regular expression.
     * It correctly handles numbers, NULL, and quoted strings.
     */
    function parseSqlValues(valuesString) {
        // This regex finds numbers, 'strings' (handling escaped quotes ''), or NULL, separated by commas.
        const regex = /'((?:[^']|'')*)'|(\d+)|(NULL)/g;
        const values = [];
        let match;
        while ((match = regex.exec(valuesString)) !== null) {
            // match[1] is the captured string, match[2] is the number, match[3] is NULL
            const value = match[1] ?? match[2] ?? match[3];
            values.push(value);
        }
        return values.map(v => {
            if (v === 'NULL' || v === null) return null;
            return isNaN(Number(v)) ? v : Number(v);
        });
    }

    /**
     * Fetches and parses the armor.sql file.
     */
    const loadItems = async () => {
        if (isLoaded) return; // Prevent re-loading

        try {
            const response = await fetch('data/armor.sql');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const sqlText = await response.text();
            const lines = sqlText.split('\n');
            const armorData = [];

            const armorColumns = [
                'id', 'name', 'name_jp', 'type', 'safetolevel', 'ac', 'material', 'weight',
                'invgfx', 'groundgfx', 'item_desc_id', 'dmg_reduction', 'bless', 'trade',
                'cant_delete', 'can_seal', 'class_knight', 'class_elf', 'class_mage',
                'class_darkelf', 'class_dragonknight', 'add_str', 'add_con', 'add_dex',
                'add_int', 'add_wis', 'add_cha', 'add_hp', 'add_mp', 'add_hpr', 'add_mpr',
                'add_sp', 'min_lvl', 'max_lvl', 'm_def', 'haste_item', 'damage_reduction',
                'hit_modifier', 'dmg_modifier', 'bow_hit_modifier', 'bow_dmg_modifier',
                'double_dmg_chance', 'can_enchant', 'unidentified', 'use_royal', 'use_knight',
                'use_elf', 'use_mage', 'use_darkelf', 'use_dragonknight', 'use_illusionist',
                'use_warrior', 'fire_resist', 'water_resist', 'wind_resist', 'earth_resist',
                'stun_resist', 'stone_resist', 'sleep_resist', 'freeze_resist', 'sustain_resist',
                'blind_resist', 'magic_bonus'
            ];

            for (const line of lines) {
                if (line.toUpperCase().startsWith('INSERT INTO `ARMOR` VALUES')) {
                    const valuesString = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
                    const values = parseSqlValues(valuesString);
                    const item = {};
                    armorColumns.forEach((col, index) => {
                        item[col] = values[index];
                    });
                    armorData.push(item);
                }
            }
            allItems = armorData;
            isLoaded = true;
            console.log('[Debug] Item Viewer data loaded.');
            renderItems();
        } catch (error) {
            console.error("Failed to load item data:", error);
            if (loadingText) {
                loadingText.textContent = "Failed to load item data. Please try again later.";
                loadingText.classList.add('text-red-500');
            }
        }
    };

    /**
     * Renders the items based on the current search filter.
     */
    const renderItems = () => {
        if (!itemContainer || !loadingText) return;

        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredItems = searchTerm
            ? allItems.filter(item => item.name.toLowerCase().includes(searchTerm))
            : allItems;

        loadingText.classList.add('hidden');
        itemContainer.innerHTML = '';

        if (filteredItems.length === 0) {
            itemContainer.innerHTML = `<p class="text-center col-span-full">No items match your search.</p>`;
            return;
        }

        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card rounded-lg p-4 flex flex-col gap-3';
            
            let statsHtml = '';
            const addStat = (label, value) => {
                if (value && value != 0) {
                    const sign = typeof value === 'number' && value > 0 ? '+' : '';
                    statsHtml += `<div class="stat-item"><span>${label}:</span> <span class="font-bold text-yellow-300">${sign}${value}</span></div>`;
                }
            };

            addStat('AC', item.ac);
            addStat('STR', item.add_str);
            addStat('DEX', item.add_dex);
            addStat('CON', item.add_con);
            addStat('INT', item.add_int);
            addStat('WIS', item.add_wis);
            addStat('CHA', item.add_cha);
            addStat('HP', item.add_hp);
            addStat('MP', item.add_mp);
            addStat('HP Regen', item.add_hpr);
            addStat('MP Regen', item.add_mpr);
            addStat('MR', item.m_def);
            addStat('SP', item.add_sp);
            addStat('Dmg Reduc', item.damage_reduction);

            const resists = {
                'Fire': item.fire_resist, 'Water': item.water_resist,
                'Wind': item.wind_resist, 'Earth': item.earth_resist,
                'Stun': item.stun_resist, 'Hold': item.sustain_resist,
            };

            for (const [label, value] of Object.entries(resists)) {
                if (value && value != 0) {
                     statsHtml += `<div class="stat-item"><span>${label} Resist:</span> <span class="font-bold text-cyan-300">+${value}%</span></div>`;
                }
            }

            let classHtml = '';
            const classes = {
                'Ro': item.use_royal, 'Kn': item.use_knight, 'El': item.use_elf, 'Ma': item.use_mage,
                'DE': item.use_darkelf, 'DK': item.use_dragonknight, 'Il': item.use_illusionist, 'Wa': item.use_warrior
            };
            
            let usableClasses = [];
            for (const [short, canUse] of Object.entries(classes)) {
                if (canUse === 1) {
                    usableClasses.push(`<span class="text-green-400">${short}</span>`);
                }
            }

            if (usableClasses.length > 0 && usableClasses.length < 8) {
                classHtml = `<div class="text-xs mt-2">Classes: ${usableClasses.join(', ')}</div>`;
            } else {
                classHtml = `<div class="text-xs mt-2 text-gray-400">All Classes</div>`;
            }

            card.innerHTML = `
                <div>
                    <h3 class="text-lg font-bold text-yellow-400">${item.name}</h3>
                    <p class="text-xs text-gray-400">Type: ${item.type} | Weight: ${(item.weight / 1000).toFixed(2)}</p>
                </div>
                ${statsHtml ? `<div class="stat-grid">${statsHtml}</div>` : ''}
                ${classHtml}
            `;
            itemContainer.appendChild(card);
        });
    };

    /**
     * Creates a debounced function that delays invoking func.
     */
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    const initializeItemViewer = async () => {
        await loadItems(); // This will only run once thanks to the isLoaded flag

        if (searchInput) {
            // Ensure listener is only attached once
            if (!searchInput.dataset.listenerAttached) {
                searchInput.addEventListener('input', debounce(renderItems, 300));
                searchInput.dataset.listenerAttached = 'true';
            }
        }
        console.log('[Debug] Item Viewer initialized.');
    };

    // Use a MutationObserver to initialize the item viewer only when it becomes visible.
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class' && !itemViewerSection.classList.contains('hidden')) {
                initializeItemViewer();
            }
        }
    });
    observer.observe(itemViewerSection, { attributes: true });
});