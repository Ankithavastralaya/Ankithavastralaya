// Announcement Banner tab: one plain text field stored at meta/announcement.
// The storefront (js/announcement-banner.js) shows a scrolling banner
// whenever this doc exists with non-empty text, and hides it entirely
// otherwise — deleting here means no banner anywhere on the site.

import { db } from '../../js/firebase-init.js';
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const textInput = document.getElementById('announcement-text');
const saveBtn = document.getElementById('announcement-save-btn');
const deleteBtn = document.getElementById('announcement-delete-btn');
const statusEl = document.getElementById('announcement-status');

async function loadAnnouncement() {
  const snap = await getDoc(doc(db, 'meta', 'announcement'));
  const text = snap.exists() ? (snap.data().text || '') : '';
  textInput.value = text;
  statusEl.textContent = text ? 'Currently showing on the live site.' : 'No announcement is currently showing.';
}

saveBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (!text) {
    showToast('Enter some text, or use Delete Announcement to clear it.');
    return;
  }
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  await setDoc(doc(db, 'meta', 'announcement'), { text });
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Announcement';
  showToast('Announcement saved — now showing on the live site.');
  loadAnnouncement();
});

deleteBtn.addEventListener('click', async () => {
  deleteBtn.disabled = true;
  await deleteDoc(doc(db, 'meta', 'announcement'));
  deleteBtn.disabled = false;
  textInput.value = '';
  showToast('Announcement deleted — banner hidden on the live site.');
  loadAnnouncement();
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadAnnouncement);
