import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// ========================================================================
//  DOM CONTENT LOADED - All the code inside this function runs after the page has finished loading.
// ========================================================================
document.addEventListener('DOMContentLoaded', async () => {

    let isDashboardInitialized = false;
    let currentUser = null;

    const initializeDashboard = (user) => {
        if (isDashboardInitialized) {
            // If already initialized, just ensure the character select view is visible
            document.getElementById('character-select-view').classList.remove('hidden');
            document.getElementById('character-detail-view').classList.add('hidden');
            renderCharacterSlots(user); // Re-render slots in case a character was created/deleted
            return;
        }

        if (!user) {
            console.log('[Dashboard] No user found, redirecting to login.');
            window.location.href = '/login';
            return;
        }

        currentUser = user;

        renderCharacterSlots(user);
        // The `handleStorageClick` function relies on `server.properties`, so we ensure they are loaded.
        if (!window.serverProperties) {
            window.loadServerProperties().then(props => {
                window.serverProperties = props;
            });
        }
        setupEventListeners();
        isDashboardInitialized = true;
        console.log('[Debug] Dashboard initialized.');
    }

    /**
     * Generates a simple unique ID.
     * @returns {string} A unique identifier.
     */
    function generateUUID() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    async function renderCharacterSlots(user) {
        if (!user) return;

        // Use email for display, remove the domain part for a cleaner look
        const username = user.email.split('@')[0];
        document.getElementById('dashboard-username').textContent = username;

        const q = query(collection(db, "characters"), where("owner", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const userCharacters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const slotsContainer = document.getElementById('character-slots-container');
        const maxSlots = window.serverProperties?.MAX_CHARACTER_SLOTS || 6;

        slotsContainer.innerHTML = ''; // Clear existing slots before re-rendering

        for (let i = 0; i < maxSlots; i++) {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'character-slot rounded-lg p-6 flex flex-col justify-center items-center';

            if (userCharacters[i]) {
                const char = userCharacters[i];
                slotDiv.innerHTML = `
                    <h3 class="text-2xl font-bold text-white text-shadow">${char.charname}</h3>
                    <p class="text-gray-300 mt-1">Lv. 1 ${char.class}</p>
                    <div class="flex gap-2 mt-4">
                        <button data-char-id="${char.id}" class="enter-game-btn action-btn btn-blue text-sm">Enter Game</button>
                        <button data-char-id="${char.id}" data-char-name="${char.charname}" class="delete-char-btn action-btn btn-red text-sm">Delete</button>
                    </div>
                `;
            } else {
                slotDiv.innerHTML = `
                    <h3 class="text-2xl font-bold text-gray-500">Empty Slot</h3>
                    <p class="text-gray-400 mt-1">Available</p>
                    <a href="/create-character" class="create-char-btn mt-4 action-btn btn-green">Create Character</a>
                `;
            }
            slotsContainer.appendChild(slotDiv);
        }
    }

    /**
     * Shows the character details view.
     * @param {object} character The character object to display.
     */
    function showCharacterDetails(character) {
        const selectView = document.getElementById('character-select-view');
        const detailView = document.getElementById('character-detail-view');
        const displayContainer = document.getElementById('character-display');
        displayContainer.dataset.characterId = character.id; // Store character ID for later use

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

        // Get Adena count from inventory for display in the status panel
        const adenaItem = inventory.find(item => item.name === 'Adena');
        const adenaCount = adenaItem ? adenaItem.quantity : 0;

        // Populate the details
        displayContainer.innerHTML = `
            <!-- Character Status Column -->
            <div>
                <h2 class="text-2xl font-semibold mb-4 text-center text-yellow-500 text-shadow">Character Status</h2>
                <ul class="space-y-2 text-shadow">
                    <li class="stat-item flex justify-between"><span>Name:</span> <span class="font-bold text-white">${character.charname}</span></li>
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
                    ${ characterLevel >= 76 
                        ? `<li class="equip-slot"><span>Ring 3:</span> <span class="font-bold text-gray-400">None</span></li>`
                        : `<li class="equip-slot"><span>Ring 3:</span> <span class="font-bold text-red-500/70">Locked (Lv. 76)</span></li>` }
                    ${ characterLevel >= 81 
                        ? `<li class="equip-slot"><span>Ring 4:</span> <span class="font-bold text-gray-400">None</span></li>`
                        : `<li class="equip-slot"><span>Ring 4:</span> <span class="font-bold text-red-500/70">Locked (Lv. 81)</span></li>` }
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
    async function handleStorageClick(event) {
        const button = event.target;
        const charId = document.getElementById('character-display').dataset.characterId;

        // Ensure user is still logged in before any write operation
        if (!auth.currentUser || !charId) {
            showInfoModal('Error', 'Character or user session not found. Please try again.', { type: 'error' });
            return;
        }

        const charDocRef = doc(db, "characters", charId);

        // --- Handle Split Item ---
        if (button.classList.contains('split-item-btn')) {
            const itemId = button.dataset.itemId;
            try {
                const charDoc = await getDoc(charDocRef);
                if (!charDoc.exists()) throw new Error("Character not found.");

                let character = { id: charDoc.id, ...charDoc.data() };
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
                    ...itemToSplit,
                    id: generateUUID(),
                    quantity: quantityToSplit
                };
                character.inventory.push(newItem);

                // Update the document in Firestore
                await updateDoc(charDocRef, { inventory: character.inventory });

                // Re-render the details view with the updated character data
                showCharacterDetails(character);
                showInfoModal('Success', `Successfully split ${quantityToSplit} ${itemToSplit.name}.`);
            } catch (error) {
                console.error("Error splitting item:", error);
                showInfoModal('Error', `Could not split item. ${error.message}`, { type: 'error' });
            }
        }

        // --- Handle Combine Stacks ---
        if (button.id === 'combine-stacks-btn') {
            try {
                const charDoc = await getDoc(charDocRef);
                if (!charDoc.exists()) throw new Error("Character not found.");

                let character = { id: charDoc.id, ...charDoc.data() };
                const inventory = character.inventory || [];
                
                const combinedInventory = [];
                const stackableItems = new Map();

                // Separate non-stackable and process stackable items
                for (const item of inventory) {
                    if (item.stackable) {
                        const key = item.name; // Combine based on name
                        if (stackableItems.has(key)) {
                            stackableItems.get(key).quantity += item.quantity;
                        } else {
                            // Store a copy to avoid mutation issues
                            stackableItems.set(key, { ...item });
                        }
                    } else {
                        combinedInventory.push(item);
                    }
                }

                // Add the combined stacks back to the inventory
                combinedInventory.push(...stackableItems.values());

                await updateDoc(charDocRef, { inventory: combinedInventory });
                character.inventory = combinedInventory; // Update local character object
                showCharacterDetails(character); // Re-render
                showInfoModal('Success', 'All stackable items have been combined.');
            } catch (error) {
                console.error("Error combining stacks:", error);
                showInfoModal('Error', `Could not combine items. ${error.message}`, { type: 'error' });
            }
        }

    }

    // ========================================================================
    //  EVENT LISTENERS & DELEGATION
    // ========================================================================
    function setupEventListeners() {
        const dashboardContent = document.getElementById('dashboard-content');
        if (!dashboardContent) return; // Guard clause

        dashboardContent.addEventListener('click', async (event) => {
            const target = event.target;
            if (!currentUser) return;

            // --- Enter Game Button ---
            if (target.matches('.enter-game-btn')) {
                const charId = target.dataset.charId;
                const charDoc = await getDoc(doc(db, "characters", charId));
                if (charDoc.exists()) {
                    const characterData = { id: charDoc.id, ...charDoc.data() };
                    showCharacterDetails(characterData);
                }
                return;
            }

            // --- Delete Character Button ---
            if (target.matches('.delete-char-btn')) {
                const charName = target.dataset.charName;
                const charId = target.dataset.charId;
                showConfirmModal({
                    title: 'Delete Character',
                    message: `Are you sure you want to permanently delete <span class="font-bold text-white">${charName}</span>? This action cannot be undone.`,
                    typeToConfirm: charName,
                    onConfirm: async () => {
                        await deleteDoc(doc(db, "characters", charId));
                        showInfoModal('Success', `Character ${charName} has been deleted.`);
                        renderCharacterSlots(currentUser); // Re-render the slots view
                    }
                });
                return;
            }

            // --- Logout Button ---
            if (target.matches('#logout-btn')) {
                event.preventDefault();
                showConfirmModal({ title: 'Confirm Logout', message: 'Are you sure you want to end your session?', onConfirm: () => auth.signOut() });
                return;
            }

            // --- Back to Character Select Button ---
            if (target.matches('#back-to-select-btn-2')) {
                document.getElementById('character-select-view').classList.remove('hidden');
                document.getElementById('character-detail-view').classList.add('hidden');
                renderCharacterSlots(currentUser); // Re-render to ensure data is fresh
                return;
            }

            // --- Delete Account Button ---
            // This logic needs to be updated to use Firebase Auth functions
            if (target.matches('#delete-account-btn')) {
                showConfirmModal({
                    title: 'DELETE ACCOUNT',
                    message: 'This is a <span class="font-bold text-white">PERMANENT</span> action. You will lose your account and all characters. This cannot be undone.',
                    typeToConfirm: 'DELETE',
                    onConfirm: async () => {
                        const user = auth.currentUser;
                        if (!user) {
                            showInfoModal('Error', 'You must be logged in to delete an account.', { type: 'error' });
                            return;
                        }
                        try {
                            // 1. Find and delete all characters owned by the user.
                            const q = query(collection(db, "characters"), where("owner", "==", user.uid));
                            const querySnapshot = await getDocs(q);
                            const deletePromises = querySnapshot.docs.map(charDoc => deleteDoc(charDoc.ref));
                            await Promise.all(deletePromises);
                            console.log(`[Auth] Deleted ${deletePromises.length} characters for user ${user.uid}.`);

                            // 2. Delete the user from Firebase Authentication.
                            await deleteUser(user);
                            showInfoModal('Success', 'Your account has been permanently deleted.');
                            // onAuthStateChanged will automatically redirect to the login page.
                        } catch (error) {
                            console.error("Error deleting account:", error);
                            showInfoModal('Error', `Could not delete account. You may need to log out and log back in to perform this action. Error: ${error.message}`, { type: 'error' });
                        }
                    }
                });
                return;
            }
        });

        // --- Storage Panel Click Handler (Event Delegation) ---
        const storagePanel = document.getElementById('character-storage-panel');
        storagePanel.addEventListener('click', (event) => {
            handleStorageClick(event);
        });
    }

    // Listen for Firebase Auth state changes to initialize the dashboard
    onAuthStateChanged(auth, (user) => {
        const dashboardContent = document.getElementById('dashboard-content');
        if (user) {
            // User is signed in, initialize the dashboard
            dashboardContent.style.opacity = 1; // Make it visible
            initializeDashboard(user);
        } else {
            // No user is signed in, redirect to login.
            window.location.href = '/';
        }
    });
});