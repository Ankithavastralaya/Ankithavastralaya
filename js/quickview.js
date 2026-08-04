// Quick View modal for product cards on index.html/category.html — lets a
// customer preview photo, price, attributes and stock without leaving the
// grid. Modal markup is built on demand and appended once, reused after.

function qvSizeChipsHTML(sizes) {
  if (!Array.isArray(sizes) || !sizes.length) return '';
  return `
    <div class="size-selector" id="qv-size-selector">
      <div class="size-selector-label-row">
        <div class="size-selector-label">Select Size</div>
        ${typeof hasSizeChart === 'function' && hasSizeChart() ? '<button type="button" class="size-chart-link" id="qv-size-chart-open-btn">View Size Chart</button>' : ''}
      </div>
      <div class="size-chip-row">
        ${sizes.map(s => {
          const status = s.status || ((Number(s.stock) || 0) > 0 ? 'in_stock' : 'sold_out');
          const soldOut = status === 'sold_out';
          const preOrder = status === 'pre_order';
          const cls = [soldOut ? 'out-of-stock' : '', preOrder ? 'pre-order' : ''].filter(Boolean).join(' ');
          return `<button type="button" class="size-chip ${cls}" data-size="${escapeHtmlAttr(s.label)}" ${soldOut ? 'disabled' : ''}>${escapeHtmlAttr(s.label)}${preOrder ? ' <span class="size-chip-tag">Pre-Order</span>' : ''}</button>`;
        }).join('')}
      </div>
      <div class="size-selector-note" id="qv-size-selector-note"></div>
    </div>`;
}

function escapeHtmlAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function qvAttributeRows(attributes) {
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

function qvEnsureModal() {
  let modal = document.getElementById('quickview-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'quickview-modal';
  modal.className = 'quickview-modal';
  modal.innerHTML = `
    <div class="quickview-backdrop" id="quickview-backdrop"></div>
    <div class="quickview-panel">
      <button class="quickview-close" id="quickview-close" type="button" aria-label="Close">&times;</button>
      <div id="quickview-body"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#quickview-backdrop').addEventListener('click', qvClose);
  modal.querySelector('#quickview-close').addEventListener('click', qvClose);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') qvClose();
  });
  return modal;
}

function qvClose() {
  const modal = document.getElementById('quickview-modal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('quickview-lock');
}

function openQuickView(product) {
  const modal = qvEnsureModal();
  const badgeLabel = stockBadgeLabel(product.stockStatus);
  const soldOut = product.stockStatus === 'sold_out';
  const priceText = 'Rs. ' + product.price.toLocaleString('en-IN');
  const attrRows = qvAttributeRows(product.attributes);
  const photo = product.photos && product.photos[0] ? product.photos[0] : '';
  const sizeChipsHTML = product.category === 'readymade' ? qvSizeChipsHTML(sortSizesCanonical(normalizeSizes(product.sizes))) : '';
  const requiresSize = !!sizeChipsHTML;

  const name = escapeHtmlAttr(product.name);
  modal.querySelector('#quickview-body').innerHTML = `
    <div class="quickview-photo"><img src="${escapeHtmlAttr(photo)}" alt="${name}"></div>
    <div class="quickview-info">
      <div class="pd-cat">${escapeHtmlAttr(DataSource.categoryLabel(product.category))}</div>
      <h3 class="quickview-name">${name}</h3>
      <div class="pd-price">${priceText}</div>
      <span class="pd-badge ${product.stockStatus}">${badgeLabel}</span>
      ${attrRows.length ? `<table class="attr-table">${attrRows.map(([k, v]) =>
        `<tr><td>${escapeHtmlAttr(k)}</td><td>${escapeHtmlAttr(v)}</td></tr>`
      ).join('')}</table>` : ''}
      ${!soldOut ? sizeChipsHTML : ''}
      ${soldOut ? `
        <span class="mini-action mini-action-soldout">Sold Out</span>` : `
        <div class="pd-actions">
          <button class="mini-action mini-action-lg" id="qv-add-cart" type="button">Add to Cart</button>
          <button class="mini-action mini-action-buy mini-action-lg" id="qv-buy-now" type="button">Buy Now</button>
        </div>`}
      <a href="product.html?id=${encodeURIComponent(product.id)}" class="quickview-full-link">View Full Details</a>
    </div>`;

  const qvSizeChartBtn = document.getElementById('qv-size-chart-open-btn');
  if (qvSizeChartBtn) qvSizeChartBtn.addEventListener('click', () => openSizeChartModal());

  if (!soldOut) {
    let selectedSize = null;
    modal.querySelectorAll('.size-chip:not(.out-of-stock)').forEach(chip => {
      chip.addEventListener('click', () => {
        modal.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedSize = chip.dataset.size;
        const note = document.getElementById('qv-size-selector-note');
        if (note) note.textContent = '';
      });
    });

    function ensureSizeSelected() {
      if (!requiresSize) return true;
      if (selectedSize) return true;
      const note = document.getElementById('qv-size-selector-note');
      if (note) note.textContent = 'Please select a size before continuing.';
      return false;
    }

    modal.querySelector('#qv-add-cart').addEventListener('click', () => {
      if (!ensureSizeSelected()) return;
      addToCart(product, 1, selectedSize);
      showToast(product.name + ' added to cart');
      qvClose();
    });
    modal.querySelector('#qv-buy-now').addEventListener('click', () => {
      if (!ensureSizeSelected()) return;
      addToCart(product, 1, selectedSize);
      window.location.href = 'checkout.html';
    });
  }

  modal.classList.add('open');
  document.body.classList.add('quickview-lock');
}
