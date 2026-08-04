// Size Chart (part of the Homepage Media tab): one direct image link,
// saved to meta/sizeChart. The storefront (js/size-chart.js) reads this
// same doc live and shows a "View Size Chart" link next to the size
// selector on Ready-Made products whenever it's set.

import { db } from '../../js/firebase-init.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const form = document.getElementById('size-chart-form');

async function loadSizeChart() {
  const snap = await getDoc(doc(db, 'meta', 'sizeChart'));
  document.getElementById('size-chart-url').value = snap.exists() ? (snap.data().url || '') : '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = document.getElementById('size-chart-url').value.trim();
  await setDoc(doc(db, 'meta', 'sizeChart'), { url }, { merge: true });
  showToast('Size chart saved');
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', loadSizeChart);
