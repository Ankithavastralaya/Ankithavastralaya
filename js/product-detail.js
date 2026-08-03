// Renders product.html?id=<productId>. Attribute rows are built dynamically
// from whatever is present on the product — including the open-ended
// attributes.custom[] list — so any brand-new attribute the admin invents
// later shows up here automatically with no code change.

// sizes is an open-ended array of {label, stock, status} in the order the
// owner entered them in the admin — not a fixed S/M/L/XL list, so any
// custom size name (2XL, 6XL, "Free Size", etc.) just works with no code
// change. status is missing on older products saved before per-size status
// existed, so it falls back to stock-based in_stock/sold_out.
function buildSizeChipsHTML(sizes) {
  if (!Array.isArray(sizes) || !sizes.length) return '';
  return `
    <div class="size-selector" id="size-selector">
      <div class="size-selector-label">Select Size</div>
      <div class="size-chip-row">
        ${sizes.map(s => {
          const status = s.status || ((Number(s.stock) || 0) > 0 ? 'in_stock' : 'sold_out');
          const soldOut = status === 'sold_out';
          const preOrder = status === 'pre_order';
          const cls = [soldOut ? 'out-of-stock' : '', preOrder ? 'pre-order' : ''].filter(Boolean).join(' ');
          return `<button type="button" class="size-chip ${cls}" data-size="${escapeHtmlAttr(s.label)}" ${soldOut ? 'disabled' : ''}>${escapeHtmlAttr(s.label)}${preOrder ? ' <span class="size-chip-tag">Pre-Order</span>' : ''}</button>`;
        }).join('')}
      </div>
      <div class="size-selector-note" id="size-selector-note"></div>
    </div>`;
}

function escapeHtmlAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Highlights are a separate bullet list from the free-text description —
// stored as their own array (product.highlights) rather than folded into
// product.description, so they render as a distinct "Highlights" list
// instead of just more description text.
function buildHighlightsHTML(highlights) {
  if (!Array.isArray(highlights) || !highlights.length) return '';
  return `
    <div class="pd-highlights">
      <div class="pd-highlights-label">Highlights</div>
      <ul class="pd-highlights-list">
        ${highlights.map(h => `<li>${escapeHtmlAttr(h)}</li>`).join('')}
      </ul>
    </div>`;
}

// Gallery mixes photos with a single optional video (product.video) into
// one ordered list of {type, src} so the main viewer and thumbnail strip
// can treat them uniformly — video is always last, after all photos.
function buildGalleryItems(product, photos) {
  const items = photos.map(src => ({ type: 'photo', src }));
  if (product.video) items.push({ type: 'video', src: product.video });
  return items;
}

function mediaHTML(item, id) {
  return item.type === 'video'
    ? `<video id="${id}" src="${item.src}" controls playsinline></video>`
    : `<img id="${id}" src="${item.src}" alt="">`;
}

function buildAttributeRows(attributes) {
  if (!attributes) return [];
  const rows = [];
  if (attributes.subCategory) rows.push(['Sub-Category', attributes.subCategory]);
  if (attributes.fabric) rows.push(['Fabric', attributes.fabric]);
  if (attributes.design) rows.push(['Design', attributes.design]);
  if (attributes.weave) rows.push(['Weave Type', attributes.weave]);
  if (attributes.loomType) rows.push(['Loom Type', attributes.loomType]);
  if (attributes.dressMaterialMeters) rows.push(['Dress Material', `${attributes.dressMaterialMeters} m`]);
  if (attributes.pantMaterialMeters) rows.push(['Pant Material', `${attributes.pantMaterialMeters} m`]);
  (attributes.custom || []).forEach(pair => {
    if (pair.key && pair.value) rows.push([pair.key, pair.value]);
  });
  return rows;
}

