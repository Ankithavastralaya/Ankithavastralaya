// Builds and opens the pre-filled WhatsApp order message — mirrors the
// Rolando reference site's contact-form pattern of building a plain string,
// encodeURIComponent-ing it, and opening a URL scheme (mailto -> wa.me here).

const OWNER_WHATSAPP = '918500907070';

// Short human-readable order ID (date + random suffix) so the owner has
// something to search for later. Phase 1 only puts this in the WhatsApp
// message text; Phase 2 (Firestore orders collection) will persist it
// properly so the admin dashboard can look orders up and track status.
function generateOrderId() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AV${y}${m}${d}-${rand}`;
}

function buildOrderMessage(cart, customer, orderId) {
  const lines = ['New Order - Ankitha Vastralaya', `Order ID: ${orderId}`, '', 'Items:'];
  cart.forEach((item, i) => {
    const attrs = item.attributesSummary ? ` (${item.attributesSummary})` : '';
    const tag = item.stockStatus === 'pre_order' ? '[Pre-Order]' : '[In Stock]';
    lines.push(`${i + 1}. ${item.name}${attrs} x${item.qty} - Rs.${item.price} each = Rs.${item.price * item.qty} ${tag}`);
  });
  lines.push('', `Subtotal: Rs.${cartTotal(cart)}`, '', 'Customer Details:',
    `Name: ${customer.name}`, `Phone: ${customer.phone}`, `Address: ${customer.address}`,
    `Pincode: ${customer.pincode}`, `City: ${customer.city}`);
  if (customer.notes) lines.push(`Notes: ${customer.notes}`);
  lines.push('', '(Sent via ankithavastralaya website)');
  return lines.join('\n');
}

function buildWhatsAppUrl(cart, customer, orderId) {
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(buildOrderMessage(cart, customer, orderId))}`;
}

function renderOrderSummary(cart) {
  const el = document.getElementById('order-summary-items');
  el.innerHTML = cart.map(item => `
    <div class="order-summary-item">
      <span>${item.name} x${item.qty}</span>
      <span>Rs. ${(item.price * item.qty).toLocaleString('en-IN')}</span>
    </div>`).join('');
  document.getElementById('order-summary-total-value').textContent = 'Rs. ' + cartTotal(cart).toLocaleString('en-IN');
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

function validateForm(customer) {
  let valid = true;
  ['name', 'phone', 'address', 'pincode', 'city'].forEach(clearFieldError);

  if (!customer.name.trim()) { showFieldError('name', 'Please enter your name.'); valid = false; }
  const digitsOnly = customer.phone.replace(/\D/g, '');
  if (!digitsOnly || digitsOnly.length < 10) { showFieldError('phone', 'Please enter a valid 10-digit phone number.'); valid = false; }
  if (!customer.address.trim()) { showFieldError('address', 'Please enter your delivery address.'); valid = false; }
  if (!/^\d{6}$/.test(customer.pincode.trim())) { showFieldError('pincode', 'Please enter a valid 6-digit pincode.'); valid = false; }
  if (!customer.city.trim()) { showFieldError('city', 'Please enter your city.'); valid = false; }

  return valid;
}

document.addEventListener('DOMContentLoaded', () => {
  const cart = getCart();
  const root = document.getElementById('checkout-root');

  if (!cart.length) {
    root.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty — add something before checking out.</p>
        <a href="index.html" class="btn btn-primary">Continue Shopping</a>
      </div>`;
    return;
  }

  renderOrderSummary(cart);

  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const customer = {
      name: document.getElementById('f-name').value,
      phone: document.getElementById('f-phone').value,
      address: document.getElementById('f-address').value,
      pincode: document.getElementById('f-pincode').value,
      city: document.getElementById('f-city').value,
      notes: document.getElementById('f-notes').value
    };

    if (!validateForm(customer)) return;

    const orderId = generateOrderId();
    const url = buildWhatsAppUrl(getCart(), customer, orderId);
    const opened = window.open(url, '_blank', 'noopener');

    document.getElementById('checkout-form-panel').style.display = 'none';
    const confirmPanel = document.getElementById('confirm-panel');
    confirmPanel.style.display = 'block';
    confirmPanel.querySelector('#confirm-wa-link').href = url;
    confirmPanel.querySelector('#confirm-order-id').textContent = orderId;

    if (!opened) {
      confirmPanel.querySelector('#confirm-fallback-note').style.display = 'block';
    } else {
      clearCart();
    }
  });
});
