// Swaps a category tile's outline icon for a real photo when one is
// configured in js/category-images.js — same "drop a file, add one line"
// pattern as the hero slideshow.
function applyCategoryTileImages() {
  const map = window.CATEGORY_IMAGES || {};
  document.querySelectorAll('.cat-tile').forEach(tile => {
    const cat = new URL(tile.href, window.location.href).searchParams.get('cat');
    const photo = cat && map[cat];
    if (!photo) return;
    const icon = tile.querySelector('.cat-icon');
    if (!icon) return;
    icon.classList.add('cat-icon-photo');
    icon.innerHTML = `<img src="${photo}" alt="">`;
  });
}

document.addEventListener('DOMContentLoaded', applyCategoryTileImages);
