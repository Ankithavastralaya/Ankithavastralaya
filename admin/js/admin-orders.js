// Orders tab: look up a single order by its Order ID (which is also the
// Firestore doc ID — see checkout.js/generateOrderId()), view its details,
// and update its status as it moves through fulfillment.

import { db } from '../../js/firebase-init.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const STATUSES = [
  { value: 'placed', label: 'Placed' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' }
];

const searchInput = document.getElementById('order-search-input');
const searchBtn = document.getElementById('order-search-btn');
const resultEl = document.getElementById('order-result');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function searchOrder() {
  const orderId = searchInput.value.trim();
  if (!orderId) return;

  resultEl.innerHTML = '<p class="admin-empty-note">Searching…</p>';
  const snap = await getDoc(doc(db, 'orders', orderId));

  if (!snap.exists()) {
    resultEl.innerHTML = `<p class="admin-empty-note">No order found with ID "${escapeHtml(orderId)}".</p>`;
    return;
  }

  const order = snap.data();
  renderOrder(orderId, order);
}

function renderOrder(orderId, order) {
  const items = (order.items || []).map(item =>
    `<div class="order-summary-item"><span>${escapeHtml(item.name)}${item.size ? ` (Size: ${escapeHtml(item.size)})` : ''} x${item.qty}</span><span>Rs. ${Number(item.price * item.qty).toLocaleString('en-IN')}</span></div>`
  ).join('');

  const customer = order.customer || {};

  resultEl.innerHTML = `
    <div class="order-detail">
      <h3 style="margin-bottom:4px;">Order ${escapeHtml(orderId)}</h3>
      <p style="color:var(--text-muted); font-size:12.5px; margin-bottom:18px;">Placed: ${order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '—'}</p>

      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:var(--text-muted); margin-bottom:8px;">Items</h4>
      ${items}
      <div class="order-summary-total" style="margin-top:10px;"><span>Subtotal</span><span>Rs. ${Number(order.subtotal || 0).toLocaleString('en-IN')}</span></div>

      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:var(--text-muted); margin:20px 0 8px;">Customer</h4>
      <p style="font-size:13.5px; line-height:1.7;">
        ${escapeHtml(customer.name || '')}<br>
        ${escapeHtml(customer.phone || '')}<br>
        ${escapeHtml(customer.address || '')}<br>
        ${escapeHtml(customer.city || '')} — ${escapeHtml(customer.pincode || '')}
        ${customer.notes ? `<br><em>Notes: ${escapeHtml(customer.notes)}</em>` : ''}
      </p>

      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:var(--text-muted); margin:20px 0 4px;">Status</h4>
      <div class="order-status-row" id="order-status-row">
        ${STATUSES.map(s => `<button type="button" class="order-status-btn ${order.status === s.value ? 'active' : ''}" data-status="${s.value}">${s.label}</button>`).join('')}
      </div>
    </div>`;

  resultEl.querySelectorAll('.order-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, 'orders', orderId), { status: btn.dataset.status });
      resultEl.querySelectorAll('.order-status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast('Status updated to ' + btn.textContent);
    });
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

searchBtn.addEventListener('click', searchOrder);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchOrder(); });
