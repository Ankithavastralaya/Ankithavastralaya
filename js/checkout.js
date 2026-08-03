// Razorpay checkout: create a server-verified order (functions/index.js
// createRazorpayOrder), open Razorpay's own payment widget, then verify
// the payment server-side (verifyRazorpayPayment) before treating the
// order as real. The price/amount charged always comes from the
// function's own lookup of live product prices — never from anything
// this file sends. See functions/README.md for the deploy steps this
// depends on; until those are done, Pay Now will show a clear error
// instead of silently failing.

import { functions } from './firebase-init.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

const createRazorpayOrder = httpsCallable(functions, 'createRazorpayOrder');
const verifyRazorpayPayment = httpsCallable(functions, 'verifyRazorpayPayment');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderOrderSummary(cart) {
  const el = document.getElementById('order-summary-items');
  el.innerHTML = cart.map(item => `
    <div class="order-summary-item">
      <span>${escapeHtml(item.name)} x${item.qty}</span>
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
  ['name', 'email', 'phone', 'address', 'pincode', 'city', 'country'].forEach(clearFieldError);

  if (!customer.name.trim()) { showFieldError('name', 'Please enter your name.'); valid = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) { showFieldError('email', 'Please enter a valid email — your receipt goes here.'); valid = false; }
  const digitsOnly = customer.phone.replace(/\D/g, '');
  if (!digitsOnly || digitsOnly.length < 8) { showFieldError('phone', 'Please enter a valid phone number.'); valid = false; }
  if (!customer.address.trim()) { showFieldError('address', 'Please enter your delivery address.'); valid = false; }
  if (!customer.country.trim()) { showFieldError('country', 'Please enter your country.'); valid = false; }
  const isIndia = customer.country.trim().toLowerCase() === 'india';
  if (isIndia) {
    if (!/^\d{6}$/.test(customer.pincode.trim())) { showFieldError('pincode', 'Please enter a valid 6-digit pincode.'); valid = false; }
  } else {
    if (!/^[A-Za-z0-9\s-]{3,12}$/.test(customer.pincode.trim())) { showFieldError('pincode', 'Please enter a valid postal code.'); valid = false; }
  }
  if (!customer.city.trim()) { showFieldError('city', 'Please enter your city.'); valid = false; }

  return valid;
}

function showPayError(message) {
  const el = document.getElementById('checkout-pay-error');
  el.textContent = message;
  el.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  const cart = getCart();
  const root = document.getElementById('checkout-root');

  // Test mode is only reachable via ?test=1 in the URL — never a visible
  // control on the form — so a real customer can never stumble into it.
  // The Cloud Function uses Razorpay's TEST key pair in this mode (no
  // real money moves) and skips the stock decrement.
  const isTestMode = new URLSearchParams(window.location.search).get('test') === '1';
  if (isTestMode) {
    document.getElementById('test-mode-banner').style.display = 'block';
  }

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
  const payBtn = document.getElementById('pay-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('checkout-pay-error').style.display = 'none';

    const customer = {
      name: document.getElementById('f-name').value,
      email: document.getElementById('f-email').value,
      phone: document.getElementById('f-phone').value,
      address: document.getElementById('f-address').value,
      pincode: document.getElementById('f-pincode').value,
      city: document.getElementById('f-city').value,
      country: document.getElementById('f-country').value,
      notes: document.getElementById('f-notes').value
    };

    if (!validateForm(customer)) return;

    const cartSnapshot = getCart();
    const items = cartSnapshot.map(item => ({ productId: item.productId, qty: item.qty, size: item.size || null }));

    payBtn.disabled = true;
    payBtn.textContent = 'Preparing payment…';

    let orderResult;
    try {
      const res = await createRazorpayOrder({ items, customer, isTest: isTestMode });
      orderResult = res.data;
    } catch (err) {
      console.error('createRazorpayOrder failed:', err);
      showPayError(err.message || 'Could not start payment — please try again.');
      payBtn.disabled = false;
      payBtn.textContent = 'Pay Now';
      return;
    }

    payBtn.textContent = 'Pay Now';
    payBtn.disabled = false;

    const razorpay = new Razorpay({
      key: orderResult.keyId,
      amount: orderResult.amount,
      currency: 'INR',
      name: 'Ankitha Vastralaya',
      description: 'Order payment',
      order_id: orderResult.razorpayOrderId,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      handler: async (response) => {
        payBtn.disabled = true;
        payBtn.textContent = 'Confirming…';
        try {
          const verifyRes = await verifyRazorpayPayment({
            pendingOrderId: orderResult.pendingOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          clearCart();
          document.getElementById('checkout-form-panel').style.display = 'none';
          const confirmPanel = document.getElementById('confirm-panel');
          confirmPanel.style.display = 'block';
          confirmPanel.querySelector('#confirm-order-id').textContent = verifyRes.data.orderId;
        } catch (err) {
          console.error('verifyRazorpayPayment failed:', err);
          if (err.code === 'functions/already-exists') {
            // The payment succeeded and the order was already created —
            // just via Razorpay's own webhook winning a race against this
            // browser call (e.g. a slow connection), not a real failure.
            clearCart();
            document.getElementById('checkout-form-panel').style.display = 'none';
            const confirmPanel = document.getElementById('confirm-panel');
            confirmPanel.style.display = 'block';
            confirmPanel.querySelector('#confirm-order-id').textContent = 'in your email receipt';
            return;
          }
          showPayError('Payment went through but we could not confirm it automatically — please contact us with your payment ID: ' + response.razorpay_payment_id);
          payBtn.disabled = false;
          payBtn.textContent = 'Pay Now';
        }
      },
      modal: {
        ondismiss: () => {
          payBtn.disabled = false;
          payBtn.textContent = 'Pay Now';
        }
      }
    });
    razorpay.on('payment.failed', (response) => {
      showPayError('Payment failed: ' + (response.error && response.error.description ? response.error.description : 'please try again.'));
      payBtn.disabled = false;
      payBtn.textContent = 'Pay Now';
    });
    razorpay.open();
  });
});
