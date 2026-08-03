// Mirrors wishlist add/remove taps into Firestore as a plain per-product
// counter (no customer identity attached) so the owner can see which
// products people are wishlisting — a restock-demand signal — from the
// admin panel. js/wishlist.js calls window.syncWishlistCount on every
// toggle if this module has loaded; product names/photos aren't stored
// here, the admin view joins the counts against live product data itself.

import { db } from './firebase-init.js';
import { doc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

window.syncWishlistCount = async function syncWishlistCount(productId, active) {
  try {
    await setDoc(doc(db, 'wishlistCounts', productId), {
      count: increment(active ? 1 : -1)
    }, { merge: true });
  } catch (e) {
    console.error('Failed to sync wishlist count for', productId, e);
  }
};
