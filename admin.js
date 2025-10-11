document.addEventListener('DOMContentLoaded', () => {

    // ========================================================================
    //  SECURITY GATEKEEPER
    // ========================================================================
    // This is a front-end simulation of an authorization check.
    // In a real application, this would be handled by the server.

    const checkAdminAccess = () => {
        const session = JSON.parse(localStorage.getItem('session'));
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        
        if (!session || Date.now() > session.expiry) {
            return false; // Not logged in
        }

        const currentUser = registeredUsers.find(u => u.username.toLowerCase() === session.username.toLowerCase());

        return currentUser && currentUser.isAdmin === true;
    };

    if (!checkAdminAccess()) {
        // If not an admin, hide the main content and show an access denied message.
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="text-center py-20">
                    <h1 class="text-4xl font-bold text-red-500">Access Denied</h1>
                    <p class="text-gray-400 mt-4">You do not have permission to view this page.</p>
                    <a href="index.html" class="mt-8 inline-block action-btn btn-blue">Return to Main Page</a>
                </div>
            `;
        }
        return; // Stop the rest of the script from executing
    }

    // Note on storage: For a real, large-scale application, IndexedDB would be a better choice
    // than localStorage for handling larger datasets and more complex queries efficiently.
    // This implementation uses localStorage for simplicity and demonstration purposes.

    // We will now use the main 'registeredUsers' key to work with real data.
    const ACCOUNTS_STORAGE_KEY = 'registeredUsers';

    /**
     * Loads accounts from localStorage or initializes with default data.
     * @returns {Array} The list of accounts.
     */
    const loadAccounts = () => {
        const registeredUsers = JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY)) || [];

        // Map the registeredUsers to the format our admin panel expects.
        // This adds the necessary fields if they don't exist.
        return registeredUsers.map(user => ({
            account: user.username,
            email: user.email, // Keep email for potential future use
            // Add default values for monitoring fields if they are missing
            status: user.status || 'Offline',
            banned: user.banned || false,
            lastLogin: user.lastLogin || 'Never',
            device: user.device || 'Unknown'
        }));
    };

    /**
     * Saves the current list of accounts to localStorage.
     * @param {Array} accountList The list of accounts to save.
     */
    const saveAccounts = (accountList) => {
        // When saving, we need to update the original 'registeredUsers' data.
        const registeredUsers = JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY)) || [];

        accountList.forEach(adminAcc => {
            const userToUpdate = registeredUsers.find(u => u.username === adminAcc.account);
            if (userToUpdate) {
                userToUpdate.banned = adminAcc.banned;
                // We don't overwrite status, lastLogin, or device here, as the login script handles it.
            }
        });

        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(registeredUsers));
    };

    // Load accounts when the script starts
    let accounts = loadAccounts();

    const tbody = document.querySelector("#accountTable tbody");

    // UI Elements for filtering and searching
    const searchInput = document.getElementById('account-search');
    const filterBannedCheckbox = document.getElementById('filter-banned');

    /**
     * Renders the account data into the table.
     * @param {Array} accountList The list of accounts to render.
     */
    function renderTable(accountList) {
        tbody.innerHTML = ''; // Clear existing rows before rendering

        if (accountList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">No accounts match the current filters.</td></tr>`;
            return;
        }

        accountList.forEach(acc => {
            const tr = document.createElement("tr");
            const banButtonText = acc.banned ? 'Unban' : 'Ban';
            // Use small action buttons defined in style.css
            const banButtonClass = acc.banned ? 'btn-green' : 'btn-red';

            tr.innerHTML = `
                <td class="font-semibold text-white">${acc.account}</td>
                <td class="${acc.status === 'Online' ? 'status-online' : 'status-offline'}">${acc.status}</td>
                <td class="${acc.banned ? 'banned-yes' : ''}">${acc.banned ? "Yes" : "No"}</td>
                <td>${acc.lastLogin === 'Never' ? 'Never' : new Date(acc.lastLogin).toLocaleString()}</td>
                <td class="text-sm text-gray-400" title="${acc.device}">
                    ${acc.device.substring(0, 30)}${acc.device.length > 30 ? '...' : ''}
                </td>
                <td class="p-3">
                    <button data-account="${acc.account}" class="action-btn-sm ${banButtonClass} ban-toggle-btn">${banButtonText}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    /**
     * Toggles the ban status of an account, saves the change, and re-renders the table.
     * @param {string} accountName The name of the account to toggle.
     */
    function toggleBan(accountName) {
        const user = accounts.find(acc => acc.account === accountName);
        if (user) {
            const action = user.banned ? 'unban' : 'ban';
            showConfirmModal({
                title: `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`,
                message: `Are you sure you want to ${action} the account <span class="font-bold text-white">${accountName}</span>?`,
                onConfirm: () => {
                    user.banned = !user.banned;
                    // The status will be updated automatically on the next login/logout event.
                    // For now, we just update the 'banned' flag.
                    saveAccounts(accounts); // Save the updated array to localStorage
                    accounts = loadAccounts(); // Reload from the source of truth
                    applyFiltersAndRender(); // Re-render the table
                }
            });
        }
    }

    /**
     * Applies current filters (search and banned status) and re-renders the table.
     */
    function applyFiltersAndRender() {
        const searchTerm = searchInput.value.toLowerCase();
        const showBannedOnly = filterBannedCheckbox.checked;

        let filteredAccounts = accounts;

        if (showBannedOnly) {
            filteredAccounts = filteredAccounts.filter(acc => acc.banned);
        }

        if (searchTerm) {
            filteredAccounts = filteredAccounts.filter(acc => acc.account.toLowerCase().includes(searchTerm));
        }

        renderTable(filteredAccounts);
    }

    // Initial render of the table
    applyFiltersAndRender();

    // Use event delegation to handle clicks on the ban/unban buttons
    tbody.addEventListener('click', (event) => {
        if (event.target.classList.contains('ban-toggle-btn')) {
            const accountName = event.target.dataset.account;
            toggleBan(accountName);
        }
    });

    // Event listeners for search and filter controls
    searchInput.addEventListener('input', () => applyFiltersAndRender());
    filterBannedCheckbox.addEventListener('change', () => applyFiltersAndRender());

    // Event listener for the reset data button
    document.getElementById('reset-data-btn').addEventListener('click', () => {
        showConfirmModal({
            title: 'Reset Account Data',
            message: 'Are you sure you want to reset all account data to the default state? This will clear any changes you have made.',
            onConfirm: () => {
                // This function is now more dangerous as it modifies real user data.
                // For a real app, this might be disabled or require higher privileges.
                // For now, we'll just log a warning.
                console.warn("Reset Data was clicked. In a real app, this would be a protected action.");
                accounts = loadAccounts(); // Reload the initial data
                applyFiltersAndRender();
            }
        });
    });
});