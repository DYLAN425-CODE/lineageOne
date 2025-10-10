document.addEventListener('DOMContentLoaded', () => {
    const droplistSection = document.getElementById('droplist');
    if (!droplistSection) return;

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
    const loadDropList = async () => {
        const loadingText = document.getElementById('droplist-loading');
        const serverProps = window.serverProperties;

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

        const serverProps = window.serverProperties;
        itemsPerPage = serverProps.DROPLIST_ITEMS_PER_PAGE;

        await loadDropList();
        renderSortControls();

        const searchInput = document.getElementById('droplist-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const searchTerm = e.target.value.toLowerCase();
                currentList = fullDropList.filter(drop =>
                    drop.item.toLowerCase().includes(searchTerm) ||
                    drop.mob.toLowerCase().includes(searchTerm)
                );
                sortDropList(sortState.key, true);
            }, 300));
        }
        console.log('[Debug] Droplist initialized.');
    };

    // Use a MutationObserver to initialize the droplist only when it becomes visible.
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class' && !droplistSection.classList.contains('hidden')) {
                initializeDroplist();
            }
        }
    });
    observer.observe(droplistSection, { attributes: true });
});