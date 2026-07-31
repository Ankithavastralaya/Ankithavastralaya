// localStorage-based cart. No customer accounts — matches the WhatsApp
// order flow where the "order record" is simply the WhatsApp chat message.

const CART_KEY = 'av_cart';

// product.sizes has gone through a few schema shapes as this feature
// evolved: oldest was {LABEL: 'in_stock'|'out_of_stock'}, then
// {LABEL: {stock: N}}, now an ordered [{label, stock}] array (so any custom
// size name works, not just a fixed S/M/L/XL list). Normalizing here means
// products saved under any earlier shape still render correctly instead of
// silently losing their size selector.
function normalizeSizes(sizes) {
  if (!sizes) return [];
  if (Array.isArray(sizes)) return sizes;
  return Object.keys(sizes).map(label => {
    const val = sizes[label];
    if (val && typeof val === 'object') return { label, stock: Number(val.stock) || 0 };
    return { label, stock: val === 'out_of_stock' ? 0 : 1 };
  });
}

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
  if (attributes.dressMaterialMeters) parts.push(`Dress Material: ${attributes.dressMaterialMeters}m`);
  if (attributes.pantMaterialMeters) parts.push(`Pant Material: ${attributes.pantMaterialMeters}m`);
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
  if (typeof updateMiniCartBar === 'function') updateMiniCartBar();
}

// Cart rows are keyed by productId alone, unless a size is involved (only
// Ready-Made Dresses use sizes) — then productId+size identifies the row,
// so the same dress in two different sizes lands in two separate rows.
function cartItemKey(item) {
  return item.size ? `${item.productId}::${item.size}` : item.productId;
}

function addToCart(product, qty, size) {
  qty = qty || 1;
  const cart = getCart();
  const key = size ? `${product.id}::${size}` : product.id;
  const existing = cart.find(item => cartItemKey(item) === key);
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
      attributesSummary: attributesSummary(product.attributes),
      size: size || null
    });
  }
  saveCart(cart);
}

function setQty(key, qty) {
  if (qty <= 0) {
    removeFromCart(key);
    return;
  }
  const cart = getCart();
  const item = cart.find(i => cartItemKey(i) === key);
  if (!item) return;
  item.qty = qty;
  saveCart(cart);
}

function removeFromCart(key) {
  const cart = getCart().filter(i => cartItemKey(i) !== key);
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
