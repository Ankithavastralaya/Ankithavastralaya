// Renders product grids for both index.html (featured) and category.html
// (full category listing + stock filter). Shared so the card markup and
// Add-to-Cart wiring only exist in one place.

function productHasSizes(product) {
  return product.category === 'readymade' && Array.isArray(product.sizes) && product.sizes.length > 0;
}

function productCardHTML(product) {
  const badgeLabel = stockBadgeLabel(product.stockStatus);
  const attrs = attributesSummary(product.attributes);
  const photo = product.photos && product.photos[0] ? product.photos[0] : '';
  const priceText = 'Rs. ' + product.price.toLocaleString('en-IN');
  const soldOut = product.stockStatus === 'sold_out';
  const needsSize = productHasSizes(product);
  return `
    <div class="product-card ${soldOut ? 'sold_out' : ''}">
      <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card-photo">
        <img src="${photo}" alt="${product.name}" loading="lazy">
        <span class="stock-badge ${product.stockStatus}">${badgeLabel}</span>
        <button class="product-card-quickview" data-id="${product.id}" type="button" aria-label="Quick view">Quick View</button>
      </a>
      <div class="product-card-body">
        <div class="product-card-cat">${DataSource.categoryLabel(product.category)}</div>
        <a href="product.html?id=${encodeURIComponent(product.id)}"><h3 class="product-card-name">${product.name}</h3></a>
        ${attrs ? `<div class="product-card-attrs">${attrs}</div>` : ''}
        <div class="product-card-price">${priceText}</div>
        <div class="product-card-actions">
          ${soldOut
            ? `<button class="btn btn-ghost btn-small" type="button" disabled>Sold Out</button>`
            : `<button class="btn btn-ghost btn-small btn-add-cart" data-id="${product.id}" type="button">Add to Cart</button>
              <button class="btn btn-gold btn-small btn-buy-now" data-id="${product.id}" type="button">Buy Now</button>`}
        </div>
      </div>
    </div>`;
}

function renderProductGrid(containerId, products) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!products.length) {
    container.innerHTML = '<div class="empty-state">No products found in this section yet — check back soon.</div>';
    return;
  }
  container.innerHTML = products.map(productCardHTML).join('');
  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const product = await DataSource.getProductById(btn.dataset.id);
      if (!product) return;
      // Products with sizes (Ready-Made) can't be added straight from the
      // compact grid card — send them to Quick View, which has the size
      // picker and its own Add to Cart, instead of guessing a size.
      if (productHasSizes(product)) {
        openQuickView(product);
        return;
      }
      addToCart(product, 1);
      showToast(product.name + ' added to cart');
    });
  });
  container.querySelectorAll('.btn-buy-now').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const product = await DataSource.getProductById(btn.dataset.id);
      if (!product) return;
      if (productHasSizes(product)) {
        openQuickView(product);
        return;
      }
      addToCart(product, 1);
      window.location.href = 'checkout.html';
    });
  });
  container.querySelectorAll('.product-card-quickview').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      // The button now sits inside the photo <a> (so it can overlay the
      // image) — stop the click from also bubbling into the link's own
      // navigation.
      e.preventDefault();
      e.stopPropagation();
      const product = await DataSource.getProductById(btn.dataset.id);
      if (!product) return;
      openQuickView(product);
    });
  });

  setupQuickViewVisibility(container);
}

// Desktop reveals Quick View purely via CSS :hover. Touch devices have no
// hover state, so instead reveal it whenever the card's photo is actually
// on screen, and hide it again once scrolled away — same intent ("show it
// only while the product is in view"), just driven by scroll position
// instead of a pointer.
function setupQuickViewVisibility(container) {
  if (!window.matchMedia('(hover: none)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('card-in-view', entry.isIntersecting);
    });
  }, { threshold: 0.4 });
  container.querySelectorAll('.product-card-photo').forEach(photo => observer.observe(photo));
}

async function initHomeFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const all = await DataSource.getAllProducts();
  renderProductGrid('featured-grid', all.slice(0, 8));
}

async function initCategoryPage() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat') || '';
  document.body.dataset.page = cat || 'category';
  if (typeof highlightActiveNav === 'function') highlightActiveNav();

  const heading = document.getElementById('category-heading');
  if (heading) heading.textContent = cat ? DataSource.categoryLabel(cat) : 'All Products';
  document.title = (cat ? DataSource.categoryLabel(cat) : 'All Products') + ' — Ankitha Vastralaya';

  // No filter UI on purpose — the owner wants customers to just scroll and
  // see the full collection without picking through selections first;
  // availability is still clear from each card's In Stock/Pre-Order/Sold
  // Out badge.
  const products = await DataSource.getProductsByCategory(cat);
  renderProductGrid('product-grid', products);
}

document.addEventListener('DOMContentLoaded', () => {
  initHomeFeatured();
  initCategoryPage();
});
