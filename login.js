import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserSessionPersistence, 
    browserLocalPersistence,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

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
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const email = this.elements.email.value;
            const password = this.elements.password.value;
            const emailInput = this.elements.email;
            const rememberMe = this.elements['remember-me'].checked;
            
            console.log(`[Firebase] Attempting login for email: ${email}`);

            // Set persistence (remember me)
            const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            setPersistence(auth, persistence)
              .then(() => {
                // Sign in with the provided email and password.
                return signInWithEmailAndPassword(auth, email, password);
              })
              .then(userCredential => {
                // Success! Redirect to the main page.
                console.log(`[Firebase] Login successful for user: ${userCredential.user.email}`);
                window.location.href = '/dashboard';
              })
              .catch(error => {
                // Handle any errors from the chain.
                console.error(`[Firebase] Login Error:`, error.message);
                showInfoModal('Login Failed', 'Invalid email or password.', { type: 'error' });
                emailInput.focus();
              });
        });
    }

    // --- Password Reset Flow ---
    const passwordResetForm = document.getElementById('password-reset-form');
    if (passwordResetForm) {
        passwordResetForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const messageDiv = document.getElementById('password-reset-message');
            const email = this.elements.email.value;

            console.log(`[Firebase] Sending password reset email to: ${email}`);
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    console.log('[Firebase] Password reset email sent.');
                    messageDiv.innerHTML = `<p class="font-bold text-green-400">✅ Password reset email sent! Please check your inbox.</p>`;
                })
                .catch((error) => {
                    console.error(`[Firebase] Password Reset Error: ${error.code}`, error.message);
                    if (error.code === 'auth/user-not-found') {
                        messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ No account found with that email address.</p>`;
                    } else {
                        messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ Error: ${error.message}</p>`;
                    }
                });
        });
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