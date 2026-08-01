// Generic left/right scroll buttons for any .hscroll-carousel wrapper —
// works with the video row today, reusable for other horizontal-scroll
// rows later. Buttons are hidden via CSS on touch devices (swipe already
// works there); this just wires the click behavior and disables a button
// once its end of the row is reached.
function initHscrollButtons() {
  document.querySelectorAll('.hscroll-btn').forEach(btn => {
    const targetId = btn.dataset.scrollTarget;
    const track = document.getElementById(targetId);
    if (!track) return;
    const dir = btn.classList.contains('hscroll-btn-prev') ? -1 : 1;

    btn.addEventListener('click', () => {
      track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
    });

    function updateDisabled() {
      const maxScroll = track.scrollWidth - track.clientWidth - 1;
      if (dir < 0) {
        btn.disabled = track.scrollLeft <= 0;
      } else {
        btn.disabled = track.scrollLeft >= maxScroll;
      }
    }
    track.addEventListener('scroll', updateDisabled);
    // Content (real vs placeholder videos, product cards) renders in async
    // after this runs, so re-check shortly after instead of only once now.
    updateDisabled();
    setTimeout(updateDisabled, 500);
  });
}

document.addEventListener('DOMContentLoaded', initHscrollButtons);
