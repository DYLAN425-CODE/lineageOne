/**
 * Fetches and parses the server.properties file.
 * @returns {Promise<object>} A promise that resolves to an object with the server properties.
 */
async function loadServerProperties() {
    // Default values in case the file is missing or fails to load
    const defaultProps = { DROPLIST_ITEMS_PER_PAGE: 300, DROPLIST_BACKGROUND_VIDEO_PATH: 'media/droplist.mp4', FAVICON_PATH: 'icon/cs.ico', MOB_NAMES_FILE_PATH: 'droplist_txt/mob.txt', ITEM_NAMES_FILE_PATH: 'droplist_txt/itemname.txt', MOB_LEVELS_FILE_PATH: 'droplist_txt/moblevel.txt' };
    try {
        const response = await fetch('server.properties');
        if (!response.ok) {
            console.warn('server.properties not found. Using default droplist settings.');
            return defaultProps;
        }
        const text = await response.text();
        const properties = {};
        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split('=').map(s => s.trim());
                if (key && value !== undefined) {
                    // Keep JSON strings as strings
                    if (key.endsWith('_JSON')) {
                        properties[key] = value;
                    }
                    if (value.toLowerCase() === 'true') properties[key] = true;
                    else if (value.toLowerCase() === 'false') properties[key] = false;
                    else if (!isNaN(Number(value))) properties[key] = Number(value);
                    else properties[key] = value;
                }
            }
        });
        return { ...defaultProps, ...properties };
    } catch (error) {
        console.error('Failed to load server.properties:', error);
        return defaultProps;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    let sortState = { key: 'item', order: 'asc' }; // Initial sort state
    let fullDropList = [];      // Stores the complete, unfiltered list
    let currentList = [];       // Stores the currently filtered list for pagination
    let currentPage = 1;        // The current page number
    let itemsPerPage = 300;     // Default value, will be updated by server.properties
    let isLoaded = false;

    function escapeHTML(str) {
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
    function debounce(func, wait) {
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
    async function loadDropList() {
        // The serverProps are now loaded at the top level, so we just use itemsPerPage.
        // This function can now focus solely on loading the droplist data.
        const loadingText = document.getElementById('droplist-loading');
        try {
            const [mobsRes, itemsRes, levelsRes] = await Promise.all([
                fetch(serverProps.MOB_NAMES_FILE_PATH),
                fetch(serverProps.ITEM_NAMES_FILE_PATH),
                fetch(serverProps.MOB_LEVELS_FILE_PATH) // Fetch the mob levels file
            ]);

            const mobsText = await mobsRes.text();
            const itemsText = await itemsRes.text();
            const levelsText = await levelsRes.text();

            const mobs = mobsText.split('\n').map(m => m.trim()).filter(Boolean);
            const items = itemsText.split('\n').map(i => i.trim()).filter(Boolean);
            const levels = levelsText.split('\n').map(l => parseInt(l.trim(), 10)).filter(l => !isNaN(l));

            const count = Math.min(mobs.length, items.length);
            for (let i = 0; i < count; i++) {
                let rate;
                if (items[i].toLowerCase() === 'adena') {
                    rate = '100.00%';
                } else {
                    // Use a skewed random number to make lower drop rates more common.
                    // Math.pow(Math.random(), 3) generates a number between 0 and 1, but heavily skewed towards 0.
                    const skewedRandom = Math.pow(Math.random(), 3);
                    const rateValue = (skewedRandom * (10 - 0.01)) + 0.01; // Range from 0.01 to 10
                    rate = `${rateValue.toFixed(4)}%`; // Use 4 decimal places for more precision on rare items
                }
                // Use the level from the file, or default to 1 if the file is shorter
                const level = levels[i] || 1;
                fullDropList.push({ mob: mobs[i], item: items[i], rate: rate, level: level });
            }

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
    function sortDropList(key, initialSort = false) {
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
    function renderPage() {
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

            return `<div class="bg-gray-800 p-4 rounded-xl shadow transition-all"><p><span class="font-bold text-yellow-400">${itemHTML}</span> - Rate: <span class="text-green-400">${drop.rate}</span> - Dropped by: <span class="text-cyan-400">${mobHTML} (Lv. ${drop.level})</span></p></div>`;
        }).join('');

        // Set the innerHTML of the container once with the complete list.
        // This is much more performant than appending elements one by one in a loop.
        container.innerHTML = listHTML;

        renderPaginationControls();
    }

    /**
     * Renders the pagination controls for the drop list.
     */
    function renderPaginationControls() {
        const controlsContainer = document.getElementById('pagination-controls');
        if (!controlsContainer) return;

        const totalPages = Math.ceil(currentList.length / itemsPerPage);
        controlsContainer.innerHTML = '';

        if (totalPages <= 1) return; // Don't show controls if there's only one page

        const prevButton = document.createElement('button');
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
    function renderSortControls() {
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
    function updateSortButtonUI() {
        const itemBtn = document.getElementById('sort-item-btn');
        const mobBtn = document.getElementById('sort-mob-btn');
        if (!itemBtn || !mobBtn) return;

        [itemBtn, mobBtn].forEach(btn => btn.classList.remove('text-yellow-400', 'font-bold'));

        const activeBtn = sortState.key === 'item' ? itemBtn : mobBtn;
        activeBtn.classList.add('text-yellow-400', 'font-bold');
        activeBtn.textContent = `Sort by ${sortState.key === 'item' ? 'Item' : 'Mob'} (${sortState.order === 'asc' ? '▲' : '▼'})`;
        (sortState.key === 'item' ? mobBtn : itemBtn).textContent = `Sort by ${sortState.key === 'item' ? 'Mob' : 'Item'}`;
    }

    // Initial setup
    const serverProps = await loadServerProperties();
    itemsPerPage = serverProps.DROPLIST_ITEMS_PER_PAGE;

    // Set the background video from server properties
    const bgVideo = document.querySelector('#bg-video-container video');
    if (bgVideo && serverProps.DROPLIST_BACKGROUND_VIDEO_PATH) {
        bgVideo.src = serverProps.DROPLIST_BACKGROUND_VIDEO_PATH;
    }

    // --- Favicon ---
    if (serverProps.FAVICON_PATH) {
        const faviconIco = document.getElementById('favicon-ico');
        const faviconShortcut = document.getElementById('favicon-shortcut');
        if (faviconIco) faviconIco.href = serverProps.FAVICON_PATH;
        if (faviconShortcut) faviconShortcut.href = serverProps.FAVICON_PATH;
    }

    loadDropList();
    renderSortControls();

    const searchInput = document.getElementById('droplist-search');
    if (searchInput) {
        // Use debounce to prevent the search from firing on every keystroke
        searchInput.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            currentList = fullDropList.filter(drop =>
                drop.item.toLowerCase().includes(searchTerm) ||
                drop.mob.toLowerCase().includes(searchTerm)
            );
            // Re-sort the filtered list without changing the sort order direction
            sortDropList(sortState.key, true);
        }, 300)); // 300ms delay
    }
});