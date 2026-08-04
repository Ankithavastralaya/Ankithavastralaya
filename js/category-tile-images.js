// Swaps a category tile's outline icon for a real photo when one is set
// in the admin's Homepage Media tab (meta/categoryImages, read live via
// DataSource.getCategoryImages). No local files involved — every photo is
// a direct link the owner pasted in; a category left blank just keeps the
// plain icon.
function escapeHtmlAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function applyCategoryTileImages() {
  const map = await DataSource.getCategoryImages();
  document.querySelectorAll('.cat-tile').forEach(tile => {
    const cat = new URL(tile.href, window.location.href).searchParams.get('cat');
    const photo = cat && map[cat];
    if (!photo) return;
    const icon = tile.querySelector('.cat-icon');
    if (!icon) return;
    icon.classList.add('cat-icon-photo');
    icon.innerHTML = `<img src="${escapeHtmlAttr(photo)}" alt="">`;
  });
}

document.addEventListener('DOMContentLoaded', applyCategoryTileImages);
