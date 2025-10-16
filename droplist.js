document.addEventListener('DOMContentLoaded', async () => {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    /**
     * Fetches and parses the server.properties file.
     * This function is copied here to make this script self-contained.
     * @returns {Promise<object>} A promise that resolves to an object with the server properties.
     */
    async function loadServerProperties() {
        const defaultProps = {
            DROPLIST_ITEMS_PER_PAGE: 300
        };
        try {
            const response = await fetch(`server.properties?v=${Date.now()}`);
            if (!response.ok) {
                console.warn('server.properties not found in droplist.js. Using default settings.');
                return defaultProps;
            }
            const text = await response.text();
            const properties = {};
            const numericKeys = ['DROPLIST_ITEMS_PER_PAGE'];

            text.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const separatorIndex = line.indexOf('=');
                    if (separatorIndex > -1) {
                        const key = line.substring(0, separatorIndex).trim();
                        let value = line.substring(separatorIndex + 1).trim();

                        if (key) {
                            if (numericKeys.includes(key) && !isNaN(Number(value))) {
                                properties[key] = Number(value);
                            } else {
                                properties[key] = value;
                            }
                        }
                    }
                }
            });
            return { ...defaultProps, ...properties };
        } catch (error) {
            console.error('Failed to load server.properties in droplist.js:', error);
            return defaultProps;
        }
    }

    let sortState = { key: 'item', order: 'asc' }; // Initial sort state
    let fullDropList = [];      // Stores the complete, unfiltered list
    let currentList = [];       // Stores the currently filtered list for pagination
    let currentPage = 1;        // The current page number
    let itemsPerPage = 300;     // Default value, will be updated by server.properties
    let isLoaded = false;

    const escapeHTML = (str) => {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    /**
     * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed.
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @returns {Function} The new debounced function.
     */
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Loads the drop list data from the text files.
     */
    const parseSqlValues = (valuesString) => {
        const regex = /'((?:[^']|'')*)'|(\d+)|(NULL)/g;
        const values = [];
        let match;
        while ((match = regex.exec(valuesString)) !== null) {
            const value = match[1] ?? match[2] ?? match[3];
            values.push(value);
        }
        return values.map(v => {
            if (v === 'NULL' || v === null) return null;
            // Un-escape single quotes inside the string
            if (typeof v === 'string') v = v.replace(/''/g, "'");
            return isNaN(Number(v)) ? v : Number(v);
        });
    };

    const loadDropList = async (sqlFilePath) => {
        const loadingText = document.getElementById('droplist-loading');
        try {
            const response = await fetch(sqlFilePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const sqlText = await response.text();
            const lines = sqlText.split('\n');

            for (const line of lines) {
                if (line.toUpperCase().startsWith('INSERT INTO `DROPLIST` VALUES')) {
                    const valuesString = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
                    const values = parseSqlValues(valuesString);
                    // Assuming columns: mob_id, mob_name, mob_level, item_id, item_name, min, max, drop_rate, is_quest
                    const dropRate = (values[7] / 1000000) * 100; // Convert integer rate to percentage
                    fullDropList.push({
                        mob: values[1],
                        item: values[4],
                        rate: `${dropRate.toFixed(4)}%`,
                        level: values[2]
                    });
                }
            }

            // Filter out any entries that might have empty names after parsing
            fullDropList = fullDropList.filter(drop => drop.mob && drop.item);

            currentList = fullDropList;
            isLoaded = true;
            sortDropList(sortState.key, true);
            // renderPage() is called by sortDropList, so this is not needed.

        } catch (error) {
            console.error("Failed to load drop list:", error);
            if (loadingText) {
                loadingText.textContent = "Failed to load drop list. Please try again later.";
                loadingText.classList.add('text-red-500');
            }
        }
    }

    /**
     * Sorts the drop list based on a key and order.
     * @param {string} key The key to sort by (e.g., 'item', 'mob').
     * @param {boolean} initialSort Whether this is the initial sort.
     */
    const sortDropList = (key, initialSort = false) => {
        if (!isLoaded) return;

        if (!initialSort && sortState.key === key) {
            sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.order = 'asc';
        }
        sortState.key = key;

        const direction = sortState.order === 'asc' ? 1 : -1;

        currentList.sort((a, b) => {
            const valA = a[key].toLowerCase();
            const valB = b[key].toLowerCase();
            return valA.localeCompare(valB) * direction;
        });

        currentPage = 1; // Reset to first page after sorting
        renderPage();
        updateSortButtonUI();
    }

    /**
     * Renders the drop list items on the page.
     */
    const renderPage = () => {
        const container = document.getElementById('droplist-container');
        const searchInput = document.getElementById('droplist-search');
        if (!container || !searchInput) return;

        const searchTerm = searchInput.value.trim();

        // Calculate the items for the current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = currentList.slice(startIndex, endIndex);

        container.innerHTML = '';
        if (paginatedItems.length === 0) {
            container.innerHTML = `<p class="text-center col-span-full">No results found.</p>`;
            renderPaginationControls(); // Render empty controls
            return;
        }

        const listHTML = paginatedItems.map(drop => {
            let itemHTML = escapeHTML(drop.item);
            let mobHTML = escapeHTML(drop.mob);

            if (searchTerm) {
                const regex = new RegExp(escapeHTML(searchTerm), 'gi');
                const highlight = (match) => `<span class="bg-yellow-500 text-black rounded">${match}</span>`;
                itemHTML = itemHTML.replace(regex, highlight);
                mobHTML = mobHTML.replace(regex, highlight);
            }

            return `<div class="bg-gray-800 p-4 rounded-xl shadow transition-all"><p><span class="font-bold text-yellow-400">${itemHTML}</span> - Rate: <span class="text-green-400">${drop.rate}</span> - Dropped by: <span class="text-cyan-400">${mobHTML} (Lv. ${drop.level || 'N/A'})</span></p></div>`;
        }).join('');

        // Set the innerHTML of the container once with the complete list.
        // This is much more performant than appending elements one by one in a loop.
        container.innerHTML = listHTML;

        renderPaginationControls();
    }

    /**
     * Renders the pagination controls for the drop list.
     */
    const renderPaginationControls = () => {
        const controlsContainer = document.getElementById('pagination-controls');
        if (!controlsContainer) return;

        const totalPages = Math.ceil(currentList.length / itemsPerPage);
        controlsContainer.innerHTML = '';

        if (totalPages <= 1) return; // Don't show controls if there's only one page

        const prevButton = document.createElement('button'); // Use action-btn btn-gray
        prevButton.textContent = 'Previous';
        prevButton.className = 'bg-gray-700 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        };

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.className = 'bg-gray-700 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
            }
        };

        controlsContainer.append(prevButton, pageInfo, nextButton);
    }

    /**
     * Renders the sort controls for the drop list.
     */
    const renderSortControls = () => {
        const container = document.getElementById('sort-controls');
        if (!container) return;
        container.innerHTML = `
            <button id="sort-item-btn" class="text-sm text-gray-300 hover:text-white transition">Sort by Item</button>
            <button id="sort-mob-btn" class="text-sm text-gray-300 hover:text-white transition">Sort by Mob</button>
        `;
        document.getElementById('sort-item-btn').addEventListener('click', () => sortDropList('item'));
        document.getElementById('sort-mob-btn').addEventListener('click', () => sortDropList('mob'));
        updateSortButtonUI();
    }

    /**
     * Updates the UI of the sort buttons.
     */
    const updateSortButtonUI = () => {
        const itemBtn = document.getElementById('sort-item-btn');
        const mobBtn = document.getElementById('sort-mob-btn');
        if (!itemBtn || !mobBtn) return;

        [itemBtn, mobBtn].forEach(btn => btn.classList.remove('text-yellow-400', 'font-bold'));

        const activeBtn = sortState.key === 'item' ? itemBtn : mobBtn;
        activeBtn.classList.add('text-yellow-400', 'font-bold');
        activeBtn.textContent = `Sort by ${sortState.key === 'item' ? 'Item' : 'Mob'} (${sortState.order === 'asc' ? '▲' : '▼'})`;
        (sortState.key === 'item' ? mobBtn : itemBtn).textContent = `Sort by ${sortState.key === 'item' ? 'Mob' : 'Item'}`;
    }

    const initializeDroplist = async () => {
        if (isLoaded) return; // Prevent re-initialization

        // Load server properties independently
        const serverProps = await loadServerProperties();
        itemsPerPage = serverProps.DROPLIST_ITEMS_PER_PAGE;

        await loadDropList('data/droplist.sql'); // Point to the new SQL file
        renderSortControls();

        const searchInput = document.getElementById('droplist-search');
        searchInput?.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            currentList = fullDropList.filter(drop => drop.item.toLowerCase().includes(searchTerm) || drop.mob.toLowerCase().includes(searchTerm));
            sortDropList(sortState.key, true); // Re-sort and render
        }, 300));
        console.log('[Debug] Droplist initialized.');
    };

    // Since this is a dedicated page, initialize directly.
    initializeDroplist();
});