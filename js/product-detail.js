// Renders product.html?id=<productId>. Attribute rows are built dynamically
// from whatever is present on the product — including the open-ended
// attributes.custom[] list — so any brand-new attribute the admin invents
// later shows up here automatically with no code change.

function buildAttributeRows(attributes) {
  if (!attributes) return [];
  const rows = [];
  if (attributes.fabric) rows.push(['Fabric', attributes.fabric]);
  if (attributes.design) rows.push(['Design', attributes.design]);
  if (attributes.weave) rows.push(['Weave Type', attributes.weave]);
  if (attributes.loomType) rows.push(['Loom Type', attributes.loomType]);
  (attributes.custom || []).forEach(pair => {
    if (pair.key && pair.value) rows.push([pair.key, pair.value]);
  });
  return rows;
}

function renderProductNotFound(root) {
  root.innerHTML = `
    <div class="empty-state">
      <p>We couldn't find that product — it may have been removed.</p>
      <a href="index.html" class="btn btn-ghost">Back to Home</a>
    </div>`;
}

function renderProduct(product) {
  const root = document.getElementById('product-root');
  document.title = product.name + ' — Ankitha Vastralaya';
  document.body.dataset.page = product.category;

  const badgeLabel = stockBadgeLabel(product.stockStatus);
  const soldOut = product.stockStatus === 'sold_out';
  const stockNote = product.stockStatus === 'pre_order'
    ? 'This item is sourced specially from our weaver/wholesaler network once you order — delivery takes a little longer than in-stock items.'
    : product.stockStatus === 'sold_out'
    ? 'This item is currently sold out.'
    : (product.stockCount ? `${product.stockCount} in stock, ready to ship.` : 'Ready to ship.');
  const priceText = 'Rs. ' + product.price.toLocaleString('en-IN');
  const attrRows = buildAttributeRows(product.attributes);
  const photos = product.photos && product.photos.length ? product.photos : [''];

  root.innerHTML = `
    <div class="product-detail">
      <div class="pd-gallery">
        <div class="pd-gallery-main"><img id="pd-main-photo" src="${photos[0]}" alt="${product.name}"></div>
        ${photos.length > 1 ? `<div class="pd-thumbs">${photos.map((p, i) =>
          `<img src="${p}" data-src="${p}" class="${i === 0 ? 'active' : ''}" alt="${product.name} photo ${i + 1}">`
        ).join('')}</div>` : ''}
      </div>
      <div class="pd-info">
        <div class="pd-cat">${DataSource.categoryLabel(product.category)}</div>
        <h1 class="pd-name">${product.name}</h1>
        <div class="pd-price">${priceText}</div>
        <span class="pd-badge ${product.stockStatus}">${badgeLabel}</span>
        <p class="pd-note">${stockNote}</p>
        <p class="pd-desc">${product.description || ''}</p>
        ${attrRows.length ? `<table class="attr-table">${attrRows.map(([k, v]) =>
          `<tr><td>${k}</td><td>${v}</td></tr>`
        ).join('')}</table>` : ''}
        ${soldOut ? `
        <button class="btn btn-ghost btn-block" type="button" disabled>Sold Out</button>` : `
        <div class="pd-qty-row">
          <div class="qty-control">
            <button type="button" id="qty-minus" aria-label="Decrease quantity">−</button>
            <input type="number" id="qty-input" value="1" min="1">
            <button type="button" id="qty-plus" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="btn btn-primary btn-block" id="add-to-cart-btn" type="button">Add to Cart</button>`}
      </div>
    </div>`;

  const mainPhoto = document.getElementById('pd-main-photo');
  root.querySelectorAll('.pd-thumbs img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      mainPhoto.src = thumb.dataset.src;
      root.querySelectorAll('.pd-thumbs img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  if (!soldOut) {
    const qtyInput = document.getElementById('qty-input');
    document.getElementById('qty-minus').addEventListener('click', () => {
      qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) - 1);
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      qtyInput.value = parseInt(qtyInput.value || '1', 10) + 1;
    });
    document.getElementById('add-to-cart-btn').addEventListener('click', () => {
      const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
      addToCart(product, qty);
      showToast(product.name + ' added to cart');
    });
  }

  if (typeof highlightActiveNav === 'function') highlightActiveNav();
}

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('product-root');
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const product = id ? await DataSource.getProductById(id) : null;
  if (!product) {
    renderProductNotFound(root);
    return;
  }
  renderProduct(product);
});
