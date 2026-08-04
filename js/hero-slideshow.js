// Rotates through hero images set in the admin's Homepage Media tab
// (meta/heroImages, read live via DataSource.getHeroImages) as a
// full-width crossfading slideshow. One image just displays statically;
// two or more auto-advance on a timer. No local files involved — every
// image is a direct link the owner pasted in.
function escapeHtmlAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function initHeroSlideshow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const images = await DataSource.getHeroImages();
  if (!images.length) return;

  container.innerHTML = images.map((src, i) =>
    `<img src="${escapeHtmlAttr(src)}" alt="Ankitha Vastralaya" class="${i === 0 ? 'active' : ''}">`
  ).join('');

  if (images.length < 2) return;

  const slides = container.querySelectorAll('img');
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => initHeroSlideshow('hero-slideshow'));
