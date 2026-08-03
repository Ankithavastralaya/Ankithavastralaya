// Single seam between the storefront pages and the product data backend —
// now backed by real Firestore. Loaded as a module (so it can import the
// Firebase SDK), but exposes itself as window.DataSource so every other
// script (catalog.js, product-detail.js, checkout.js) keeps working
// completely unchanged, exactly like it did against the Phase 1 demo array.

import { db } from './firebase-init.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CATEGORY_LABELS = {
  sarees: 'Sarees',
  unstitched: 'Unstitched Dress Materials',
  readymade: 'Ready-Made Dresses',
  jewellery: 'Jewellery'
};

const DataSource = {
  async getAllProducts() {
    try {
      const snap = await getDocs(collection(db, 'products'));
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.active !== false);
    } catch (e) {
      console.error('Failed to load products:', e);
      return [];
    }
  },

  async getProductsByCategory(category) {
    const all = await this.getAllProducts();
    if (!category) return all;
    return all.filter(p => p.category === category);
  },

  async getProductById(id) {
    try {
      const snap = await getDoc(doc(db, 'products', id));
      if (!snap.exists()) return null;
      const data = { id: snap.id, ...snap.data() };
      return data.active === false ? null : data;
    } catch (e) {
      console.error('Failed to load product:', e);
      return null;
    }
  },

  categoryLabel(category) {
    return CATEGORY_LABELS[category] || category;
  },

  // Owner-defined homepage product order (admin's Homepage Order tab) —
  // a plain array of product IDs. Products not in the list just aren't
  // covered by it; the caller decides where they land.
  async getHomeOrder() {
    try {
      const snap = await getDoc(doc(db, 'meta', 'homeOrder'));
      return snap.exists() ? (snap.data().ids || []) : [];
    } catch (e) {
      return [];
    }
  },

  // Owner-defined per-category product order (admin's Product Order tab) —
  // meta/categoryOrder holds one product-ID array per category slug as a
  // field on the same doc, so adding a new category never touches the
  // others' saved order.
  async getCategoryOrder(category) {
    try {
      const snap = await getDoc(doc(db, 'meta', 'categoryOrder'));
      return snap.exists() ? (snap.data()[category] || []) : [];
    } catch (e) {
      return [];
    }
  },

  // The owner's 4 hand-picked "Top Selling" products (admin's Top Selling
  // tab) — any mix of categories, or all one category, her call.
  async getTopSellingIds() {
    try {
      const snap = await getDoc(doc(db, 'meta', 'topSelling'));
      return snap.exists() ? (snap.data().ids || []).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }
};

window.DataSource = DataSource;
