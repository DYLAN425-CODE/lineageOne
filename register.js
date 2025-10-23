document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registration-form');
    const errorMessageDiv = document.getElementById('error-message');
    if (!registrationForm) return;

    registrationForm.addEventListener('submit', async (e) => { // Made event listener async
        e.preventDefault();
        errorMessageDiv.textContent = ''; // Clear previous errors

        const emailInput = registrationForm.elements['email'];
        const passwordInput = registrationForm.elements['password'];

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // --- Client-Side Validation for immediate feedback ---
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessageDiv.textContent = 'Please enter a valid email address.';
            emailInput.focus();
            return;
        }

        if (password.length < 6) {
            errorMessageDiv.textContent = 'Password must be at least 6 characters long.';
            passwordInput.focus();
            return;
        }

        // --- Local Storage Logic ---
        const loadRegisteredUsers = () => JSON.parse(localStorage.getItem('registeredUsers')) || [];
        const saveRegisteredUsers = (users) => localStorage.setItem('registeredUsers', JSON.stringify(users));

        let registeredUsers = loadRegisteredUsers();

        // Check if email already exists
        if (registeredUsers.some(user => user.email.toLowerCase() === email.toLowerCase())) {
            errorMessageDiv.textContent = 'This email address is already registered.';
            return;
        }

        try {
            // Hash the password using the globally available simpleHash function from script.js
            const hashedPassword = await window.simpleHash(password);

            // Create new user object for local storage
            const newUser = {
                username: email.split('@')[0],
                email: email,
                password: hashedPassword,
                isAdmin: false,
                banned: false,
                status: 'Offline',
                lastLogin: 'Never',
                device: 'Unknown',
                createdAt: new Date().toISOString()
            };

            registeredUsers.push(newUser);
            saveRegisteredUsers(registeredUsers);

            console.log("Registered user locally:", newUser.email);
            showSuccessModal('Registration Successful', 'Your account has been created! You will now be taken to the login page.', {
                onOk: () => { window.location.href = 'login.html?reg=success'; }
            });
        } catch (error) {
            console.error("Error creating account locally:", error);
            errorMessageDiv.textContent = `Error: Could not register account. Please try again.`;
        }
    });
});