// Floating bottom mini-cart bar (delivery-app style) — a compact summary
// that appears only once something is in the cart, and stays out of the
// way otherwise. Not shown on cart.html/checkout.html since the full cart
// is already on screen there. cart.js calls updateMiniCartBar() from
// saveCart() so it stays live across add/remove/qty changes.

function ensureMiniCartBar() {
  if (document.getElementById('mini-cart-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'mini-cart-bar';
  bar.className = 'mini-cart-bar';
  bar.innerHTML = `
    <span class="mcb-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
    </span>
    <span class="mcb-info">
      <span id="mcb-count" class="mcb-count"></span>
      <span id="mcb-total" class="mcb-total"></span>
    </span>
    <span class="mcb-cta">View Cart <span aria-hidden="true">&rarr;</span></span>`;
  bar.addEventListener('click', () => { window.location.href = 'cart.html'; });
  document.body.appendChild(bar);
}

function updateMiniCartBar() {
  const bar = document.getElementById('mini-cart-bar');
  if (!bar) return;
  const cart = getCart();
  const count = cartCount(cart);
  if (!count) {
    bar.classList.remove('show');
    return;
  }
  document.getElementById('mcb-count').textContent = count + (count === 1 ? ' item' : ' items');
  document.getElementById('mcb-total').textContent = 'Rs. ' + cartTotal(cart).toLocaleString('en-IN');
  bar.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  ensureMiniCartBar();
  updateMiniCartBar();
});
