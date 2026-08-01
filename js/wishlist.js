// localStorage-based wishlist — same no-accounts pattern as the cart
// (js/cart.js). Just a list of product IDs; the heart icon on each product
// card reflects/toggles membership in it, and the nav heart badge mirrors
// the count (see #wishlist-badge in every page's nav).

const WISHLIST_KEY = 'av_wishlist';

function getWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  updateWishlistBadge();
}

function isWishlisted(productId) {
  return getWishlist().includes(productId);
}

function toggleWishlist(productId) {
  const list = getWishlist();
  const idx = list.indexOf(productId);
  if (idx === -1) {
    list.push(productId);
    saveWishlist(list);
    return true;
  }
  list.splice(idx, 1);
  saveWishlist(list);
  return false;
}

function updateWishlistBadge() {
  const badge = document.getElementById('wishlist-badge');
  if (!badge) return;
  const count = getWishlist().length;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

document.addEventListener('DOMContentLoaded', updateWishlistBadge);
