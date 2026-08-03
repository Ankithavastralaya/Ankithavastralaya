// Footer "email updates" opt-in — separate from the wishlist notify bar.
// Saves to Firestore (newsletterSubscribers) for the owner to send updates
// to manually; no automated sending is wired up on this list yet.

import { db } from './firebase-init.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  const emailInput = document.getElementById('newsletter-email');
  const msg = document.getElementById('newsletter-msg');
  const btn = form.querySelector('button');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Please enter a valid email.';
      msg.style.color = 'var(--dusty-rose)';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await addDoc(collection(db, 'newsletterSubscribers'), {
        email,
        createdAt: new Date().toISOString()
      });
      emailInput.value = '';
      msg.textContent = "Thanks — you're on the list!";
      msg.style.color = '#9fe0b8';
    } catch (err) {
      console.error('Failed to save newsletter signup:', err);
      msg.textContent = 'Something went wrong — please try again.';
      msg.style.color = 'var(--dusty-rose)';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Subscribe';
    }
  });
});
