/**
 * Manages user session and active character initialization.
 * @returns {object|null} The active character object or null if session is invalid.
 */

/**
 * Fetches and parses the server.properties file.
 * @returns {Promise<object>} A promise that resolves to an object with the server properties.
 */
async function loadServerProperties() {
    console.log('[Debug] Loading server.properties...');
    // Default values in case the file is missing or fails to load
    const defaultProps = {
        DOWNLOAD_ENABLED: true, DISCORD_ENABLED: true, NEWS_ENABLED: true,
        COUNTDOWN_ENABLED: true, GALLERY_ENABLED: true, LORE_ENABLED: true,
        DROPLIST_ENABLED: true, MARKETPLACE_ENABLED: true, SERVER_STATUS_ENABLED: true,
        VIDEO_BACKGROUND_ENABLED: true,
        RIGHT_CLICK_PROTECTION_ENABLED: true,
        REMEMBER_ME_DURATION_DAYS: 30,
        DOWNLOAD_AVAILABLE_DATE: '2027-08-10T00:00:00',
        SERVER_STATUS_INTERVAL_SECONDS: 30,
        MAX_CHARACTER_SLOTS: 6,
        NEWS_FILE_PATH: 'news.json',
        SERVER_STATUS_API_URL: '/api/server-status',
        STARTER_INVENTORY_JSON: '[{"name":"Adena","quantity":5000,"stackable":true,"price":1},{"name":"Red Potion","quantity":30,"stackable":true,"price":30},{"name":"Haste Potion","quantity":5,"stackable":true,"price":180},{"name":"Trainee\'s T-shirt","quantity":1,"stackable":false,"droppable":false,"price":100}]',
        SITE_TITLE: 'Lineage',
        LOGO_IMAGE_PATH: 'images/logo-lineage.png',
        FOOTER_TEXT: '&copy; 2025 Lineage 1 Server. All rights reserved.',
        SOCIAL_FACEBOOK_URL: '',
        SOCIAL_YOUTUBE_URL: '',
        MAIN_BACKGROUND_VIDEO_PATH: 'media/lineage2.mp4',
        FAVICON_PATH: 'icon/cs.ico',
        SITE_FONT_URL: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
        SITE_FONT_FAMILY: "'Cinzel', serif"
    };
    try {
        // Add a cache-busting query parameter to ensure the latest version is fetched.
        const response = await fetch(`server.properties?v=${Date.now()}`);
        if (!response.ok) {
            console.warn('server.properties not found. Using default feature settings.');
            return defaultProps;
        }
        const text = await response.text();
        const properties = {};
        const numericKeys = ['REMEMBER_ME_DURATION_DAYS', 'SERVER_STATUS_INTERVAL_SECONDS', 'MAX_CHARACTER_SLOTS', 'DROPLIST_ITEMS_PER_PAGE', 'RING3_LEVEL_REQUIREMENT', 'RING4_LEVEL_REQUIREMENT', 'STACKABLE_PRICE_MIN', 'STACKABLE_PRICE_MAX', 'NONSTACKABLE_PRICE_MIN', 'NONSTACKABLE_PRICE_MAX'];

        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const separatorIndex = line.indexOf('=');
                if (separatorIndex === -1) return;

                const key = line.substring(0, separatorIndex).trim();
                let value = line.substring(separatorIndex + 1).trim();

                if (key) {
                    // 1. Handle Booleans
                    if (value.toLowerCase() === 'true') {
                        properties[key] = true;
                    } else if (value.toLowerCase() === 'false') {
                        properties[key] = false;
                    // 2. Handle JSON strings
                    } else if (key.endsWith('_JSON')) {
                        try {
                            properties[key] = JSON.parse(value);
                        } catch (e) {
                            console.error(`Error parsing JSON for key ${key}:`, e);
                            properties[key] = defaultProps[key] ? JSON.parse(defaultProps[key]) : null; // Fallback
                        }
                    // 3. Handle specific numeric keys
                    } else if (numericKeys.includes(key) && !isNaN(Number(value))) {
                        properties[key] = Number(value);
                    // 4. Handle all other cases as strings
                    } else {
                        properties[key] = value;
                    }
                }
            }
        });
        console.log('[Debug] server.properties loaded successfully.');
        return { ...defaultProps, ...properties };
    } catch (error) {
        console.error('Failed to load server.properties:', error);
        return defaultProps;
    }
}

