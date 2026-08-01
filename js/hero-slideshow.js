// Rotates through window.HERO_IMAGES (see js/hero-images.js) as a
// full-width crossfading slideshow. One image just displays statically;
// two or more auto-advance on a timer.
function initHeroSlideshow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const images = window.HERO_IMAGES || [];
  if (!images.length) return;

  container.innerHTML = images.map((src, i) =>
    `<img src="${src}" alt="Ankitha Vastralaya" class="${i === 0 ? 'active' : ''}">`
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
