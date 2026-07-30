// Single seam between the storefront pages and the product data backend.
// Phase 1: reads DEMO_PRODUCTS (js/demo-products.js).
// Phase 2: swap the bodies of these functions for Firestore queries — no
// other file (catalog.js, product-detail.js, checkout.js) needs to change.

const CATEGORY_LABELS = {
  sarees: 'Sarees',
  unstitched: 'Unstitched Dress Materials',
  readymade: 'Ready-Made Dresses',
  jewellery: 'Jewellery'
};

const DataSource = {
  async getAllProducts() {
    return DEMO_PRODUCTS.filter(p => p.active);
  },

  async getProductsByCategory(category) {
    const all = await this.getAllProducts();
    if (!category) return all;
    return all.filter(p => p.category === category);
  },

  async getProductById(id) {
    const all = await this.getAllProducts();
    return all.find(p => p.id === id) || null;
  },

  categoryLabel(category) {
    return CATEGORY_LABELS[category] || category;
  }
};
