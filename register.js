import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registration-form');
    const errorMessageDiv = document.getElementById('error-message');
    if (!registrationForm) return;

    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        errorMessageDiv.textContent = ''; // Clear previous errors

        const emailInput = registrationForm.elements['email'];
        const passwordInput = registrationForm.elements['password'];

        const email = emailInput.value;
        const password = passwordInput.value;

        createUserWithEmailAndPassword(auth, email, password).then((userCredential) => {
            const user = userCredential.user;
            // Ensure we have a valid user object before writing to Firestore.
            if (!user || !user.uid) {
                throw new Error("User creation failed, cannot save user data.");
            }

            console.log("Registered user:", user.uid, user.email);

            // Create a document in the 'users' collection to store user-specific data if needed in the future.
            const userDocRef = doc(db, "users", user.uid);
            return setDoc(userDocRef, {
                email: user.email,
                createdAt: new Date()
            }).then(() => user);
        }).then((user) => {
            // Success! Redirect to login page with a success message.
            console.log(`Successfully created account for ${user.email}`);
            window.location.href = '/login?reg=success';
        }).catch((error) => {
            console.error("Error creating account:", error);
            let friendlyMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                friendlyMessage = 'This email address is already registered.';
            } else if (error.code === 'auth/weak-password') {
                friendlyMessage = 'Password should be at least 6 characters.';
            }
            errorMessageDiv.textContent = `Error: ${friendlyMessage}`;
        });
    });
});