// Product name/description/attributes are admin-entered today (products
// are write-locked to the owner's account in firestore.rules), but they
// still render into every visitor's browser — escaping here means one
// stray "<" or "&" in a pasted description can't break the page or, if
// this ever becomes editable by anyone else, can't inject markup.
function escapeAttrPair([k, v]) {
  return [escapeHtmlAttr(k), escapeHtmlAttr(v)];
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
  const galleryItems = buildGalleryItems(product, photos);
  const sizeChipsHTML = product.category === 'readymade' ? buildSizeChipsHTML(sortSizesCanonical(normalizeSizes(product.sizes))) : '';
  const requiresSize = !!sizeChipsHTML;

  root.innerHTML = `
    <div class="product-detail">
      <div class="pd-gallery">
        <div class="pd-gallery-main">${mediaHTML(galleryItems[0], 'pd-main-media')}</div>
        ${galleryItems.length > 1 ? `<div class="pd-thumbs">${galleryItems.map((item, i) =>
          item.type === 'video'
            ? `<div class="pd-thumb-video ${i === 0 ? 'active' : ''}" data-index="${i}"><span class="insta-play-icon">&#9658;</span></div>`
            : `<img src="${item.src}" data-index="${i}" class="${i === 0 ? 'active' : ''}" alt="${escapeHtmlAttr(product.name)} photo ${i + 1}">`
        ).join('')}</div>` : ''}
      </div>
      <div class="pd-info">
        <div class="pd-cat">${escapeHtmlAttr(DataSource.categoryLabel(product.category))}</div>
        <h1 class="pd-name">${escapeHtmlAttr(product.name)}</h1>
        <div class="pd-price">${priceText}</div>
        <span class="pd-badge ${product.stockStatus}">${badgeLabel}</span>
        <p class="pd-note">${stockNote}</p>
        <p class="pd-desc">${escapeHtmlAttr(product.description || '')}</p>
        ${buildHighlightsHTML(product.highlights)}
        ${attrRows.length ? `<table class="attr-table">${attrRows.map(escapeAttrPair).map(([k, v]) =>
          `<tr><td>${k}</td><td>${v}</td></tr>`
        ).join('')}</table>` : ''}
        ${!soldOut ? sizeChipsHTML : ''}
        ${soldOut ? `
        <span class="mini-action mini-action-soldout">Sold Out</span>` : `
        <div class="pd-qty-row">
          <div class="qty-control">
            <button type="button" id="qty-minus" aria-label="Decrease quantity">−</button>
            <input type="number" id="qty-input" value="1" min="1">
            <button type="button" id="qty-plus" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="pd-actions">
          <button class="mini-action mini-action-lg" id="add-to-cart-btn" type="button">Add to Cart</button>
          <button class="mini-action mini-action-buy mini-action-lg" id="buy-now-btn" type="button">Buy Now</button>
        </div>`}
      </div>
    </div>`;

  const galleryMain = root.querySelector('.pd-gallery-main');
  root.querySelectorAll('.pd-thumbs img, .pd-thumbs .pd-thumb-video').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const item = galleryItems[Number(thumb.dataset.index)];
      galleryMain.innerHTML = mediaHTML(item, 'pd-main-media');
      root.querySelectorAll('.pd-thumbs img, .pd-thumbs .pd-thumb-video').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  if (!soldOut) {
    let selectedSize = null;
    root.querySelectorAll('.size-chip:not(.out-of-stock)').forEach(chip => {
      chip.addEventListener('click', () => {
        root.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedSize = chip.dataset.size;
        const note = document.getElementById('size-selector-note');
        if (note) note.textContent = '';
      });
    });

    function ensureSizeSelected() {
      if (!requiresSize) return true;
      if (selectedSize) return true;
      const note = document.getElementById('size-selector-note');
      if (note) note.textContent = 'Please select a size before continuing.';
      return false;
    }

    const qtyInput = document.getElementById('qty-input');
    document.getElementById('qty-minus').addEventListener('click', () => {
      qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) - 1);
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      qtyInput.value = parseInt(qtyInput.value || '1', 10) + 1;
    });
    document.getElementById('add-to-cart-btn').addEventListener('click', () => {
      if (!ensureSizeSelected()) return;
      const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
      addToCart(product, qty, selectedSize);
      showToast(product.name + ' added to cart');
    });
    document.getElementById('buy-now-btn').addEventListener('click', () => {
      if (!ensureSizeSelected()) return;
      const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
      addToCart(product, qty, selectedSize);
      window.location.href = 'checkout.html';
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
