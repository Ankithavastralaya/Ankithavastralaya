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
  // js/wishlist-notify.js (a module, loaded separately) exposes this —
  // guarded the same way as syncWishlistCount above.
  if (typeof window.updateNotifyBar === 'function') window.updateNotifyBar();
}

function isWishlisted(productId) {
  return getWishlist().includes(productId);
}

function toggleWishlist(productId) {
  const list = getWishlist();
  const idx = list.indexOf(productId);
  let active;
  if (idx === -1) {
    list.push(productId);
    active = true;
  } else {
    list.splice(idx, 1);
    active = false;
  }
  saveWishlist(list);
  // js/wishlist-sync.js (a module, loaded separately) exposes this — guard
  // in case a page doesn't include it, so the local wishlist still works.
  if (typeof window.syncWishlistCount === 'function') {
    window.syncWishlistCount(productId, active);
  }
  return active;
}

function updateWishlistBadge() {
  const badge = document.getElementById('wishlist-badge');
  if (!badge) return;
  const count = getWishlist().length;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

document.addEventListener('DOMContentLoaded', updateWishlistBadge);
