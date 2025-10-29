/**
 * Creates a fully functional, searchable, and sortable data table.
 * @param {object} config - The configuration object for the table.
 * @param {string} config.tableId - The ID of the HTML table element.
 * @param {string} config.searchInputId - The ID of the search input element.
 * @param {string} config.dataUrl - The URL to fetch the data from (e.g., 'data/armor.txt').
 * @param {Array<object>} config.headers - An array of header configuration objects.
 * @param {string} config.defaultSortColumn - The key of the column to sort by default.
 */
export function createDataTable({ tableId, searchInputId, dataUrl, headers, defaultSortColumn = 'name' }) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with ID "${tableId}" not found.`);
        return;
    }

    const tableBody = table.querySelector("tbody");
    const tableHead = table.querySelector("thead");
    const searchInput = document.getElementById(searchInputId);
    const loadingSpinner = document.getElementById('loading-spinner');

    let tableData = [];
    let sortColumn = defaultSortColumn;
    let sortDirection = 'asc';

    function renderTable(data) {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${headers.length}" class="text-center p-4">No items found.</td></tr>`;
            return;
        }

        // Define a small set of "primary" stat keys that should be visible on small screens
        const primaryKeys = new Set(['hit_rate', 'dmg_rate', 'add_str', 'add_dex', 'add_hp', 'add_mp']);

        // Render each row with a data-index so we can insert an expanded details row below it on mobile
        const tableContent = data.map((item, idx) => {
            const rowCells = headers.map(header => {
                const isName = header.key === 'name';
                const isPrimary = primaryKeys.has(header.key);
                const classes = isName ? 'item-name-cell text-yellow-400 font-medium' : `item-stat-cell${isPrimary ? ' item-primary' : ''}`;
                const value = (typeof item[header.key] !== 'undefined' && item[header.key] !== null && item[header.key] !== '') ? item[header.key] : (header.isNumeric ? '0' : 'N/A');
                return `<td data-label="${header.label}" class="${classes}">${value}</td>`;
            }).join('');

            // Create a hidden expanded details block content as a data attribute (escaped)
            let detailsHtml = headers.map(h => `<div class=\"detail-row\"><strong>${h.label}:</strong> ${((item[h.key] !== undefined && item[h.key] !== null && item[h.key] !== '') ? item[h.key] : (h.isNumeric ? '0' : 'N/A'))}</div>`).join('');

            // --- Add Class Usability Info ---
            const classes = {
                'Royal': item.use_royal, 'Knight': item.use_knight, 'Elf': item.use_elf, 'Mage': item.use_mage,
                'Dark Elf': item.use_darkelf, 'Dragon Knight': item.use_dragonknight, 'Black Wizard': item.use_blackwizard, 'Warrior': item.use_warrior
            };
            
            let usableClasses = [];
            for (const [short, canUse] of Object.entries(classes)) {
                if (canUse == 1) {
                    usableClasses.push(`<span class="text-green-400">${short}</span>`);
                }
            }

            let classHtml = '';
            if (usableClasses.length > 0 && usableClasses.length < 8) { // Assuming 8 total classes
                classHtml = `<div class="detail-row"><strong>Classes:</strong> ${usableClasses.join(', ')}</div>`;
            } else {
                classHtml = `<div class="detail-row"><strong>Classes:</strong> <span class="text-gray-400">All</span></div>`;
            }

            // Append class info to the details view
            detailsHtml += classHtml;
            
            return `
                <tr class="data-row" data-index="${idx}">
                    ${rowCells}
                </tr>
                <tr class="expanded-stats-row" data-index="${idx}" style="display:none;">
                    <td colspan="${headers.length}">
                        <div class="expanded-stats-content">${detailsHtml}</div>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = tableContent;
    }

    function sortData(data, column, direction) {
        const headerInfo = headers.find(h => h.key === column);
        const isNumeric = headerInfo?.isNumeric;

        return [...data].sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            if (isNumeric) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function applyFilterAndSort() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredData = tableData.filter(item => item.name.toLowerCase().includes(searchTerm));
        const sortedData = sortData(filteredData, sortColumn, sortDirection);
        renderTable(sortedData);
    }

    function handleSort(e) {
        const key = e.target.dataset.key;
        if (!key) return;

        if (sortColumn === key) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = key;
            sortDirection = 'asc';
        }
        applyFilterAndSort();
    }

    async function fetchData() {
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        try {
            const response = await fetch(dataUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
            const text = await response.text();
            const delimiter = dataUrl.endsWith('.csv') ? ',' : '\t';
            const lines = text.trim().split('\n');
            const headerLine = lines.shift().split(delimiter).map(h => h.replace(/"/g, '').trim());

            tableData = lines.map(line => {
                const values = line.split(delimiter).map(v => v.replace(/\"/g, '').trim());
                const item = {};
                headerLine.forEach((header, index) => {
                    // Guard against undefined values if the CSV row is shorter than the header
                    item[header] = (typeof values[index] !== 'undefined') ? values[index] : '';
                });
                return item;
            });

            applyFilterAndSort();
        } catch (error) {
            console.error(`Failed to load data from ${dataUrl}:`, error);
            tableBody.innerHTML = `<tr><td colspan="${headers.length}" class="text-center p-4 text-red-500">Error loading data: ${error.message}</td></tr>`;
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    // Render header row for desktop view
    const headerRow = `<tr>${headers.map(h => `<th data-key="${h.key}">${h.label}</th>`).join('')}</tr>`;
    if (tableHead) {
        tableHead.innerHTML = headerRow;
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFilterAndSort);
    tableBody.addEventListener('click', (e) => {
        // Mobile behavior: toggle expanded row
        const row = e.target.closest('tr.data-row');
        if (!row) return;
        const idx = row.getAttribute('data-index');
        const expanded = tableBody.querySelector(`tr.expanded-stats-row[data-index="${idx}"]`);
        if (!expanded) return; // nothing to do

        const isVisible = expanded.style.display !== 'none';
        // Hide any other expanded rows first (only one open at a time)
        tableBody.querySelectorAll('tr.expanded-stats-row').forEach(r => r.style.display = 'none');

        expanded.style.display = isVisible ? 'none' : 'table-row';
        // Prevent the click from bubbling further
        e.stopPropagation();
    });

    // Wire close button for bottom panel
    document.getElementById('bottom-stats-close')?.addEventListener('click', () => {
        const panel = document.getElementById('bottom-stats');
        if (panel) {
            panel.classList.add('hidden');
            panel.setAttribute('aria-hidden', 'true');
        }
    });

    // Initial Load
    fetchData();
}