// localStorage-based cart. No customer accounts — matches the WhatsApp
// order flow where the "order record" is simply the WhatsApp chat message.

const CART_KEY = 'av_cart';

function stockBadgeLabel(status) {
  if (status === 'pre_order') return 'Pre-Order';
  if (status === 'sold_out') return 'Sold Out';
  return 'In Stock';
}

function attributesSummary(attributes) {
  if (!attributes) return '';
  const parts = [];
  if (attributes.fabric) parts.push(`Fabric: ${attributes.fabric}`);
  if (attributes.design) parts.push(`Design: ${attributes.design}`);
  if (attributes.weave) parts.push(`Weave: ${attributes.weave}`);
  if (attributes.loomType) parts.push(`Loom: ${attributes.loomType}`);
  return parts.join(', ');
}

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(item => item.productId === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: qty,
      photo: product.photos && product.photos[0] ? product.photos[0] : '',
      stockStatus: product.stockStatus,
      attributesSummary: attributesSummary(product.attributes)
    });
  }
  saveCart(cart);
}

function setQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.productId !== productId);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function cartTotal(cart) {
  cart = cart || getCart();
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartCount(cart) {
  cart = cart || getCart();
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
