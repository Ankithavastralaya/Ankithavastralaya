// Scrolling announcement banner — reads meta/announcement (set from the
// admin panel's Announcement tab). Shows only when text exists; deleting
// or emptying it in admin hides the banner everywhere, since there's
// nothing here that shows a banner on its own without that doc.

import { db } from './firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', async () => {
  const banner = document.getElementById('announcement-banner');
  const textEl = document.getElementById('announcement-banner-text');
  if (!banner || !textEl) return;

  try {
    const snap = await getDoc(doc(db, 'meta', 'announcement'));
    const text = snap.exists() ? String(snap.data().text || '').trim() : '';
    if (!text) return;
    textEl.innerHTML = escapeHtml(text);
    banner.style.display = 'block';
  } catch (e) {
    console.error('Failed to load announcement banner:', e);
  }
});
