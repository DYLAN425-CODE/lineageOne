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

document.addEventListener('DOMContentLoaded', () => {
    // Use a flag to ensure initialization only runs once, triggered by the form becoming visible.
    let isCharCreateInitialized = false;
    const creationFormSection = document.getElementById('characterCreationForm');

    const initializeCharacterCreation = () => {
        if (isCharCreateInitialized) return;

        // serverProperties is now loaded globally by script.js
        const serverProps = window.serverProperties;
        if (!serverProps) {
            console.error("[Char Create] serverProperties not available.");
            // Optionally show an error and close the form
            showInfoModal('Error', 'Could not load server configuration. Please try again later.', { onOk: () => toggleForm('characterCreationForm') });
            return;
        }

        // --- Initial Check: User must be logged in and have slots available ---
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || Date.now() > session.expiry) {
            showInfoModal('Login Required', 'You must be logged in to create a character.', {
                onOk: () => {
                    toggleForm('characterCreationForm'); // Close create form
                    toggleForm('loginForm'); // Open login form
                }
            });
            return;
        }

        const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
        const userCharacterCount = allCharacters.filter(char => char.owner.toLowerCase() === session.username.toLowerCase()).length;
        const maxSlots = serverProps.MAX_CHARACTER_SLOTS || 6;

        if (userCharacterCount >= maxSlots) {
            showInfoModal('Character Slots Full', 'You have reached the maximum number of characters. Please delete one from the dashboard to create a new one.', {
                onOk: () => {
                    // Close the form and redirect to the dashboard
                    toggleForm('characterCreationForm');
                    window.location.href = 'dashboard.html';
                }
            });
            return;
        }

        // Populate classes and set up listeners
        populateAndHandleClassSelection();
        isCharCreateInitialized = true;
        console.log('[Debug] Character Creation form initialized.');
    };

    // --- Character Creation Form ---
    const creationForm = document.getElementById('character-creation-form');
    const charNameInput = document.getElementById('charname');
    const charNameStatus = document.getElementById('charname-error');

    if (charNameInput && charNameStatus) {
        charNameInput.addEventListener('input', debounce(() => {
            const allCharacters = JSON.parse(localStorage.getItem('characters')) || [];
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
            const session = JSON.parse(localStorage.getItem('session')); // Re-check session on submit
            const serverProps = window.serverProperties;
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
            if (currentUserCharacterCount >= (serverProps.MAX_CHARACTER_SLOTS || 6)) {
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

            const starterInventory = serverProps.STARTER_INVENTORY_JSON;
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

    // Use a MutationObserver to initialize the form only when it becomes visible.
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class' && !creationFormSection.classList.contains('hidden')) {
                initializeCharacterCreation();
            }
        }
    });
    if (creationFormSection) observer.observe(creationFormSection, { attributes: true });
});