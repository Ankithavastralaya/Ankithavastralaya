// Renders up to 4 Instagram video slots, side by side on desktop and
// wrapping down to 2/1 columns on smaller screens (see .insta-video-grid).
// Real videos use Instagram's own oEmbed blockquote + embed.js — the
// sanctioned way to show a post/reel on an external site. Slots with no
// URL yet show a placeholder instead.

let instagramEmbedScriptRequested = false;

function loadInstagramEmbedScript(callback) {
  if (window.instgrm) { callback(); return; }
  if (instagramEmbedScriptRequested) {
    const check = setInterval(() => {
      if (window.instgrm) { clearInterval(check); callback(); }
    }, 200);
    return;
  }
  instagramEmbedScriptRequested = true;
  const script = document.createElement('script');
  script.src = 'https://www.instagram.com/embed.js';
  script.async = true;
  script.onload = callback;
  document.body.appendChild(script);
}

function instaSlotHTML(url, index) {
  if (!url) {
    return `
      <div class="insta-video-slot insta-video-placeholder">
        <div class="insta-play-icon">&#9658;</div>
        <span>Video ${index + 1} coming soon</span>
      </div>`;
  }
  return `
    <div class="insta-video-slot">
      <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin:0;"></blockquote>
    </div>`;
}

function renderInstagramVideos(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const configured = (typeof INSTAGRAM_VIDEO_URLS !== 'undefined' ? INSTAGRAM_VIDEO_URLS : []);
  const urls = configured.slice(0, 4);
  while (urls.length < 4) urls.push(null);

  container.innerHTML = urls.map(instaSlotHTML).join('');

  if (urls.some(u => u)) {
    loadInstagramEmbedScript(() => {
      if (window.instgrm) window.instgrm.Embeds.process();
    });
  }
}
