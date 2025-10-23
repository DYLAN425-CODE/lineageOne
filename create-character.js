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
 * Generates a simple unique ID.
 * @returns {string} A unique identifier.
 */
function generateUUID() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

document.addEventListener('DOMContentLoaded', async () => {
    // This page requires a logged-in user. Check the session from local storage.
    const user = window.checkSession();

    if (user) {
        // User is signed in, proceed with initialization.
        await initializeCharacterCreation(user);
    } else {
        // No user is signed in. Redirect to login.
        showInfoModal('Login Required', 'You must be logged in to create a character.', {
            onOk: () => { window.location.href = 'login.html'; }
        });
    }
});

async function initializeCharacterCreation(user) {
    // serverProperties should be loaded by script.js, which is included on the page.
    // We might need to wait for it if it's not ready.
    if (!window.serverProperties) {
        window.serverProperties = await window.loadServerProperties();
    }
    const serverProps = window.serverProperties;

    // --- Check if user has available character slots ---
    const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
    const userCharacters = allCharacters.filter(char => char.owner.toLowerCase() === user.email.toLowerCase());
    const userCharacterCount = userCharacters.length;

    const maxSlots = serverProps.MAX_CHARACTER_SLOTS || 6;

    if (userCharacterCount >= maxSlots) {
        showInfoModal('Character Slots Full', 'You have reached the maximum number of characters. Please delete one from the dashboard to create a new one.', {
            onOk: () => { window.location.href = 'dashboard.html'; }
        });
        // Disable the form to prevent submission
        document.getElementById('character-creation-form').querySelectorAll('input, button, select').forEach(el => el.disabled = true);
        return;
    }

    // Populate classes and set up listeners
    populateAndHandleClassSelection();
    setupFormListeners(user, serverProps);
    console.log('[Debug] Character Creation page initialized.');
}

function setupFormListeners(user, serverProps) {
    // --- Character Creation Form ---
    const creationForm = document.getElementById('character-creation-form');
    const charNameInput = document.getElementById('charname');
    const charNameStatus = document.getElementById('charname-error');

    if (charNameInput && charNameStatus) {
        charNameInput.addEventListener('input', debounce(async () => {
            const name = charNameInput.value.trim();
            if (name.length < 3) {
                charNameStatus.textContent = '';
                return;
            }
            // Check against local storage
            const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
            const isTaken = allCharacters.some(char => char.charname_lowercase === name.toLowerCase());
            
            if (isTaken) {
                charNameStatus.innerHTML = `<span class="text-red-500">❌ Name is already taken.</span>`;
            } else {
                charNameStatus.innerHTML = `<span class="text-green-400">✅ Name is available!</span>`;
            }
        }, 500));
    }

    if (creationForm) {
        creationForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const messageDiv = document.getElementById('character-creation-message');

            const charName = this.elements.charname.value.trim();
            const charGender = this.elements.gender.value;
            const charClass = document.getElementById('class-select').value;

            // Final check for name availability on submit
            const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
            if (allCharacters.some(char => char.charname_lowercase === charName.toLowerCase())) {
                messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ Character name is already taken.</p>`;
                charNameInput.focus();
                return;
            }

            const baseStats = {
                "Knight": { str: 18, con: 16, dex: 12, wis: 11, int: 9, cha: 10 },
                "Elf": { str: 12, con: 12, dex: 18, wis: 12, int: 12, cha: 10 },
                "Mage": { str: 9, con: 12, dex: 11, wis: 16, int: 18, cha: 8 },
                "Dark Elf": { str: 16, con: 12, dex: 15, wis: 10, int: 12, cha: 9 },
                "Dragon Knight": { str: 17, con: 17, dex: 11, wis: 10, int: 10, cha: 8 },
                "Warrior": { str: 18, con: 17, dex: 11, wis: 10, int: 9, cha: 8 },
                "Monarch": { str: 14, con: 14, dex: 14, wis: 14, int: 14, cha: 14 },
                "Princess": { str: 14, con: 14, dex: 14, wis: 14, int: 14, cha: 14 },
            };

            const newCharacter = {
                id: generateUUID(), // Assign a persistent unique ID on creation
                owner: user.email, // Use email as the owner identifier
                charname: charName,
                charname_lowercase: charName.toLowerCase(), // For case-insensitive queries
                gender: charGender,
                class: charClass,
                stats: baseStats[charClass] || baseStats["Knight"],
                inventory: []
            };

            const starterInventory = serverProps.STARTER_INVENTORY_JSON;
            newCharacter.inventory = starterInventory.map(item => ({ ...item, id: generateUUID() }));

            try {
                // Save to local storage
                const existingCharacters = JSON.parse(localStorage.getItem('characters')) || [];
                existingCharacters.push(newCharacter);
                localStorage.setItem('characters', JSON.stringify(existingCharacters));

                showInfoModal('Character Created!', 'Your new hero is ready for adventure. You will now be redirected to the dashboard.', {
                    onOk: () => { window.location.href = 'dashboard.html'; }
                });
            } catch (error) {
                console.error("Error adding character to Firestore: ", error);
                showInfoModal('Error', 'Could not create character. Please try again.', { type: 'error' });
            }
        });
    }
}

// --- Populate and Handle Character Class Selection ---
function populateAndHandleClassSelection() {
    const classSelectionGrid = document.getElementById('class-selection-grid');
    const classSelectDropdown = document.getElementById('class-select');

    if (!classSelectionGrid || !classSelectDropdown) return;

    // Check if classes are already rendered to prevent duplication
    if (classSelectionGrid.children.length > 0) return;

    const classes = [
        { name: 'Monarch', icon: '👑' }, { name: 'Knight', icon: '🛡️' },
        { name: 'Elf', icon: '🏹' }, { name: 'Mage', icon: '🔮' },
        { name: 'Dark Elf', icon: '🗡️' }, { name: 'Dragon Knight', icon: '🐉' },
        { name: 'Warrior', icon: '⚔️' }
    ];

    const renderClasses = (previouslySelectedClass = null) => {
        classSelectionGrid.innerHTML = ''; // Clear previous cards
        classSelectDropdown.innerHTML = ''; // Clear previous options

        classes.forEach((cls, index) => {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.dataset.value = cls.name;
            card.innerHTML = `<div class="class-icon">${cls.icon}</div><div class="class-name">${cls.name}</div>`;

            card.addEventListener('click', () => {
                document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                classSelectDropdown.value = cls.name;
            });

            const option = document.createElement('option');
            option.value = cls.name;
            option.textContent = cls.name;

            if (cls.name === previouslySelectedClass || (index === 0 && !previouslySelectedClass)) {
                card.classList.add('selected');
                option.selected = true;
            }

            classSelectionGrid.appendChild(card);
            classSelectDropdown.appendChild(option);
        });
    };

    renderClasses();

    const genderRadios = document.querySelectorAll('input[name="gender"]');
    genderRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedGender = document.querySelector('input[name="gender"]:checked').value;
            const monarchClass = classes.find(c => c.name === 'Monarch' || c.name === 'Princess');
            if (monarchClass) {
                monarchClass.name = (selectedGender === 'Female') ? 'Princess' : 'Monarch';
                renderClasses(classSelectDropdown.value); // Re-render with the correct gender-specific class name
            }
        });
    });
}