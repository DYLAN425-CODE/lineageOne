/**
 * Fetches and parses the server.properties file.
 * @returns {Promise<object>} A promise that resolves to an object with the server properties.
 */
async function loadServerProperties() {
    // Default values in case the file is missing or fails to load
    const defaultProps = {
        MAX_CHARACTER_SLOTS: 6,
        STARTER_INVENTORY_JSON: '[{"name":"Adena","quantity":5000,"stackable":true,"price":1},{"name":"Red Potion","quantity":30,"stackable":true,"price":30},{"name":"Haste Potion","quantity":5,"stackable":true,"price":180},{"name":"Trainee\'s T-shirt","quantity":1,"stackable":false,"droppable":false,"price":100}]',
        FAVICON_PATH: 'icon/cs.ico',
    };
    try {
        const response = await fetch(`server.properties?v=${Date.now()}`);
        if (!response.ok) {
            console.warn('server.properties not found. Using default settings.');
            return defaultProps;
        }
        const text = await response.text();
        const properties = {};
        const numericKeys = ['MAX_CHARACTER_SLOTS'];

        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const separatorIndex = line.indexOf('=');
                if (separatorIndex === -1) return;

                const key = line.substring(0, separatorIndex).trim();
                let value = line.substring(separatorIndex + 1).trim();

                if (key) {
                    if (value.toLowerCase() === 'true') {
                        properties[key] = true;
                    } else if (value.toLowerCase() === 'false') {
                        properties[key] = false;
                    } else if (key.endsWith('_JSON')) {
                        try {
                            properties[key] = JSON.parse(value);
                        } catch (e) {
                            console.error(`Error parsing JSON for key ${key}:`, e);
                            properties[key] = defaultProps[key] ? JSON.parse(defaultProps[key]) : null;
                        }
                    } else if (numericKeys.includes(key) && !isNaN(Number(value))) {
                        properties[key] = Number(value);
                    } else {
                        properties[key] = value;
                    }
                }
            }
        });
        return { ...defaultProps, ...properties };
    } catch (error) {
        console.error('Failed to load server.properties:', error);
        return defaultProps;
    }
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
 * Generates a simple unique ID.
 * @returns {string} A unique identifier.
 */
function generateUUID() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

