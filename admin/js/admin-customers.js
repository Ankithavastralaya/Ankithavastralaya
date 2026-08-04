// Customers tab: merges contacts from three separate sources — real orders,
// wishlist "notify me" requests, and footer newsletter signups — into one
// de-duplicated list. De-dupe key is email when present, otherwise phone
// (digits only), so the same person showing up via two different forms
// only appears once, with every source they came from listed together.

import { db } from '../../js/firebase-init.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const statsRow = document.getElementById('customers-stats-row');
const filterInput = document.getElementById('customers-filter-input');
const tbody = document.getElementById('customers-tbody');
const emptyNote = document.getElementById('customers-empty');
const exportBtn = document.getElementById('customers-export-btn');

let allContacts = [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function contactKey(email, phone) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) return 'email:' + cleanEmail;
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone) return 'phone:' + cleanPhone;
  return null;
}

function mergeContact(map, { name, email, phone, createdAt, source }) {
  const key = contactKey(email, phone);
  if (!key) return;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      name: name || '',
      email: email || '',
      phone: phone || '',
      sources: new Set([source]),
      firstSeen: createdAt || null
    });
    return;
  }
  if (!existing.name && name) existing.name = name;
  if (!existing.email && email) existing.email = email;
  if (!existing.phone && phone) existing.phone = phone;
  existing.sources.add(source);
  if (createdAt && (!existing.firstSeen || createdAt < existing.firstSeen)) {
    existing.firstSeen = createdAt;
  }
}

async function loadCustomers() {
  const [ordersSnap, notifySnap, newsletterSnap] = await Promise.all([
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'notifyRequests')),
    getDocs(collection(db, 'newsletterSubscribers'))
  ]);

  const map = new Map();

  ordersSnap.docs.forEach(d => {
    const o = d.data();
    const c = o.customer || {};
    mergeContact(map, { name: c.name, email: c.email, phone: c.phone, createdAt: o.createdAt, source: 'Order' });
  });

  notifySnap.docs.forEach(d => {
    const n = d.data();
    mergeContact(map, { name: '', email: n.email, phone: n.phone, createdAt: n.createdAt, source: 'Notify' });
  });

  newsletterSnap.docs.forEach(d => {
    const n = d.data();
    mergeContact(map, { name: '', email: n.email, phone: '', createdAt: n.createdAt, source: 'Newsletter' });
  });

  allContacts = Array.from(map.values()).sort((a, b) => (b.firstSeen || '').localeCompare(a.firstSeen || ''));
  renderStats();
  applyFilter();
}

function renderStats() {
  const fromOrders = allContacts.filter(c => c.sources.has('Order')).length;
  const fromNotify = allContacts.filter(c => c.sources.has('Notify')).length;
  const fromNewsletter = allContacts.filter(c => c.sources.has('Newsletter')).length;

  const cards = [
    { label: 'Total Unique Contacts', value: allContacts.length },
    { label: 'From Orders', value: fromOrders },
    { label: 'From Notify Requests', value: fromNotify },
    { label: 'From Newsletter', value: fromNewsletter }
  ];
  statsRow.innerHTML = cards.map(c => `
    <div class="admin-stat-card">
      <div class="admin-stat-label">${c.label}</div>
      <div class="admin-stat-value">${c.value}</div>
    </div>`
  ).join('');
}

function applyFilter() {
  const q = filterInput.value.trim().toLowerCase();
  const filtered = !q ? allContacts : allContacts.filter(c =>
    c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
  );
  renderTable(filtered);
}

function renderTable(contacts) {
  if (!contacts.length) {
    tbody.innerHTML = '';
    emptyNote.style.display = 'block';
    return;
  }
  emptyNote.style.display = 'none';
  tbody.innerHTML = contacts.map(c => `
    <tr>
      <td>${escapeHtml(c.name || '—')}</td>
      <td>${escapeHtml(c.email || '—')}</td>
      <td>${escapeHtml(c.phone || '—')}</td>
      <td>${Array.from(c.sources).map(escapeHtml).join(', ')}</td>
      <td>${c.firstSeen ? new Date(c.firstSeen).toLocaleDateString('en-IN') : '—'}</td>
    </tr>`
  ).join('');
}

function downloadCsv() {
  const rows = [['Name', 'Email', 'Phone', 'Sources', 'First Seen']];
  allContacts.forEach(c => {
    rows.push([
      c.name || '',
      c.email || '',
      c.phone || '',
      Array.from(c.sources).join('; '),
      c.firstSeen ? new Date(c.firstSeen).toLocaleDateString('en-IN') : ''
    ]);
  });
  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ankitha-vastralaya-customers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

filterInput.addEventListener('input', applyFilter);
exportBtn.addEventListener('click', downloadCsv);

document.addEventListener('DOMContentLoaded', loadCustomers);
