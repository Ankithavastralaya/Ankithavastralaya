// Small, deliberately low-key "notify me about my wishlist" bar — appears
// as a quiet bell pill (bottom-left, out of the way of the WhatsApp float
// and mini-cart bar) whenever the customer has at least one wishlisted
// item and hasn't already given contact details this device. Tapping it
// expands to a tiny email/phone form; submitting saves to Firestore
// (notifyRequests) for the owner to reach out manually once an item is
// back in stock. Collapsing back to the pill (the X) never fully hides it
// — it just isn't a form anymore — matching "don't disturb them."

import { db } from './firebase-init.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const SUBMITTED_KEY = 'av_notify_submitted';

function ensureNotifyBar() {
  if (document.getElementById('wishlist-notify-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'wishlist-notify-bar';
  bar.className = 'wishlist-notify-bar';
  bar.innerHTML = `
    <button type="button" class="wnb-pill" id="wnb-pill" aria-label="Get notified about your wishlist">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span>Notify me when available</span>
    </button>
    <div class="wnb-form" id="wnb-form" style="display:none;">
      <button type="button" class="wnb-close" id="wnb-close" aria-label="Close">&times;</button>
      <p class="wnb-form-label">We'll message you when your wishlisted items are back in stock.</p>
      <input type="email" id="wnb-email" placeholder="Email (optional)">
      <input type="tel" id="wnb-phone" placeholder="WhatsApp/phone number (optional)">
      <button type="button" class="btn btn-gold btn-small btn-block" id="wnb-submit">Notify Me</button>
      <p class="wnb-form-note" id="wnb-form-note"></p>
    </div>`;
  document.body.appendChild(bar);

  document.getElementById('wnb-pill').addEventListener('click', () => {
    document.getElementById('wnb-form').style.display = 'block';
    bar.classList.add('expanded');
  });
  document.getElementById('wnb-close').addEventListener('click', () => {
    document.getElementById('wnb-form').style.display = 'none';
    bar.classList.remove('expanded');
  });
  document.getElementById('wnb-submit').addEventListener('click', submitNotifyRequest);
}

async function submitNotifyRequest() {
  const email = document.getElementById('wnb-email').value.trim();
  const phone = document.getElementById('wnb-phone').value.trim();
  const note = document.getElementById('wnb-form-note');
  const btn = document.getElementById('wnb-submit');

  if (!email && !phone) {
    note.textContent = 'Please enter an email or phone number.';
    note.style.color = 'var(--maroon)';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    await addDoc(collection(db, 'notifyRequests'), {
      email: email || null,
      phone: phone || null,
      productIds: getWishlist(),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(SUBMITTED_KEY, '1');
    note.textContent = "Thanks — we'll let you know!";
    note.style.color = 'var(--success)';
    setTimeout(() => {
      const bar = document.getElementById('wishlist-notify-bar');
      if (bar) bar.style.display = 'none';
    }, 1800);
  } catch (e) {
    console.error('Failed to save notify request:', e);
    note.textContent = 'Something went wrong — please try again.';
    note.style.color = 'var(--maroon)';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Notify Me';
  }
}

function updateNotifyBar() {
  const bar = document.getElementById('wishlist-notify-bar');
  if (!bar) return;
  const alreadySubmitted = localStorage.getItem(SUBMITTED_KEY) === '1';
  const hasWishlistItems = typeof getWishlist === 'function' && getWishlist().length > 0;
  bar.style.display = (hasWishlistItems && !alreadySubmitted) ? 'block' : 'none';
}
window.updateNotifyBar = updateNotifyBar;

document.addEventListener('DOMContentLoaded', () => {
  ensureNotifyBar();
  updateNotifyBar();
});
