// Renders up to 4 Instagram video slots, side by side on desktop and
// staying side by side (just smaller) on mobile too — see .insta-video-grid.
// Real videos use Instagram's own oEmbed blockquote + embed.js — the
// sanctioned way to show a post/reel on an external site. Slots with no
// URL yet show a placeholder instead. Links come live from Firestore
// (meta/instagramVideos), managed from the admin dashboard's Instagram tab.

import { db } from './firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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
  // Instagram's embed script resizes this blockquote into an iframe with
  // its own height (based on the real post's aspect ratio) after embed.js
  // runs — the slot can't force a fixed aspect-ratio/overflow:hidden like
  // the placeholder does, or it clips the embed and breaks its play button.
  return `
    <div class="insta-video-slot has-video">
      <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin:0;"></blockquote>
    </div>`;
}

async function getInstagramUrls() {
  try {
    const snap = await getDoc(doc(db, 'meta', 'instagramVideos'));
    const urls = snap.exists() ? (snap.data().urls || []) : [];
    const result = urls.slice(0, 4);
    while (result.length < 4) result.push(null);
    return result;
  } catch (e) {
    return [null, null, null, null];
  }
}

async function renderInstagramVideos(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const urls = await getInstagramUrls();

  container.innerHTML = urls.map(instaSlotHTML).join('');

  if (urls.some(u => u)) {
    loadInstagramEmbedScript(() => {
      if (window.instgrm) window.instgrm.Embeds.process();
    });
  }
}

window.renderInstagramVideos = renderInstagramVideos;
