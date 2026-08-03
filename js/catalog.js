// Renders product grids for both index.html (featured) and category.html
// (full category listing + stock filter). Cards are photo-first, with a
// wishlist heart over the photo and small text-style Add to Cart/Buy Now
// links under the price — deliberately understated next to the photo.

function productHasSizes(product) {
  return product.category === 'readymade' && normalizeSizes(product.sizes).length > 0;
}

const WISHLIST_HEART_SVG = `<svg class="icon-heart" viewBox="0 0 24 24"><path d="M20.8 4.6c-1.8-1.8-4.7-1.8-6.5 0L12 6.9l-2.3-2.3c-1.8-1.8-4.7-1.8-6.5 0-1.8 1.8-1.8 4.7 0 6.5L12 20.8l8.8-8.8c1.8-1.8 1.8-4.7 0-6.5z"/></svg>`;
// Persian cat: round face, pointed ears, whiskers.
const WISHLIST_CAT_SVG = `<svg class="icon-cat" viewBox="0 0 24 24"><path d="M6 8 4 3l5 3.5" fill="#f2c078" stroke="#f2c078" stroke-width="1.4" stroke-linejoin="round"/><path d="M18 8l2-5-5 3.5" fill="#f2c078" stroke="#f2c078" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="7" fill="#f2c078"/><circle cx="9.2" cy="13" r="1" fill="#2a1a12"/><circle cx="14.8" cy="13" r="1" fill="#2a1a12"/><path d="M11.3 15.7h1.4L12 16.7z" fill="#c76b6b"/><path d="M12 16.7q-1 1-2.1.4M12 16.7q1 1 2.1.4" stroke="#2a1a12" stroke-width="0.7" fill="none" stroke-linecap="round"/><path d="M1.5 13.2 6.3 13.6M1.8 15.6 6.4 14.7M22.5 13.2 17.7 13.6M22.2 15.6 17.6 14.7" stroke="#2a1a12" stroke-width="0.6" stroke-linecap="round"/></svg>`;
// Shih Tzu: floppy ears, fur bangs, flat snout.
const WISHLIST_DOG_SVG = `<svg class="icon-dog" viewBox="0 0 24 24"><ellipse cx="4.3" cy="13" rx="2.5" ry="4" fill="#c9a876" transform="rotate(-15 4.3 13)"/><ellipse cx="19.7" cy="13" rx="2.5" ry="4" fill="#c9a876" transform="rotate(15 19.7 13)"/><circle cx="12" cy="13.5" r="7.5" fill="#f5e6d3"/><path d="M6.7 9Q9 5.8 12 6.8Q15 5.8 17.3 9" stroke="#c9a876" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="9.3" cy="13.5" r="1" fill="#2a1a12"/><circle cx="14.7" cy="13.5" r="1" fill="#2a1a12"/><ellipse cx="12" cy="16.3" rx="1.2" ry="0.9" fill="#2a1a12"/><path d="M12 17.2q-1.1 1-2.2.3M12 17.2q1.1 1 2.2.3" stroke="#2a1a12" stroke-width="0.7" fill="none" stroke-linecap="round"/></svg>`;

function randomPet() {
  return Math.random() < 0.5 ? 'cat' : 'dog';
}

// Product fields are admin-entered (products are write-locked to the
// owner's account in firestore.rules), but they still render into every
// visitor's browser — escaping means a stray "<" or "&" in a pasted name/
// description can't break the page or inject markup.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function productCardHTML(product) {
  const badgeLabel = stockBadgeLabel(product.stockStatus);
  const photo = product.photos && product.photos[0] ? product.photos[0] : '';
  const priceText = 'Rs. ' + product.price.toLocaleString('en-IN');
  const design = product.attributes && product.attributes.design ? product.attributes.design : '';
  const soldOut = product.stockStatus === 'sold_out';
  const wished = isWishlisted(product.id);
  const name = escapeHtml(product.name);
  return `
    <div class="product-card ${soldOut ? 'sold_out' : ''}">
      <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card-photo">
        <img src="${photo}" alt="${name}" loading="lazy">
        <span class="stock-badge ${product.stockStatus}">${badgeLabel}</span>
        <button class="wishlist-btn ${wished ? 'active' : ''}" data-id="${product.id}" data-pet="${randomPet()}" type="button" aria-label="${wished ? 'Remove from wishlist' : 'Add to wishlist'}">${WISHLIST_HEART_SVG}${WISHLIST_CAT_SVG}${WISHLIST_DOG_SVG}</button>
        <button class="product-card-quickview" data-id="${product.id}" type="button" aria-label="Quick view">Quick View</button>
      </a>
      <div class="product-card-body">
        <a href="product.html?id=${encodeURIComponent(product.id)}"><h3 class="product-card-name">${name}</h3></a>
        ${design ? `<div class="product-card-design">${escapeHtml(design)}</div>` : ''}
        <div class="product-card-divider"></div>
        <div class="product-card-price">${priceText}</div>
        ${!soldOut ? `
        <div class="product-card-mini-actions">
          <button class="mini-action btn-add-cart" data-id="${product.id}" type="button">Add to Cart</button>
          <button class="mini-action mini-action-buy btn-buy-now" data-id="${product.id}" type="button">Buy Now</button>
        </div>` : ''}
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

  container.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const active = toggleWishlist(btn.dataset.id);
      if (active) btn.dataset.pet = randomPet();
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
      showToast(active ? 'Added to Wishlist' : 'Removed from Wishlist');
    });
  });

  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
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
      e.stopPropagation();
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

// Sorts by the owner's saved order for this section (admin's Product Order
// tab — home page or a specific category); anything not in that list yet —
// a brand-new product — is appended at the end, in whatever order
// DataSource returned it, instead of vanishing.
function applyOrder(products, orderIds) {
  const byId = new Map(products.map(p => [p.id, p]));
  const ordered = [];
  orderIds.forEach(id => {
    if (byId.has(id)) { ordered.push(byId.get(id)); byId.delete(id); }
  });
  byId.forEach(p => ordered.push(p));
  return ordered;
}

async function initHomeFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const [all, orderIds] = await Promise.all([
    DataSource.getAllProducts(),
    DataSource.getHomeOrder()
  ]);
  renderProductGrid('featured-grid', applyOrder(all, orderIds));

  const toggle = document.getElementById('grid-view-toggle');
  if (toggle) {
    toggle.querySelectorAll('.grid-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('.grid-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        grid.classList.toggle('grid-2up', btn.dataset.mode === '2');
      });
    });
  }
}

async function initTopSelling() {
  const section = document.getElementById('top-selling-section');
  if (!section) return;
  const ids = await DataSource.getTopSellingIds();
  const products = (await Promise.all(ids.map(id => DataSource.getProductById(id)))).filter(Boolean);
  if (!products.length) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  renderProductGrid('top-selling-grid', products);
  // The scroll buttons (js/hscroll-buttons.js) size themselves up once at
  // load, before this async Firestore fetch resolves — nudge them to
  // re-check now that the row actually has content.
  document.getElementById('top-selling-grid').dispatchEvent(new Event('scroll'));
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
  const [products, orderIds] = await Promise.all([
    DataSource.getProductsByCategory(cat),
    cat ? DataSource.getCategoryOrder(cat) : Promise.resolve([])
  ]);
  renderProductGrid('product-grid', cat ? applyOrder(products, orderIds) : products);
}

document.addEventListener('DOMContentLoaded', () => {
  initHomeFeatured();
  initTopSelling();
  initCategoryPage();
});