document.addEventListener('DOMContentLoaded', async () => {
    window.serverProperties = await loadServerProperties();

    // --- Favicon ---
    if (window.serverProperties.FAVICON_PATH) {
        const faviconIco = document.getElementById('favicon-ico');
        const faviconShortcut = document.getElementById('favicon-shortcut');
        if (faviconIco) faviconIco.href = window.serverProperties.FAVICON_PATH;
        if (faviconShortcut) faviconShortcut.href = window.serverProperties.FAVICON_PATH;
    }

    // --- Initial Check: User must be logged in and have slots available ---
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || Date.now() > session.expiry) {
        showInfoModal('Login Required', 'You must be logged in to create a character. You will be redirected to the main page.', {
            title: 'Login Required',
            message: 'You must be logged in to create a character. You will be redirected to the main page.',
            onOk: () => window.location.href = 'index.html'
        });
        return;
    }

    const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
    const userCharacterCount = allCharacters.filter(char => char.owner.toLowerCase() === session.username.toLowerCase()).length;
    const maxSlots = window.serverProperties.MAX_CHARACTER_SLOTS || 6;

    if (userCharacterCount >= maxSlots) {
        showInfoModal('Character Slots Full', 'You have reached the maximum number of characters. Please delete a character to create a new one.', {
            title: 'Character Slots Full',
            message: 'You have reached the maximum number of characters. Please delete a character to create a new one.',
            onOk: () => window.location.href = 'dashboard.html'
        });
        return;
    }

    // --- Character Creation Form ---
    const creationForm = document.getElementById('character-creation-form');
    const charNameInput = document.getElementById('charname');
    const charNameStatus = document.getElementById('charname-error');

    if (charNameInput && charNameStatus) {
        charNameInput.addEventListener('input', debounce(() => {
            const name = charNameInput.value.trim();
            if (name.length < 3) {
                charNameStatus.textContent = '';
                return;
            }
            const isTaken = allCharacters.some(char => char.name.toLowerCase() === name.toLowerCase());
            if (isTaken) {
                charNameStatus.innerHTML = `<span class="text-red-500">❌ Name is already taken.</span>`;
            } else {
                charNameStatus.innerHTML = `<span class="text-green-400">✅ Name is available!</span>`;
            }
        }, 500));
    }

    if (creationForm) {
        creationForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const messageDiv = document.getElementById('character-creation-message');

            const charName = this.elements.charname.value;
            const charGender = this.elements.gender.value;
            const charClass = document.getElementById('class-select').value;

            const currentCharacters = JSON.parse(localStorage.getItem('characters')) || [];

            if (currentCharacters.some(char => char.name.toLowerCase() === charName.toLowerCase())) {
                messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ Character name is already taken.</p>`;
                charNameInput.focus();
                return;
            }

            const currentUserCharacterCount = currentCharacters.filter(char => char.owner.toLowerCase() === session.username.toLowerCase()).length;
            if (currentUserCharacterCount >= maxSlots) {
                messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ Character slots are full. You cannot create more characters.</p>`;
                return;
            }

            const baseStats = {
                "Knight": { str: 18, con: 16, dex: 12, wis: 11, int: 9 },
                "Elf": { str: 12, con: 12, dex: 18, wis: 12, int: 12 },
                "Mage": { str: 9, con: 12, dex: 11, wis: 16, int: 18 },
                "Dark Elf": { str: 16, con: 12, dex: 15, wis: 10, int: 12 },
                "Dragon Knight": { str: 17, con: 17, dex: 11, wis: 10, int: 10 },
                "Warrior": { str: 18, con: 17, dex: 11, wis: 10, int: 9 },
                "Monarch": { str: 14, con: 14, dex: 14, wis: 14, int: 14 },
                "Princess": { str: 14, con: 14, dex: 14, wis: 14, int: 14 },
            };

            const newCharacter = {
                owner: session.username,
                name: charName,
                gender: charGender,
                class: charClass,
                stats: baseStats[charClass] || baseStats["Knight"],
                inventory: []
            };

            const starterInventory = window.serverProperties.STARTER_INVENTORY_JSON;
            newCharacter.inventory = starterInventory.map(item => ({ ...item, id: generateUUID() }));

            currentCharacters.push(newCharacter);
            localStorage.setItem('characters', JSON.stringify(currentCharacters));

            showInfoModal('Character Created!', 'Your new hero is ready for adventure. You will now be redirected to the dashboard.', {
                title: 'Character Created!',
                message: 'Your new hero is ready for adventure. You will now be redirected to the dashboard.',
                onOk: () => window.location.href = 'dashboard.html'
            });
        });
    }

    // --- Populate and Handle Character Class Selection ---
    const classSelectionGrid = document.getElementById('class-selection-grid');
    const classSelectDropdown = document.getElementById('class-select');

    if (classSelectionGrid && classSelectDropdown) {
        const classes = [
            { name: 'Monarch', icon: '👑' },
            { name: 'Knight', icon: '🛡️' },
            { name: 'Elf', icon: '🏹' },
            { name: 'Mage', icon: '🔮' },
            { name: 'Dark Elf', icon: '🗡️' },
            { name: 'Dragon Knight', icon: '🐉' },
            { name: 'Warrior', icon: '⚔️' }
        ];

        function renderClasses(previouslySelectedClass = null) {
            classSelectionGrid.innerHTML = '';
            classSelectDropdown.innerHTML = '';

            classes.forEach((cls, index) => {
                const card = document.createElement('div');
                card.className = 'class-card';
                card.dataset.value = cls.name;
                card.innerHTML = `
                    <div class="class-icon">${cls.icon}</div>
                    <div class="class-name">${cls.name}</div>
                `;

                const option = document.createElement('option');
                option.value = cls.name;
                option.textContent = cls.name;

                if (cls.name === previouslySelectedClass || (index === 0 && !previouslySelectedClass)) {
                    card.classList.add('selected');
                    option.selected = true;
                }

                card.addEventListener('click', () => {
                    document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    classSelectDropdown.value = cls.name;
                });

                classSelectionGrid.appendChild(card);
                classSelectDropdown.appendChild(option);
            });
        }

        renderClasses();

        const genderRadios = document.querySelectorAll('input[name="gender"]');
        genderRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const currentSelectedClass = classSelectDropdown.value;
                const selectedGender = document.querySelector('input[name="gender"]:checked').value;
                const monarchClass = classes.find(c => c.name === 'Monarch' || c.name === 'Princess');
                if (monarchClass) {
                    if (selectedGender === 'Female') {
                        monarchClass.name = 'Princess';
                    } else {
                        monarchClass.name = 'Monarch';
                    }
                    renderClasses(currentSelectedClass);
                }
            });
        });
    }
});