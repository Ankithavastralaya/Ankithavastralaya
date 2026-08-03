// Orders tab: browse every order in a table, look up a single order by its
// Order ID (which is also the Firestore doc ID — see
// checkout.js/generateOrderId()), view its details, and update its status
// as it moves through fulfillment. Marking an order "Dispatched" requires a
// courier name + tracking ID, and immediately opens a pre-filled WhatsApp
// chat to the customer's own number with the dispatch details — same
// tap-to-send pattern as the customer's own order message in checkout.js,
// since there's no paid WhatsApp Business API here to send it silently.

import { db } from '../../js/firebase-init.js';
import { collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const STATUSES = [
  { value: 'placed', label: 'Placed' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' }
];
const STATUS_LABELS = { placed: 'Placed', dispatched: 'Dispatched', delivered: 'Delivered' };

const searchInput = document.getElementById('order-search-input');
const searchBtn = document.getElementById('order-search-btn');
const resultEl = document.getElementById('order-result');
const ordersTbody = document.getElementById('orders-tbody');
const ordersEmpty = document.getElementById('orders-empty');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Builds a wa.me link straight to the customer's own number (as opposed to
// checkout.js's OWNER_WHATSAPP) — assumes a plain 10-digit Indian mobile
// number as collected at checkout, prefixing the country code.
function customerWhatsAppUrl(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

function buildDispatchMessage(orderId, customerName, courier, trackingId) {
  return [
    `Hi ${customerName}, your order ${orderId} from Ankitha Vastralaya has been dispatched!`,
    '',
    `Courier: ${courier}`,
    `Tracking ID: ${trackingId}`,
    '',
    'Thank you for shopping with us!'
  ].join('\n');
}

// ---------- stock processing ----------
// firestore.rules only lets this authenticated owner session write to
// /products, so a customer's anonymous checkout can't decrement sized
// stock itself (see checkout.js) — this runs that decrement from here
// instead, once per real (non-test) order, the first time it's seen.
async function decrementSizeStock(order) {
  const sizedItems = (order.items || []).filter(item => item.size && item.productId);
  await Promise.all(sizedItems.map(async (item) => {
    try {
      const ref = doc(db, 'products', item.productId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const sizes = snap.data().sizes;
      if (!Array.isArray(sizes)) return;
      const updated = sizes.map(s => {
        if (s.label !== item.size) return s;
        const newStock = Math.max(0, (Number(s.stock) || 0) - item.qty);
        return { ...s, stock: newStock, status: newStock <= 0 ? 'sold_out' : (s.status || 'in_stock') };
      });
      await updateDoc(ref, { sizes: updated });
    } catch (e) {
      console.error('Failed to update size stock for', item.productId, item.size, e);
    }
  }));
}

async function processUnprocessedOrders(orders) {
  // Strictly === false on purpose: orders placed before this feature
  // existed have no stockProcessed field at all (undefined), and must be
  // left alone rather than swept up and retroactively decremented — only
  // orders checkout.js explicitly marked stockProcessed:false are real,
  // newly-placed orders actually waiting on this.
  const pending = orders.filter(o => !o.isTest && o.stockProcessed === false);
  await Promise.all(pending.map(async (order) => {
    await decrementSizeStock(order);
    await updateDoc(doc(db, 'orders', order.id), { stockProcessed: true });
    order.stockProcessed = true;
  }));
}

// ---------- all-orders table ----------

async function loadAllOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  await processUnprocessedOrders(orders);
  renderOrdersTable(orders);
}

function renderOrdersTable(orders) {
  if (!orders.length) {
    ordersTbody.innerHTML = '';
    ordersEmpty.style.display = 'block';
    return;
  }
  ordersEmpty.style.display = 'none';
  ordersTbody.innerHTML = orders.map(o => {
    const productIds = (o.items || [])
      .filter(item => item.productId)
      .map(item => item.productId + (item.size ? ` (${item.size})` : ''))
      .join(', ');
    return `
    <tr>
      <td>${escapeHtml(o.id)}${o.isTest ? ' <span class="test-order-badge">TEST</span>' : ''}</td>
      <td class="product-id-cell">${escapeHtml(productIds || '—')}</td>
      <td>${escapeHtml((o.customer && o.customer.name) || '')}</td>
      <td>Rs. ${Number(o.subtotal || 0).toLocaleString('en-IN')}</td>
      <td>${STATUS_LABELS[o.status] || 'Placed'}</td>
      <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}</td>
      <td><button class="btn btn-ghost btn-small view-order-btn" data-id="${o.id}" type="button">View</button></td>
    </tr>`;
  }).join('');

  ordersTbody.querySelectorAll('.view-order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const order = orders.find(o => o.id === btn.dataset.id);
      searchInput.value = order.id;
      renderOrder(order.id, order);
      resultEl.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// ---------- single order lookup + detail ----------

async function searchOrder() {
  const orderId = searchInput.value.trim();
  if (!orderId) return;

  resultEl.innerHTML = '<p class="admin-empty-note">Searching…</p>';
  const snap = await getDoc(doc(db, 'orders', orderId));

  if (!snap.exists()) {
    resultEl.innerHTML = `<p class="admin-empty-note">No order found with ID "${escapeHtml(orderId)}".</p>`;
    return;
  }

  renderOrder(orderId, snap.data());
}

function renderOrder(orderId, order) {
  const items = (order.items || []).map(item => `
    <div class="order-summary-item">
      <span>
        ${escapeHtml(item.name)}${item.size ? ` (Size: ${escapeHtml(item.size)})` : ''} x${item.qty}
        ${item.productId ? `<br><span style="color:var(--text-muted); font-size:11.5px;">Product ID: ${escapeHtml(item.productId)}</span>` : ''}
      </span>
      <span>Rs. ${Number(item.price * item.qty).toLocaleString('en-IN')}</span>
    </div>`
  ).join('');

  const customer = order.customer || {};

  resultEl.innerHTML = `
    <div class="order-detail">
      <h3 style="margin-bottom:4px;">Order ${escapeHtml(orderId)}${order.isTest ? ' <span class="test-order-badge">TEST — stock not affected</span>' : ''}</h3>
      <p style="color:var(--text-muted); font-size:12.5px; margin-bottom:18px;">Placed: ${order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '—'}</p>

      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:var(--text-muted); margin-bottom:8px;">Items</h4>
      ${items}
      <div class="order-summary-total" style="margin-top:10px;"><span>Subtotal</span><span>Rs. ${Number(order.subtotal || 0).toLocaleString('en-IN')}</span></div>

      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:var(--text-muted); margin:20px 0 8px;">Payment</h4>
      <p style="font-size:13.5px; line-height:1.7;">
        ${order.paymentId ? `<span style="color:var(--success); font-weight:600;">&#10003; Paid</span> via Razorpay<br>
        Payment ID: ${escapeHtml(order.paymentId)}<br>
        Paid: ${order.paidAt ? new Date(order.paidAt).toLocaleString('en-IN') : '—'}`
        : '<span style="color:var(--text-muted);">No payment record on this order (placed before Razorpay went live, or a test order).</span>'}
      </p>

      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:var(--text-muted); margin:20px 0 8px;">Customer</h4>
      <p style="font-size:13.5px; line-height:1.7;">
        ${escapeHtml(customer.name || '')}<br>
        ${customer.email ? `${escapeHtml(customer.email)}<br>` : ''}
        ${escapeHtml(customer.phone || '')}<br>
        ${escapeHtml(customer.address || '')}<br>
        ${escapeHtml(customer.city || '')} — ${escapeHtml(customer.pincode || '')}
        ${customer.notes ? `<br><em>Notes: ${escapeHtml(customer.notes)}</em>` : ''}
      </p>

      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.03em; color:var(--text-muted); margin:20px 0 4px;">Status</h4>
      <div class="order-status-row" id="order-status-row">
        ${STATUSES.map(s => `<button type="button" class="order-status-btn ${order.status === s.value ? 'active' : ''}" data-status="${s.value}">${s.label}</button>`).join('')}
      </div>

      <div class="dispatch-form" id="dispatch-form" style="display:${order.status === 'dispatched' ? 'block' : 'none'};">
        <div class="field">
          <label for="dispatch-courier">Courier Service</label>
          <input id="dispatch-courier" type="text" placeholder="e.g. Delhivery, DTDC, India Post" value="${escapeHtml(order.courierService || '')}">
        </div>
        <div class="field">
          <label for="dispatch-tracking">Tracking ID</label>
          <input id="dispatch-tracking" type="text" placeholder="Tracking number" value="${escapeHtml(order.trackingId || '')}">
        </div>
        <button class="btn btn-primary btn-small" id="dispatch-confirm-btn" type="button">${order.courierService ? 'Update & Notify Customer' : 'Confirm Dispatch & Notify Customer'}</button>
      </div>
    </div>`;

  resultEl.querySelectorAll('.order-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.status === 'dispatched') {
        // Dispatched always goes through the courier/tracking form below —
        // it's never a plain one-click status change.
        const form = document.getElementById('dispatch-form');
        form.style.display = 'block';
        document.getElementById('dispatch-courier').focus();
        return;
      }
      await updateDoc(doc(db, 'orders', orderId), { status: btn.dataset.status });
      showToast('Status updated to ' + btn.textContent);
      renderOrder(orderId, { ...order, status: btn.dataset.status });
      loadAllOrders();
    });
  });

  const confirmBtn = document.getElementById('dispatch-confirm-btn');
  confirmBtn.addEventListener('click', async () => {
    const courier = document.getElementById('dispatch-courier').value.trim();
    const trackingId = document.getElementById('dispatch-tracking').value.trim();
    if (!courier || !trackingId) {
      showToast('Enter both courier service and tracking ID');
      return;
    }

    const updates = { status: 'dispatched', courierService: courier, trackingId, dispatchedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'orders', orderId), updates);

    const message = buildDispatchMessage(orderId, customer.name || 'there', courier, trackingId);
    window.open(customerWhatsAppUrl(customer.phone, message), '_blank', 'noopener');

    showToast('Order marked dispatched — WhatsApp opened to notify the customer');
    renderOrder(orderId, { ...order, ...updates });
    loadAllOrders();
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

document.addEventListener('DOMContentLoaded', loadAllOrders);
