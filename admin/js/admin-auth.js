// Shared by both admin/login.html and admin/dashboard.html.
// - On the login page (has #login-form): wires up sign-in, redirects to
//   dashboard.html once authenticated.
// - On the dashboard (no #login-form): guards access, bouncing back to
//   login.html if there's no signed-in user, and wires the logout button.

import { auth } from '../../js/firebase-init.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const loginForm = document.getElementById('login-form');

if (loginForm) {
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('show');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';

    const email = document.getElementById('f-email').value;
    const password = document.getElementById('f-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorEl.textContent = 'Incorrect email or password.';
      errorEl.classList.add('show');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  // If already signed in, skip straight to the dashboard.
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = 'dashboard.html';
  });
} else {
  // Dashboard guard.
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    document.body.classList.add('admin-ready');
    const emailEl = document.getElementById('admin-user-email');
    if (emailEl) emailEl.textContent = user.email;
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'login.html';
    });
  }
}
