import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registration-form');
    const errorMessageDiv = document.getElementById('error-message');
    if (!registrationForm) return;

    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailInput = registrationForm.elements['email'];
        const passwordInput = registrationForm.elements['password'];

        const email = emailInput.value;
        const password = passwordInput.value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Registered user:", user);
                // Redirect to login page with a success message
                window.location.href = 'login.html?reg=success';
            })
            .catch((error) => {
                console.error("Error creating account:", error.code, error.message);
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = `Error: ${error.message}`;
                }
            });
    });
});