// Renders wishlist.html — fetches full product data for every saved ID
// (a product may have been removed/hidden since it was wishlisted, so
// missing ones are just skipped) and offers Move to Cart / Remove per row.

async function loadWishlistProducts() {
  const ids = getWishlist();
  const products = await Promise.all(ids.map(id => DataSource.getProductById(id)));
  return products.filter(Boolean);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wishlistRowHTML(product) {
  const photo = product.photos && product.photos[0] ? product.photos[0] : '';
  const priceText = 'Rs. ' + product.price.toLocaleString('en-IN');
  const soldOut = product.stockStatus === 'sold_out';
  const name = escapeHtml(product.name);
  return `
    <div class="cart-row wishlist-row" data-id="${product.id}">
      <a href="product.html?id=${encodeURIComponent(product.id)}"><img class="cart-row-photo" src="${photo}" alt="${name}"></a>
      <div class="cart-row-info">
        <a href="product.html?id=${encodeURIComponent(product.id)}"><div class="cart-row-name">${name}</div></a>
        <div class="cart-row-stock ${product.stockStatus}">${stockBadgeLabel(product.stockStatus)}</div>
        <div class="cart-row-price">${priceText}</div>
      </div>
      <div class="wishlist-row-actions">
        <button class="btn btn-gold btn-small wishlist-move-cart" data-id="${product.id}" type="button" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Sold Out' : 'Move to Cart'}</button>
        <button class="cart-row-remove" data-id="${product.id}" type="button">Remove</button>
      </div>
    </div>`;
}

async function renderWishlistPage() {
  const root = document.getElementById('wishlist-root');
  const products = await loadWishlistProducts();

  if (!products.length) {
    root.innerHTML = `
      <div class="cart-empty">
        <p>Your wishlist is empty.</p>
        <a href="index.html" class="btn btn-primary">Continue Shopping</a>
      </div>`;
    return;
  }

  root.innerHTML = products.map(wishlistRowHTML).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('wishlist-root');

  root.addEventListener('click', async (e) => {
    const moveBtn = e.target.closest('.wishlist-move-cart');
    const removeBtn = e.target.closest('.cart-row-remove');

    if (moveBtn) {
      const product = await DataSource.getProductById(moveBtn.dataset.id);
      if (!product) return;
      // Ready-Made products need a size picked — Quick View has the size
      // selector and its own Add to Cart, so send it there instead of
      // guessing a size (matches the same rule on the product grid cards).
      if (product.category === 'readymade' && normalizeSizes(product.sizes).length > 0) {
        openQuickView(product);
        return;
      }
      addToCart(product, 1);
      toggleWishlist(product.id);
      showToast(product.name + ' moved to cart');
      renderWishlistPage();
    } else if (removeBtn) {
      toggleWishlist(removeBtn.dataset.id);
      renderWishlistPage();
    }
  });

  renderWishlistPage();
});
