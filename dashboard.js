/**
 * Fetches and parses the server.properties file.
 * @returns {Promise<object>} A promise that resolves to an object with the server properties.
 */
async function loadServerProperties() {
    // Default values in case the file is missing or fails to load
    const defaultProps = { MAX_CHARACTER_SLOTS: 6, DASHBOARD_BACKGROUND_IMAGE_PATH: 'images/bg1.png', FAVICON_PATH: 'icon/cs.ico', RING3_LEVEL_REQUIREMENT: 76, RING4_LEVEL_REQUIREMENT: 81 };
    try {
        const response = await fetch('server.properties');
        if (!response.ok) {
            console.warn('server.properties not found. Using default dashboard settings.');
            return defaultProps;
        }
        const text = await response.text();
        const properties = {};
        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split('=').map(s => s.trim());
                if (key && value !== undefined) {
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
// ========================================================================
//  DOM CONTENT LOADED - All the code inside this function runs after the page has finished loading.
// ========================================================================
document.addEventListener('DOMContentLoaded', async () => {

    const serverProps = await loadServerProperties();

    // Set the background image from server properties
    if (serverProps.DASHBOARD_BACKGROUND_IMAGE_PATH) {
        document.documentElement.style.setProperty('--dashboard-bg-image', `url('${serverProps.DASHBOARD_BACKGROUND_IMAGE_PATH}')`);
    }

    // --- Favicon ---
    if (serverProps.FAVICON_PATH) {
        const faviconIco = document.getElementById('favicon-ico');
        const faviconShortcut = document.getElementById('favicon-shortcut');
        if (faviconIco) faviconIco.href = serverProps.FAVICON_PATH;
        if (faviconShortcut) faviconShortcut.href = serverProps.FAVICON_PATH;
    }
    // ========================================================================
    //  SESSION MANAGEMENT
    // ========================================================================
    const sessionString = localStorage.getItem('session');
    let session = null;

    if (sessionString) {
        session = JSON.parse(sessionString);
        // Check if the session has expired
        if (Date.now() > session.expiry) {
            localStorage.removeItem('session'); // Clear expired session
            session = null; // Invalidate session
            showInfoModal('Session Expired', 'Your session has expired. Please log in again.', { type: 'error', onOk: () => {
                window.location.href = 'index.html';
            }});
        }
    }

    if (!session) {
        // If no session or it expired, redirect to the main page
        window.location.href = 'index.html';
        return; // Stop further script execution
    }

    // ========================================================================
    //  MODAL INSTANCES
    // ========================================================================
    const confirmationModal = new Modal('confirm-modal');

    // ========================================================================
    //  CHARACTER DATA MANAGEMENT
    // ========================================================================
    document.getElementById('dashboard-username').textContent = session.username;

    const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
    const userCharacters = allCharacters.filter(char => char.owner.toLowerCase() === session.username.toLowerCase());
    const slotsContainer = document.getElementById('character-slots-container');
    const maxSlots = serverProps.MAX_CHARACTER_SLOTS;

    for (let i = 0; i < maxSlots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'character-slot rounded-lg p-6 flex flex-col justify-center items-center';

        if (userCharacters[i]) {
            // If a character exists for this slot, display their info
            const char = userCharacters[i];
            slotDiv.innerHTML = `
                <h3 class="text-2xl font-bold text-white text-shadow">${char.name}</h3>
                <p class="text-gray-300 mt-1">Lv. 1 ${char.class}</p>
                <div class="flex gap-2 mt-4">
                    <button data-char-name="${char.name}" class="enter-game-btn bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">Enter Game</button>
                    <button data-char-name="${char.name}" class="delete-char-btn bg-red-800/80 border border-red-600 px-4 py-2 rounded-lg hover:bg-red-700/80 transition text-sm">Delete</button>
                </div>
            `;
        } else {
            // If the slot is empty
            slotDiv.innerHTML = `
                <h3 class="text-2xl font-bold text-gray-500">Empty Slot</h3>
                <p class="text-gray-400 mt-1">Available</p>
                ${ userCharacters.length < maxSlots
                    ? `<a href="create-character.html" class="mt-4 bg-green-600 px-6 py-2 rounded-lg hover:bg-green-700 transition">Create Character</a>`
                    : `<button class="mt-4 bg-gray-600 px-6 py-2 rounded-lg cursor-not-allowed opacity-50" disabled>Slots Full</button>`
                }
            `;
        }
        slotsContainer.appendChild(slotDiv);
    }
    // If all slots are full, no "Empty Slot" cards are rendered, so this part is not strictly necessary
    // but it's a good defensive check.
    if (userCharacters.length >= maxSlots) {
        // This logic is now handled inside the loop.
    }

    /**
     * Generates a simple unique ID.
     * @returns {string} A unique identifier.
     */
    function generateUUID() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    /**
     * Shows the character details view.
     * @param {object} character The character object to display.
     */
    function showCharacterDetails(character) {
        const selectView = document.getElementById('character-select-view');
        const detailView = document.getElementById('character-detail-view');
        const displayContainer = document.getElementById('character-display');

        // --- Populate Storage ---
        const storagePanel = document.getElementById('character-storage-panel'); 
        const inventory = character.inventory || [];
        storagePanel.className = 'character-slot p-6 mt-8 text-left'; // Add glass panel style

        let storageHTML = `<h2 class="text-2xl font-semibold mb-4 text-center text-yellow-500 text-shadow flex justify-center items-center gap-4">
                               <span>Character Storage</span>
                               <button id="combine-stacks-btn" class="bg-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-500 transition" title="Combine all stackable items">Combine</button>
                           </h2>`;
        storageHTML += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-shadow">`;
        
        // Sort inventory to group unique items first, then by name
        inventory.sort((a, b) => (a.stackable === b.stackable) ? a.name.localeCompare(b.name) : a.stackable ? 1 : -1);

        inventory.forEach(item => {
            const displayName = item.enchantment !== undefined ? `+${item.enchantment} ${item.name}` : item.name;
            storageHTML += `
                <div class="storage-item">
                    <span>${displayName}</span>
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-gray-300">${item.quantity.toLocaleString()}</span>
                        ${ (item.splittable !== false && item.stackable === true && item.quantity > 1)
                            ? `<button data-item-id="${item.id}" class="split-item-btn text-blue-400/70 hover:text-blue-300 text-xs font-bold transition" title="Split Stack">[S]</button>`
                            : `<span class="w-6"></span>` /* Placeholder for alignment */
                        }
                        ${ item.droppable !== false
                            ? `<span class="w-6"></span>` /* Placeholder for alignment */
                            : `<span class="w-6"></span>` /* Placeholder for alignment */
                        }
                    </div>
                </div>
            `;
        });
        storageHTML += `</div>`;
        storagePanel.innerHTML = storageHTML;

        // For now, level is hardcoded. This can be replaced with character.level later.
        const characterLevel = 1;
        const ring3Lvl = serverProps.RING3_LEVEL_REQUIREMENT;
        const ring4Lvl = serverProps.RING4_LEVEL_REQUIREMENT;

        // Get Adena count from inventory for display in the status panel
        const adenaItem = inventory.find(item => item.name === 'Adena');
        const adenaCount = adenaItem ? adenaItem.quantity : 0;

        // Populate the details
        displayContainer.innerHTML = `
            <!-- Character Status Column -->
            <div>
                <h2 class="text-2xl font-semibold mb-4 text-center text-yellow-500 text-shadow">Character Status</h2>
                <ul class="space-y-2 text-shadow">
                    <li class="stat-item flex justify-between"><span>Name:</span> <span class="font-bold text-white">${character.name}</span></li>
                    <li class="stat-item flex justify-between"><span>Level:</span> <span class="font-bold text-white">${characterLevel}</span></li>
                    <li class="stat-item flex justify-between"><span>Class:</span> <span class="font-bold text-white">${character.class}</span></li>
                    <li class="stat-item flex justify-between"><span>Gender:</span> <span class="font-bold text-white">${character.gender}</span></li>
                    <li class="stat-item flex justify-between"><span>STR:</span> <span class="font-bold text-white">${character.stats.str}</span></li>
                    <li class="stat-item flex justify-between"><span>CON:</span> <span class="font-bold text-white">${character.stats.con}</span></li>
                    <li class="stat-item flex justify-between"><span>INT:</span> <span class="font-bold text-white">${character.stats.int}</span></li>
                    <li class="stat-item flex justify-between"><span>WIS:</span> <span class="font-bold text-white">${character.stats.wis}</span></li>
                    <li class="stat-item flex justify-between"><span>DEX:</span> <span class="font-bold text-white">${character.stats.dex}</span></li>
                    <li class="stat-item flex justify-between"><span>HP:</span> <span class="font-bold text-white">50 / 50</span></li>
                    <li class="stat-item flex justify-between"><span>MP:</span> <span class="font-bold text-white">20 / 20</span></li>
                    <li class="stat-item flex justify-between"><span>EXP:</span> <span class="font-bold text-white">0.00%</span></li>
                    <li class="stat-item flex justify-between"><span>AC:</span> <span class="font-bold text-white">-10</span></li>
                    <li class="stat-item flex justify-between"><span>MR:</span> <span class="font-bold text-white">15%</span></li>
                    <li class="stat-item flex justify-between"><span>Alignment:</span> <span class="font-bold text-cyan-300">Neutral</span></li>
                    <li class="stat-item flex justify-between"><span>Adena:</span> <span class="font-bold text-yellow-400">${adenaCount.toLocaleString()}</span></li>
                    <li class="stat-item flex justify-between"><span>PK Count:</span> <span class="font-bold text-red-400">0</span></li>
                    <li class="stat-item flex justify-between"><span>Guild:</span> <span class="font-bold text-gray-400">None</span></li>
                </ul>
            </div>
            <!-- Character Equipment Column -->
            <div>
                <h2 class="text-2xl font-semibold mb-4 text-center text-yellow-500 text-shadow">Equipped Items</h2>
                <ul class="space-y-3 text-shadow">
                    <li class="equip-slot"><span>Weapon:</span> <span class="font-bold text-gray-400">None</span></li>
                    <li class="equip-slot"><span>Helmet:</span> <span class="font-bold text-gray-400">None</span></li>
                    <li class="equip-slot"><span>Armor:</span> <span class="font-bold text-gray-400">None</span></li>
                    <li class="equip-slot"><span>Cloak:</span> <span class="font-bold text-gray-400">None</span></li>
                    <li class="equip-slot"><span>Gloves:</span> <span class="font-bold text-gray-400">None</span></li>
                    <li class="equip-slot"><span>Boots:</span> <span class="font-bold text-gray-400">None</span></li>
                    ${ character.class === 'Warrior'
                        ? `<li class="equip-slot"><span>Weapon 2:</span> <span class="font-bold text-gray-400">None</span></li>`
                        : `<li class="equip-slot"><span>Shield:</span> <span class="font-bold text-gray-400">None</span></li>`
                    }
                    <li class="equip-slot"><span>Amulet:</span> <span class="font-bold text-gray-400">None</span></li>
                    <li class="equip-slot"><span>Ring 1:</span> <span class="font-bold text-gray-400">None</span></li>
                    <li class="equip-slot"><span>Ring 2:</span> <span class="font-bold text-gray-400">None</span></li>
                    ${ characterLevel >= ring3Lvl 
                        ? `<li class="equip-slot"><span>Ring 3:</span> <span class="font-bold text-gray-400">None</span></li>`
                        : `<li class="equip-slot"><span>Ring 3:</span> <span class="font-bold text-red-500/70">Locked (Lv. ${ring3Lvl})</span></li>` }
                    ${ characterLevel >= ring4Lvl 
                        ? `<li class="equip-slot"><span>Ring 4:</span> <span class="font-bold text-gray-400">None</span></li>`
                        : `<li class="equip-slot"><span>Ring 4:</span> <span class="font-bold text-red-500/70">Locked (Lv. ${ring4Lvl})</span></li>` }
                </ul>
            </div>
        `;

        // Switch views
        selectView.classList.add('hidden');
        detailView.classList.remove('hidden');
    }

    /**
     * Handles all clicks within the storage panel using event delegation.
     * @param {Event} event The click event.
     */
    function handleStorageClick(event) {
        const button = event.target;
        const activeCharName = document.querySelector('#character-display .stat-item span.font-bold.text-white').textContent;
        const allChars = JSON.parse(localStorage.getItem('characters')) || [];
        const charIndex = allChars.findIndex(c => c.name === activeCharName);
        if (charIndex === -1) return;
        let character = allChars[charIndex];

        const updateAndRerender = () => {
            allChars[charIndex] = character;
            localStorage.setItem('characters', JSON.stringify(allChars));
            showCharacterDetails(character);
        };

        // --- Handle Split Item ---
        if (button.classList.contains('split-item-btn')) {
            const itemId = button.dataset.itemId;
            const itemToSplit = character.inventory.find(i => i.id === itemId);

            if (!itemToSplit || itemToSplit.quantity <= 1) return;

            const quantityToSplit = parseInt(prompt(`How many ${itemToSplit.name} do you want to split? (Max: ${itemToSplit.quantity - 1})`), 10);

            if (isNaN(quantityToSplit) || quantityToSplit <= 0 || quantityToSplit >= itemToSplit.quantity) {
                showInfoModal('Invalid Quantity', 'Please enter a number greater than 0 and less than the total stack size.', { type: 'error' });
                return;
            }

            // Reduce the original stack's quantity
            itemToSplit.quantity -= quantityToSplit;

            // Create a new item stack with the split quantity
            const newItem = {
                ...itemToSplit, // Copy properties from the original item
                id: generateUUID(), // Generate a new unique ID for the new stack
                quantity: quantityToSplit
            };

            // Add the new stack to the inventory
            character.inventory.push(newItem);

            updateAndRerender();
        }

    }

    // ========================================================================
    //  EVENT LISTENERS & DELEGATION
    // ========================================================================

    // --- Main Dashboard Click Handler (Event Delegation) ---
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.addEventListener('click', (event) => {
            const target = event.target;

            // --- Enter Game Button ---
            if (target.matches('.enter-game-btn')) {
                const charName = target.dataset.charName;
                const characterToEnter = userCharacters.find(c => c.name === charName);
                if (characterToEnter) {
                    localStorage.setItem('activeCharacter', JSON.stringify(characterToEnter));
                    showCharacterDetails(characterToEnter);
                }
                return;
            }

            // --- Delete Character Button ---
            if (target.matches('.delete-char-btn')) {
                const charName = target.dataset.charName;
                
                confirmationModal.show({
                    title: 'Delete Character',
                    message: `Are you sure you want to permanently delete <span class="font-bold text-white">${charName}</span>? This action cannot be undone.`,
                    typeToConfirm: charName,
                    onConfirm: () => {
                        let allChars = JSON.parse(localStorage.getItem('characters')) || [];
                        const updatedCharacters = allChars.filter(c => c.name !== charName);
                        localStorage.setItem('characters', JSON.stringify(updatedCharacters));
                        window.location.reload();
                    }
                });

                return;
            }

            // --- Back to Character Select Button ---
            if (target.matches('#back-to-select-btn') || target.matches('#back-to-select-btn-2')) {
                document.getElementById('character-select-view').classList.remove('hidden');
                document.getElementById('character-detail-view').classList.add('hidden');
                return;
            }
        });
    }

    // --- Storage Panel Click Handler (Event Delegation) ---
    const storagePanel = document.getElementById('character-storage-panel');
    if (storagePanel) {
        storagePanel.addEventListener('click', (event) => {
            handleStorageClick(event);
        });
    }

    // --- Delete Account Button ---
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        const deleteAccountModal = new Modal('delete-account-modal');
        deleteAccountBtn.addEventListener('click', () => {
            deleteAccountModal.show({
                title: 'DELETE ACCOUNT',
                message: 'This is a <span class="font-bold text-white">PERMANENT</span> action. You will lose your account and all characters. To confirm, type "DELETE" below.',
                confirmText: 'Yes, Delete My Account',
                typeToConfirm: 'DELETE',
                onConfirm: () => {
                    let registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
                    registeredUsers = registeredUsers.filter(user => user.username.toLowerCase() !== session.username.toLowerCase());
                    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

                    let allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
                    allCharacters = allCharacters.filter(char => char.owner.toLowerCase() !== session.username.toLowerCase());
                    localStorage.setItem('characters', JSON.stringify(allCharacters));

                    localStorage.removeItem('session');
                    window.location.href = 'index.html';
                }
            });
        });
    }

    // --- Logout Button ---
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        const logoutModal = new Modal('logout-modal');
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            logoutModal.show({
                title: 'Confirm Logout',
                message: 'Are you sure you want to end your session?',
                confirmText: 'Logout',
                onConfirm: () => {
                    localStorage.removeItem('session');
                    window.location.href = logoutButton.href;
                }
            });
        });
    }

    // ========================================================================
    //  INITIAL FADE-IN EFFECT
    // ========================================================================
    const content = document.getElementById('dashboard-content');
    if (content) content.style.opacity = '1'; // Trigger the fade-in effect defined in CSS

});