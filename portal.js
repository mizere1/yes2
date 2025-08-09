import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const portalContainer = document.querySelector('.portal-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutButton = document.getElementById('logout-button');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            authSection.classList.add('hidden');
            portalContainer.classList.remove('hidden');

            const userDbRef = ref(db, 'users/' + user.uid);
            get(userDbRef).then((snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    const profilePictureEl = document.getElementById('profile-picture');
                    if (profilePictureEl) {
                        profilePictureEl.src = userData.profilePictureURL || '#';
                    }
                    const userNameEl = document.getElementById('user-name');
                    if (userNameEl) {
                        userNameEl.textContent = userData.displayName || 'N/A';
                    }
                    const userEmailEl = document.getElementById('user-email');
                    if (userEmailEl) {
                        userEmailEl.textContent = userData.email || 'N/A';
                    }
                }
            });

            logoutButton.addEventListener('click', () => {
                signOut(auth).then(() => {
                    // Sign-out successful.
                }).catch((error) => {
                    console.error('Logout error:', error);
                });
            });

        } else {
            // User is signed out.
            authSection.classList.remove('hidden');
            portalContainer.classList.add('hidden');
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error(errorCode, errorMessage);
            });
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = signupForm['signup-name'].value;
        const email = signupForm['signup-email'].value;
        const password = signupForm['signup-password'].value;
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                const userDbRef = ref(db, 'users/' + user.uid);
                set(userDbRef, {
                    displayName: name,
                    email: email,
                    role: 'student'
                });
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error(errorCode, errorMessage);
            });
    });
});
