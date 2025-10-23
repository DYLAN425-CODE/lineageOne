document.addEventListener('DOMContentLoaded', () => {
    const loginFormSection = document.getElementById('loginForm');
    const passwordResetSection = document.getElementById('passwordResetFlow');

    // --- Check for registration success message ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reg') === 'success') {
        const loginMessage = document.getElementById('login-message');
        if (loginMessage) loginMessage.innerHTML = `<p class="font-bold text-green-400">✅ Registration Successful! Please log in.</p>`;
    }

    // --- Login Form ---
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            loginMessage.innerHTML = ''; // Clear previous messages

            const email = this.elements.email.value.trim();
            const password = this.elements.password.value;
            const emailInput = this.elements.email;

            // --- Local Storage Authentication Logic ---
            console.log(`[LocalAuth] Attempting login for email: ${email}`);

            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            const user = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (!user) {
                console.warn(`[LocalAuth] Login failed: User not found for email ${email}`);
                showInfoModal('Login Failed', 'Invalid email or password.', { type: 'error' });
                emailInput.focus();
                return;
            }

            // Check if user is banned
            if (user.banned) {
                console.warn(`[LocalAuth] Login failed: User ${email} is banned.`);
                showInfoModal('Account Banned', 'This account has been banned. Please contact support for assistance.', { type: 'error' });
                return;
            }

            // Hash the entered password and compare it with the stored hash
            const hashedPassword = await window.simpleHash(password);

            if (hashedPassword === user.password) {
                // --- Login Successful ---
                console.log(`[LocalAuth] Login successful for user: ${user.email}`);

                // Update user's status in the main user list
                user.lastLogin = new Date().toISOString();
                user.status = 'Online';
                user.device = navigator.userAgent; // Store user agent as device info
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

                // Create a session object (without the password)
                const sessionUser = {
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin
                };
                sessionStorage.setItem('loggedInUser', JSON.stringify(sessionUser));

                window.location.href = 'dashboard.html';
            } else {
                // --- Login Failed ---
                console.warn(`[LocalAuth] Login failed: Incorrect password for ${email}`);
                showInfoModal('Login Failed', 'Invalid email or password.', { type: 'error' });
                emailInput.focus();
            }
        });
    }

    // --- Password Reset Flow ---
    // This functionality is not yet implemented in the new backend.
    // The button is already hidden in the HTML, so we'll just ensure the section is hidden.
    const forgotPasswordButton = document.getElementById('forgot-password-button');
    if (forgotPasswordButton) {
        forgotPasswordButton.parentElement.classList.add('hidden');
    }
    if (passwordResetSection) {
        passwordResetSection.classList.add('hidden');
    }

    // --- Toggle between Login and Password Reset forms ---
    document.getElementById('forgot-password-button')?.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormSection.classList.add('hidden');
        passwordResetSection.classList.remove('hidden');
    });

    document.getElementById('back-to-login-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        passwordResetSection.classList.add('hidden');
        loginFormSection.classList.remove('hidden');
    });
});