function initializeUserSession() {
    const session = JSON.parse(localStorage.getItem('session')); // This function is now also used by marketplace.html
    if (!session) {
        showInfoModal('Login Required', 'You need to log in to access the marketplace.', { onOk: () => { window.location.href = 'login.html'; } });
        return null;
    }

    if (Date.now() > session.expiry) {
        localStorage.removeItem('session');
        showInfoModal('Session Expired', 'Your session has expired. Please log in again.', { onOk: () => { window.location.href = 'login.html'; } });
        return null;
    }

    const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
    const userCharacters = allCharacters.filter(char => char.owner.toLowerCase() === session.username.toLowerCase());

    let activeCharacter = null;
    const storedActiveCharacter = JSON.parse(localStorage.getItem('activeCharacter'));
    if (storedActiveCharacter && storedActiveCharacter.owner.toLowerCase() === session.username.toLowerCase()) {
        activeCharacter = userCharacters.find(c => c.name === storedActiveCharacter.name);
    }

    if (!activeCharacter && userCharacters.length > 0) {
        activeCharacter = userCharacters[0];
        localStorage.setItem('activeCharacter', JSON.stringify(activeCharacter));
    }

    // Return both active character and the list of user's characters for the dropdown
    return { activeCharacter, userCharacters };
}

