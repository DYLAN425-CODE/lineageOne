document.addEventListener('DOMContentLoaded', async () => {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

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
    const parseCSV = (csvText) => {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
            if (values.length === headers.length) {
                let row = {};
                for (let j = 0; j < headers.length; j++) {
                    row[headers[j]] = values[j];
                }
                data.push(row);
            }
        }
        return data;
    };

    const loadDropList = async (csvFilePath) => {
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) loadingSpinner.style.display = 'block';

        try {
            const response = await fetch(csvFilePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            const parsedData = parseCSV(csvText);

            fullDropList = parsedData.map(item => ({
                mob: item.mobname,
                item: item.itemname,
                rate: `${(parseFloat(item.chance) / 1000000 * 100).toFixed(4)}%`, // Assuming 'chance' is in integer format
                level: item.moblevel || 'N/A',
                min: item.min,
                max: item.max,
                enchant: item.Enchant
            }));

            fullDropList = fullDropList.filter(drop => drop.mob && drop.item);
            currentList = fullDropList;
            isLoaded = true;
            sortDropList(sortState.key, true);

        } catch (error) {
            console.error("Failed to load drop list:", error);
            // No longer referencing droplist-loading, consider a more general error display if needed
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    };

    const renderPage = () => {
        const tableBody = document.querySelector('#droplistTable tbody');
        const searchInput = document.getElementById('droplist-search');
        if (!tableBody || !searchInput) return;

        const searchTerm = searchInput.value.trim();

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = currentList.slice(startIndex, endIndex);

        tableBody.innerHTML = ''; // Clear existing table body content
        if (paginatedItems.length === 0) {
            // Display a message within the table context, e.g., a single row spanning all columns
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No results found.</td></tr>`;
            renderPaginationControls();
            return;
        }

        let tableRowsHTML = '';

        paginatedItems.forEach((drop, index) => {
            let itemHTML = escapeHTML(drop.item);
            let mobHTML = escapeHTML(drop.mob);

            if (searchTerm) {
                const regex = new RegExp(escapeHTML(searchTerm), 'gi');
                const highlight = (match) => `<span class="bg-yellow-500 text-black rounded">${match}</span>`;
                
                const highlightedItemHTML = itemHTML.replace(regex, highlight);
                const highlightedMobHTML = mobHTML.replace(regex, highlight);
                const highlightedMinHTML = escapeHTML(String(drop.min)).replace(regex, highlight);
                const highlightedMaxHTML = escapeHTML(String(drop.max)).replace(regex, highlight);
                const highlightedRateHTML = escapeHTML(String(drop.rate)).replace(regex, highlight);
                const highlightedLevelHTML = escapeHTML(String(drop.level)).replace(regex, highlight);
                const highlightedEnchantHTML = escapeHTML(String(drop.enchant > 0 ? `+${drop.enchant}` : drop.enchant)).replace(regex, highlight);

                // Create the hidden expanded details block content
                const detailsHtml = `
                    <div class="detail-row"><strong>Mob:</strong> ${highlightedMobHTML}</div>
                    <div class="detail-row"><strong>Item:</strong> ${highlightedItemHTML}</div>
                    <div class="detail-row"><strong>Min:</strong> ${highlightedMinHTML}</div>
                    <div class="detail-row"><strong>Max:</strong> ${highlightedMaxHTML}</div>
                    <div class="detail-row"><strong>Rate:</strong> <span class="text-green-400">${highlightedRateHTML}</span></div>
                    <div class="detail-row"><strong>Level:</strong> ${highlightedLevelHTML}</div>
                    <div class="detail-row"><strong>Enchant:</strong> <span class="text-purple-400">${highlightedEnchantHTML}</span></div>
                `;

                tableRowsHTML += `
                    <tr class="data-row" data-index="${startIndex + index}">
                        <td data-label="Mob" class="item-primary text-cyan-400">${highlightedMobHTML}</td>
                        <td data-label="Item" class="item-primary text-yellow-400">${highlightedItemHTML}</td>
                        <td data-label="Min" class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${highlightedMinHTML}</td>
                        <td data-label="Max" class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${highlightedMaxHTML}</td>
                        <td data-label="Rate" class="px-6 py-4 whitespace-nowrap text-sm text-green-400">${highlightedRateHTML}</td>
                        <td data-label="Level" class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${highlightedLevelHTML}</td>
                        <td data-label="Enchant" class="px-6 py-4 whitespace-nowrap text-sm text-purple-400">${highlightedEnchantHTML}</td>
                    </tr>
                    <tr class="expanded-stats-row" data-index="${startIndex + index}" style="display:none;">
                        <td colspan="7">
                            <div class="expanded-stats-content">${detailsHtml}</div>
                        </td>
                    </tr>
                `;
            } else {
                // Original row generation for when there is no search term
                tableRowsHTML += `<tr class="hover:bg-gray-700 transition-colors duration-200">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">${mobHTML}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-400">${itemHTML}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${drop.min}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${drop.max}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-400">${drop.rate}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${drop.level}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-purple-400">${drop.enchant > 0 ? `+${drop.enchant}` : drop.enchant}</td>
                              </tr>`;
            }
        });

        tableBody.innerHTML = tableRowsHTML;

        renderPaginationControls();
    };

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

    const initializeDroplist = async () => {
        if (isLoaded) return;

        const serverProps = window.serverProperties || await window.loadServerProperties();
        itemsPerPage = serverProps?.DROPLIST_ITEMS_PER_PAGE || 300;

        await loadDropList('data/droplist.csv');
        renderSortControls();

        const searchInput = document.getElementById('droplist-search');
        searchInput?.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            currentList = fullDropList.filter(drop => 
                drop.item.toLowerCase().includes(searchTerm) || 
                drop.mob.toLowerCase().includes(searchTerm) ||
                drop.min.toLowerCase().includes(searchTerm) ||
                drop.max.toLowerCase().includes(searchTerm) ||
                drop.rate.toLowerCase().includes(searchTerm) ||
                drop.level.toLowerCase().includes(searchTerm) ||
                String(drop.enchant).toLowerCase().includes(searchTerm)
            );
            sortDropList(sortState.key, true);
        }, 300));
        console.log('[Debug] Droplist initialized.');
    };



    const printTable = () => {
        window.print();
    };

    document.getElementById('print-table-btn').addEventListener('click', printTable);

    const clearSearch = () => {
        const searchInput = document.getElementById('droplist-search');
        searchInput.value = '';
        currentList = fullDropList;
        sortDropList(sortState.key, true);
    };

    document.getElementById('clear-search-btn').addEventListener('click', clearSearch);

    const itemsPerPageSelect = document.getElementById('items-per-page');
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value, 10);
        currentPage = 1;
        renderPage();
    });

    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.style.display = 'block';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    });

    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // --- Event Listener for Mobile Row Expansion ---
    const tableBody = document.querySelector('#droplistTable tbody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            if (window.innerWidth > 1024) return; // Only run on mobile/tablet

            const row = e.target.closest('tr.data-row');
            if (!row) return;

            const idx = row.getAttribute('data-index');
            const expandedRow = tableBody.querySelector(`tr.expanded-stats-row[data-index="${idx}"]`);
            if (!expandedRow) return;

            const isVisible = expandedRow.style.display !== 'none';

            // Hide all other expanded rows first
            tableBody.querySelectorAll('tr.expanded-stats-row').forEach(r => r.style.display = 'none');

            expandedRow.style.display = isVisible ? 'none' : 'table-row';
        });
    }

    // Since this is a dedicated page, initialize directly.
    initializeDroplist();
});