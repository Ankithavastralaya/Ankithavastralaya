// Shared header behavior across every page: mobile menu toggle + active
// link highlighting. Each page sets <body data-page="..."> and each nav
// link sets data-page="..." to match; cart badge count comes from cart.js.

function highlightActiveNav() {
  const currentPage = document.body.dataset.page;
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    a.classList.toggle('active', currentPage && a.dataset.page === currentPage);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('nav-links-panel');
  const backdrop = document.getElementById('nav-backdrop');

  function setMenuOpen(open) {
    if (!panel || !backdrop) return;
    panel.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    if (toggle) toggle.innerHTML = open ? '&times;' : '&#9776;';
  }

  if (toggle) {
    toggle.addEventListener('click', () => setMenuOpen(!panel.classList.contains('open')));
  }
  if (backdrop) {
    backdrop.addEventListener('click', () => setMenuOpen(false));
  }
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => setMenuOpen(false));
  });

  highlightActiveNav();
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}