document.addEventListener('DOMContentLoaded', async () => {

    // Load server properties first, as they are needed for feature flags.
    // This requires the loadServerProperties function to be available.
    // We will load script.js in marketplace.html to make it available.
    window.serverProperties = window.serverProperties || await loadServerProperties();
    let isMarketplaceInitialized = false; // Flag to prevent re-initialization
    let activeCharacter = null;
    let userCharacters = [];
    const serverProps = window.serverProperties; // Use globally loaded properties
    const BUY_ENABLED = serverProps?.BUY_ENABLED;
    const SELL_ENABLED = serverProps?.SELL_ENABLED;

    // If both buying and selling are disabled, show a general unavailable message and stop everything.
    // This check now runs before the session check.
    // This logic will be moved inside initializeMarketplace

    // ========================================================================
    //  MARKETPLACE STATE & DOM ELEMENTS
    // ========================================================================
    const marketplaceSection = document.getElementById('marketplace');
    let marketGoods = [];
    const buyPanel = document.getElementById('buy-panel');
    const sellPanel = document.getElementById('sell-panel');
    const marketSearchInput = document.getElementById('market-search');
    const combineBtn = document.getElementById('combine-sell-items-btn');
    const characterSelectDropdown = document.getElementById('character-select-dropdown');

    // ========================================================================
    //  UTILITY FUNCTIONS
    // ========================================================================
    function generateUUID() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ========================================================================
    //  CORE MARKETPLACE LOGIC
    // ========================================================================

    async function loadMarketGoods() {
        try {
            const response = await fetch(serverProps.ITEM_NAMES_FILE_PATH);
            const itemsText = await response.text();
            const allItemNames = itemsText.split('\n').map(i => i.trim()).filter(Boolean).filter(name => name.toLowerCase() !== 'adena');

            const stackableKeywords = serverProps.STACKABLE_ITEM_KEYWORDS.split(',');
            const stackableRegex = new RegExp(stackableKeywords.join('|'), 'i');

            marketGoods = allItemNames.map(name => {
                const isStackable = stackableRegex.test(name);
                const price = isStackable 
                    ? Math.floor(Math.random() * (serverProps.STACKABLE_PRICE_MAX - serverProps.STACKABLE_PRICE_MIN + 1)) + serverProps.STACKABLE_PRICE_MIN 
                    : Math.floor(Math.random() * (serverProps.NONSTACKABLE_PRICE_MAX - serverProps.NONSTACKABLE_PRICE_MIN + 1)) + serverProps.NONSTACKABLE_PRICE_MIN;
                const item = { name, price, stackable: isStackable };
                if (name.toLowerCase() === 'arrow') item.quantity = 50;
                return item;
            }).sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error("Failed to load market goods:", error);
            if (buyPanel) buyPanel.innerHTML = `<p class="text-center text-red-500">Could not load items.</p>`;
        }
    }

    function saveCharacterState() {
        if (!activeCharacter) return;
        localStorage.setItem('activeCharacter', JSON.stringify(activeCharacter));
        const allChars = JSON.parse(localStorage.getItem('characters')) || [];
        const charIndex = allChars.findIndex(c => c.name === activeCharacter.name);
        if (charIndex !== -1) {
            allChars[charIndex] = activeCharacter;
            localStorage.setItem('characters', JSON.stringify(allChars));
        }
    }

    function renderBuyPanel() {
        if (!buyPanel) return;
        const searchTerm = marketSearchInput.value.toLowerCase();
        const filteredGoods = marketGoods.filter(item => item.name.toLowerCase().includes(searchTerm));

        if (filteredGoods.length === 0) {
            buyPanel.innerHTML = `<p class="text-center text-gray-400 p-4">No items match your search.</p>`;
            return;
        }

        buyPanel.innerHTML = filteredGoods.map(item => `
            <div class="market-item">
                <span>${item.name} ${item.quantity ? `(${item.quantity})` : ''}</span>
                <div class="flex items-center gap-4">
                    <span class="font-bold text-yellow-400">${(item.price || 0).toLocaleString()} Adena</span>
                    <button data-item-name="${escapeHTML(item.name)}" class="buy-btn bg-green-600 px-3 py-1 rounded-lg hover:bg-green-700 transition text-xs">Buy</button>
                </div>
            </div>`).join('');
    }

    function renderSellPanel() {
        if (!sellPanel || !activeCharacter) {
            sellPanel.innerHTML = `<p class="text-center text-gray-400 p-4">No active character found. Please select one from the dashboard.</p>`;
            return;
        }
        const adena = activeCharacter.inventory.find(i => i.name === 'Adena')?.quantity || 0;
        let sellPanelHTML = `<p class="text-center mb-4 font-bold text-yellow-400 text-shadow">Your Adena: ${adena.toLocaleString()}</p>`;

        const sellableItems = activeCharacter.inventory.filter(item => item.name !== 'Adena');

        if (sellableItems.length === 0) {
            sellPanelHTML += `<p class="text-center text-gray-400 p-4">Your inventory is empty.</p>`;
        } else {
            sellPanelHTML += sellableItems.map(item => {
                const sellPrice = item.price || 0;
                const totalSellValue = sellPrice * item.quantity;
                const displayName = item.enchantment !== undefined ? `+${item.enchantment} ${item.name}` : item.name;

                return `
                    <div class="market-item">
                        <span>${escapeHTML(displayName)} (${item.quantity.toLocaleString()})</span>
                        <div class="flex items-center gap-4">
                            <span class="font-bold text-yellow-400">${totalSellValue.toLocaleString()} Adena</span>
                            ${item.droppable !== false ?
                                `<button data-item-id="${item.id}" class="sell-btn bg-red-700 px-3 py-1 rounded-lg hover:bg-red-800 transition text-xs">Sell</button>` :
                                `<span class="text-xs text-gray-500">Untradable</span>`}
                        </div>
                    </div>`;
            }).join('');
        }
        sellPanel.innerHTML = sellPanelHTML;
    }

    function handleBuyItem(event) {
        const itemName = event.target.getAttribute('data-item-name');
        const itemToBuy = marketGoods.find(i => i.name === itemName);
        if (!itemToBuy || !activeCharacter) return;

        const confirmAndBuy = (quantity) => {
            const totalPrice = (itemToBuy.price * quantity).toLocaleString();
            showConfirmModal({
                title: 'Confirm Purchase',
                message: `Are you sure you want to buy ${quantity}x ${escapeHTML(itemToBuy.name)} for ${totalPrice} Adena?`,
                onConfirm: () => buyItems(itemToBuy, quantity)
            });
        };

        showQuantityModal({
            title: 'Buy Item',
            item: itemToBuy,
            onReady: (modal) => {
                const input = modal.querySelector('#quantity-input');
                const totalPriceEl = modal.querySelector('#quantity-total-price');
                input.oninput = () => {
                    totalPriceEl.textContent = `${(itemToBuy.price || 0) * (parseInt(input.value) || 0)} Adena`;
                };
            },
            onConfirm: (quantity) => confirmAndBuy(quantity)
        });
    }

    function buyItems(itemToBuy, quantity) {
        const adenaStack = activeCharacter.inventory.find(i => i.name === 'Adena');
        const playerAdena = adenaStack ? adenaStack.quantity : 0;
        const totalPrice = itemToBuy.price * quantity;

        if (playerAdena < totalPrice) {
            showInfoModal('Not Enough Adena', 'You do not have enough Adena for this purchase.', { type: 'error' });
            return;
        }

        if (adenaStack) adenaStack.quantity -= totalPrice;

        const itemBaseQuantity = itemToBuy.quantity || 1;
        const totalQuantityToAdd = itemBaseQuantity * quantity;
        const existingStack = activeCharacter.inventory.find(i => i.name === itemToBuy.name && i.stackable === true);

        if (existingStack) {
            existingStack.quantity += totalQuantityToAdd;
        } else {
            activeCharacter.inventory.push({
                id: generateUUID(), name: itemToBuy.name, quantity: totalQuantityToAdd,
                price: itemToBuy.price, stackable: itemToBuy.stackable, droppable: true
            });
        }
        saveCharacterState();
        renderSellPanel();
        showSuccessModal('Purchase Successful', `You bought ${totalQuantityToAdd.toLocaleString()}x ${itemToBuy.name} for ${totalPrice.toLocaleString()} Adena.`);
    }

    function handleSellItem(event) {
        const itemId = event.target.getAttribute('data-item-id');
        if (!activeCharacter) return;
        const itemToSell = activeCharacter.inventory.find(i => i.id === itemId);
        if (!itemToSell) return;

        const confirmAndSell = (quantity) => {
            const sellPrice = itemToSell.price || 0;
            const totalValue = (sellPrice * quantity).toLocaleString();
            const displayName = itemToSell.enchantment !== undefined ? `+${itemToSell.enchantment} ${itemToSell.name}` : itemToSell.name;
            
            showConfirmModal({
                title: 'Confirm Sale',
                message: `Are you sure you want to sell ${quantity}x ${escapeHTML(displayName)} for ${totalValue} Adena?`,
                onConfirm: () => sellItems(itemToSell, quantity)
            });
        };

        if (itemToSell.stackable === false || itemToSell.quantity === 1 || !window.showQuantityModal) {
            confirmAndSell(1);
        } else {
            showQuantityModal({
                title: 'Sell Item',
                item: itemToSell,
                onReady: (modal) => {
                    const input = modal.querySelector('#quantity-input');
                    const totalPriceEl = modal.querySelector('#quantity-total-price');
                    input.max = itemToSell.quantity;
                    input.oninput = () => { totalPriceEl.textContent = `${(itemToSell.price || 0) * (parseInt(input.value) || 0)} Adena`; };
                },
                maxQuantity: itemToSell.quantity,
                onConfirm: (quantity) => confirmAndSell(quantity)
            });
        }
    }

    function sellItems(itemToSell, quantityToSell) {
        const sellPrice = itemToSell.price || 0;
        const totalSaleValue = sellPrice * quantityToSell;

        if (quantityToSell >= itemToSell.quantity) {
            activeCharacter.inventory = activeCharacter.inventory.filter(i => i.id !== itemToSell.id);
        } else {
            itemToSell.quantity -= quantityToSell;
        }

        let adenaStack = activeCharacter.inventory.find(i => i.name === 'Adena');
        if (adenaStack) {
            adenaStack.quantity += totalSaleValue;
        } else {
            activeCharacter.inventory.push({
                id: generateUUID(), name: 'Adena', quantity: totalSaleValue,
                stackable: true, droppable: true, price: 1
            });
        }
        saveCharacterState();
        renderSellPanel();
        showSuccessModal('Sale Successful', `You sold ${quantityToSell.toLocaleString()}x ${itemToSell.name} for ${totalSaleValue.toLocaleString()} Adena.`);
    }

    function handleCombineItems() {
        if (!activeCharacter) return;
    
        const combined = new Map();
        const nonStackableItems = activeCharacter.inventory.filter(item => item.stackable !== true);
    
        activeCharacter.inventory
            .filter(item => item.stackable === true)
            .forEach(item => {
                const key = `${item.name}_${item.enchantment || 0}`; // Group by name and enchant level
                const existing = combined.get(key);
                if (existing) {
                    existing.quantity += item.quantity;
                } else {
                    combined.set(key, { ...item, id: generateUUID() }); // Create a new item with a new ID
                }
            });
    
        activeCharacter.inventory = [...nonStackableItems, ...Array.from(combined.values())];
        saveCharacterState();
        renderSellPanel();
        showSuccessModal('Items Combined', 'Your stackable items have been combined.');
    }

    function renderCharacterSelector() {
        if (!characterSelectDropdown) return;

        characterSelectDropdown.innerHTML = userCharacters.map(char =>
            `<option value="${escapeHTML(char.name)}" ${char.name === activeCharacter?.name ? 'selected' : ''}>
                ${escapeHTML(char.name)}
            </option>`
        ).join('');

        characterSelectDropdown.addEventListener('change', (event) => {
            const selectedCharName = event.target.value;
            const newActiveCharacter = userCharacters.find(c => c.name === selectedCharName);
            if (newActiveCharacter) {
                activeCharacter = newActiveCharacter;
                saveCharacterState();
                renderSellPanel();
            }
        });
    }

    // ========================================================================
    //  INITIALIZATION & EVENT LISTENERS
    // ========================================================================

    async function initializeMarketplace() { // Renamed from DOMContentLoaded handler
        if (isMarketplaceInitialized) return;
        console.log('[Debug] Initializing Marketplace...');
        // The rest of the initialization logic remains the same

        const sessionData = initializeUserSession();
        if (!sessionData) {
            // The initializeUserSession function already shows a modal and redirects.
            return;
        }
        ({ activeCharacter, userCharacters } = sessionData);
        await loadMarketGoods();
        renderCharacterSelector();

        // Conditionally render the buy panel
        if (BUY_ENABLED) {
            renderBuyPanel();
            marketSearchInput?.addEventListener('input', debounce(renderBuyPanel, 300));
        } else {
            if (buyPanel) buyPanel.innerHTML = `<p class="text-center text-yellow-400 p-4">Buying items is temporarily unavailable.</p>`;
            if (marketSearchInput) marketSearchInput.disabled = true;
        }

        // Conditionally render the sell panel
        if (SELL_ENABLED) {
            renderSellPanel();
            combineBtn?.addEventListener('click', handleCombineItems);
        } else {
            if (sellPanel) sellPanel.innerHTML = `<p class="text-center text-yellow-400 p-4">Selling items is temporarily unavailable.</p>`;
            if (combineBtn) combineBtn.disabled = true;
            if (characterSelectDropdown) characterSelectDropdown.disabled = true;
        }

        // Event Delegation for buy/sell buttons
        document.body.addEventListener('click', (event) => {
            // Only handle clicks if the respective feature is enabled
            if (BUY_ENABLED && event.target.classList.contains('buy-btn')) {
                handleBuyItem(event);
            }
            if (SELL_ENABLED && event.target.classList.contains('sell-btn')) {
                handleSellItem(event);
            }
        });

        isMarketplaceInitialized = true;
        console.log('[Debug] Marketplace initialized.');
    }

    // Since this is a dedicated page, we can initialize the marketplace directly on DOMContentLoaded.
    // The MutationObserver is no longer needed.
    initializeMarketplace();
});