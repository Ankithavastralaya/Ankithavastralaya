// "Track Your Order" self-serve lookup — no customer accounts on this
// site, so this is the entire post-purchase self-serve surface. Calls the
// lookupOrder Cloud Function (functions/index.js), which is the only thing
// allowed to read /orders on a customer's behalf (Firestore rules keep
// that collection owner-only otherwise).

import { functions } from './firebase-init.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

const lookupOrder = httpsCallable(functions, 'lookupOrder');

// Labels here are customer-facing wording only — the underlying status
// values ('placed'/'dispatched'/'delivered') match what the admin panel
// writes (admin/js/admin-orders.js) and are never renamed, just relabeled
// for display. "Placed" reads as a dead-end to a customer waiting on their
// order, so it's shown as "Packing" here instead.
const STATUS_STEPS = [
  { value: 'placed', label: 'Packing' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' }
];

const STATUS_MESSAGES = {
  placed: 'Your order has been placed and is being packed.',
  dispatched: 'Your order is on its way.',
  delivered: 'Your order has been delivered.'
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderResult(order) {
  const stepIndex = STATUS_STEPS.findIndex(s => s.value === order.status);
  const itemsHtml = (order.items || []).map(i => `
    <div class="order-summary-item">
      <span>${escapeHtml(i.name)}${i.size ? ` (${escapeHtml(i.size)})` : ''} x${i.qty}</span>
      <span>Rs. ${(i.price * i.qty).toLocaleString('en-IN')}</span>
    </div>`).join('');

  const dispatchHtml = order.status === 'dispatched' || order.status === 'delivered'
    ? (order.courierService || order.trackingId
        ? `<p class="order-track-dispatch">Shipped via <b>${escapeHtml(order.courierService || 'courier')}</b>${order.trackingId ? ` — Tracking ID: <b>${escapeHtml(order.trackingId)}</b>` : ''}</p>`
        : '')
    : '';

  const el = document.getElementById('order-track-result');
  el.style.display = 'block';
  el.innerHTML = `
    <div class="order-track-head">
      <div>
        <div class="order-track-id">${escapeHtml(order.orderId)}</div>
        <div class="order-track-date">Placed on ${formatDate(order.createdAt)}</div>
      </div>
    </div>
    <p class="order-track-message">${escapeHtml(STATUS_MESSAGES[order.status] || STATUS_MESSAGES.placed)}</p>
    <div class="order-track-timeline">
      ${STATUS_STEPS.map((s, i) => `
        <div class="order-track-step ${i <= stepIndex ? 'done' : ''}">
          <span class="order-track-dot"></span>
          <span>${s.label}</span>
        </div>`).join('')}
    </div>
    ${dispatchHtml}
    <div class="order-summary" style="margin-top:20px;">
      ${itemsHtml}
      <div class="order-summary-total">
        <span>Total</span>
        <span>Rs. ${(order.subtotal || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>`;
}

function fieldEl(name) {
  return document.querySelector(`.field[data-field="${name}"]`);
}
function showFieldError(name, message) {
  const wrap = fieldEl(name);
  wrap.classList.add('invalid');
  wrap.querySelector('.field-error').textContent = message;
}
function clearFieldError(name) {
  fieldEl(name).classList.remove('invalid');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('track-order-form');
  const btn = document.getElementById('track-order-btn');
  const errorEl = document.getElementById('track-order-error');
  const orderIdInput = document.getElementById('t-order-id');

  const prefillId = new URLSearchParams(window.location.search).get('orderId');
  if (prefillId) orderIdInput.value = prefillId;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    document.getElementById('order-track-result').style.display = 'none';
    ['orderId', 'phone'].forEach(clearFieldError);

    const orderId = orderIdInput.value.trim();
    const phone = document.getElementById('t-phone').value.trim();
    let valid = true;
    if (!orderId) { showFieldError('orderId', 'Please enter your Order ID.'); valid = false; }
    if (!phone.replace(/\D/g, '')) { showFieldError('phone', 'Please enter the phone number used at checkout.'); valid = false; }
    if (!valid) return;

    btn.disabled = true;
    btn.textContent = 'Looking up…';
    try {
      const res = await lookupOrder({ orderId, phone });
      renderResult(res.data);
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong — please try again.';
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Track Order';
    }
  });
});
