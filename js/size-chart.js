// Size chart modal shared by product.html (product-detail.js) and the
// Quick View modal (quickview.js). Fetched once and cached here so both
// callers can synchronously check availability when building their
// (synchronous, template-string) size-selector markup.
let sizeChartUrlCache = '';

// product-detail.js awaits this alongside its own product fetch so the
// two Firestore reads run in parallel and the size-chart link is correct
// on the very first render, instead of racing an unresolved cache read.
window.sizeChartReady = new Promise((resolve) => {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      sizeChartUrlCache = await DataSource.getSizeChart();
    } catch (e) {
      sizeChartUrlCache = '';
    }
    resolve();
  });
});

function hasSizeChart() {
  return !!sizeChartUrlCache;
}

function ensureSizeChartModal() {
  let modal = document.getElementById('size-chart-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'size-chart-modal';
  modal.className = 'size-chart-modal';
  modal.innerHTML = `
    <div class="size-chart-backdrop" id="size-chart-backdrop"></div>
    <div class="size-chart-panel">
      <button class="size-chart-close" id="size-chart-close" type="button" aria-label="Close">&times;</button>
      <img id="size-chart-img" alt="Size Chart">
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#size-chart-backdrop').addEventListener('click', closeSizeChartModal);
  modal.querySelector('#size-chart-close').addEventListener('click', closeSizeChartModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSizeChartModal();
  });
  return modal;
}

function closeSizeChartModal() {
  const modal = document.getElementById('size-chart-modal');
  if (modal) modal.classList.remove('open');
}

function openSizeChartModal() {
  if (!sizeChartUrlCache) return;
  const modal = ensureSizeChartModal();
  modal.querySelector('#size-chart-img').src = sizeChartUrlCache;
  modal.classList.add('open');
}

window.hasSizeChart = hasSizeChart;
window.openSizeChartModal = openSizeChartModal;

document.addEventListener('DOMContentLoaded', loadSizeChartUrl);
