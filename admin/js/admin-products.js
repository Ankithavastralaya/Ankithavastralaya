// Products tab: list, add, edit, hide/unhide. Every save also runs
// arrayUnion on meta/attributeSuggestions for any fabric/design/weave/loom
// value or custom-attribute key just typed in — arrayUnion is naturally
// idempotent, so this is safe to call unconditionally on every save and is
// what makes those values show up as <datalist> suggestions on the next
// product without any code change.

import { db } from '../../js/firebase-init.js';
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CATEGORY_LABELS = {
  sarees: 'Sarees',
  unstitched: 'Unstitched Dress Materials',
  readymade: 'Ready-Made Dresses',
  jewellery: 'Jewellery'
};
const STOCK_LABELS = { in_stock: 'In Stock', pre_order: 'Pre-Order', sold_out: 'Sold Out' };

// Short human-readable Product ID (mirrors the Order ID scheme in
// checkout.js) so the owner has something readable to note down and match
// against order line items, instead of Firestore's opaque auto-generated
// doc ID. Used as the Firestore doc ID itself for every new product.
function generateProductId() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AVP${y}${m}${d}-${rand}`;
}

const productsTbody = document.getElementById('products-tbody');
const productsEmpty = document.getElementById('products-empty');
const form = document.getElementById('product-form');
const formTitle = document.getElementById('product-form-title');
const stockCountField = document.getElementById('p-stock-count-field');
const photosRepeater = document.getElementById('p-photos-repeater');
const customRepeater = document.getElementById('p-custom-repeater');
const sizesField = document.getElementById('p-sizes-field');
const sizesRepeater = document.getElementById('p-sizes-repeater');
const metersField = document.getElementById('p-meters-field');
const dressMetersInput = document.getElementById('p-dress-meters');
const pantMetersInput = document.getElementById('p-pant-meters');
const categorySelect = document.getElementById('p-category');
const productIdInput = document.getElementById('p-custom-id');
const productModal = document.getElementById('product-modal');

// Add/Edit opens as an overlay modal (rather than expanding inline above the
// table) so the products table never shifts position on screen.
function openProductModal() {
  productModal.classList.add('open');
  document.body.classList.add('admin-modal-lock');
}

function closeProductModal() {
  productModal.classList.remove('open');
  document.body.classList.remove('admin-modal-lock');
}

productModal.querySelector('#product-modal-backdrop').addEventListener('click', closeProductModal);
productModal.querySelector('#product-modal-close').addEventListener('click', closeProductModal);

let allProducts = [];

// ---------- meta / datalist suggestions ----------

async function loadMetaSuggestions() {
  const snap = await getDocs(collection(db, 'meta'));
  const metaDoc = snap.docs.find(d => d.id === 'attributeSuggestions');
  const data = metaDoc ? metaDoc.data() : {};
  fillDatalist('fabric-list', data.fabric);
  fillDatalist('design-list', data.design);
  fillDatalist('weave-list', data.weave);
  fillDatalist('loom-list', data.loomType);
  fillDatalist('custom-key-list', data.customKeys);
}

function fillDatalist(id, values) {
  const el = document.getElementById(id);
  el.innerHTML = (values || []).map(v => `<option value="${escapeHtml(v)}">`).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- repeaters ----------

function addPhotoRow(value) {
  const row = document.createElement('div');
  row.className = 'repeater-row';
  row.innerHTML = `
    <input type="url" class="p-photo-input" placeholder="https://..." value="${escapeHtml(value || '')}">
    <button type="button" class="repeater-remove" aria-label="Remove">&times;</button>`;
  row.querySelector('.repeater-remove').addEventListener('click', () => row.remove());
  photosRepeater.appendChild(row);
}

function addCustomRow(key, value) {
  const row = document.createElement('div');
  row.className = 'repeater-row';
  row.innerHTML = `
    <input type="text" class="p-custom-key" list="custom-key-list" placeholder="Attribute name" value="${escapeHtml(key || '')}">
    <input type="text" class="p-custom-value" placeholder="Value" value="${escapeHtml(value || '')}">
    <button type="button" class="repeater-remove" aria-label="Remove">&times;</button>`;
  row.querySelector('.repeater-remove').addEventListener('click', () => row.remove());
  customRepeater.appendChild(row);
}

document.getElementById('p-photos-add').addEventListener('click', () => addPhotoRow());
document.getElementById('p-custom-add').addEventListener('click', () => addCustomRow());

// ---------- sizes (Ready-Made Dresses only) ----------
// An open-ended repeater rather than a fixed S/M/L/XL list — the owner can
// add any size label she needs (2XL, 6XL, "Free Size", waist numbers, etc.)
// with no code change, same pattern as the photos/custom-attribute repeaters.
// Order in the array is preserved as the display order on the storefront.

function addSizeRow(label, stock) {
  const row = document.createElement('div');
  row.className = 'repeater-row';
  row.innerHTML = `
    <input type="text" class="p-size-label" list="size-label-list" placeholder="Size (e.g. M, XL, 2XL)" value="${escapeHtml(label || '')}">
    <input type="number" class="p-size-stock" min="0" placeholder="Stock" value="${stock !== undefined && stock !== null ? stock : ''}">
    <button type="button" class="repeater-remove" aria-label="Remove">&times;</button>`;
  row.querySelector('.repeater-remove').addEventListener('click', () => row.remove());
  sizesRepeater.appendChild(row);
}

function buildSizesEditor(sizes) {
  sizesRepeater.innerHTML = '';
  (sizes || []).forEach(s => addSizeRow(s.label, s.stock));
  if (!sizes || !sizes.length) addSizeRow();
}

document.getElementById('p-sizes-add').addEventListener('click', () => addSizeRow());

// Each offered size stores its own stock count — a size is out of stock
// once its count hits 0, rather than the owner tracking one combined total
// across every size.
function readSizesFromEditor() {
  const sizes = [];
  sizesRepeater.querySelectorAll('.repeater-row').forEach(row => {
    const label = row.querySelector('.p-size-label').value.trim();
    if (!label) return;
    const stock = Math.max(0, Number(row.querySelector('.p-size-stock').value) || 0);
    sizes.push({ label, stock });
  });
  return sizes;
}

function toggleSizesField() {
  sizesField.style.display = categorySelect.value === 'readymade' ? 'block' : 'none';
  metersField.style.display = categorySelect.value === 'unstitched' ? 'block' : 'none';
}
categorySelect.addEventListener('change', toggleSizesField);

document.querySelectorAll('input[name="p-stock"]').forEach(radio => {
  radio.addEventListener('change', () => {
    stockCountField.style.display = document.querySelector('input[name="p-stock"]:checked').value === 'in_stock' ? 'block' : 'none';
  });
});

// ---------- list rendering ----------

async function loadProducts() {
  const snap = await getDocs(collection(db, 'products'));
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProductsTable();
}

function renderProductsTable() {
  if (!allProducts.length) {
    productsTbody.innerHTML = '';
    productsEmpty.style.display = 'block';
    return;
  }
  productsEmpty.style.display = 'none';
  productsTbody.innerHTML = allProducts.map(p => `
    <tr>
      <td><img src="${escapeHtml((p.photos && p.photos[0]) || '')}" alt=""></td>
      <td class="product-id-cell">${escapeHtml(p.id)}</td>
      <td>${escapeHtml(p.name)}${p.active === false ? ' <em>(hidden)</em>' : ''}</td>
      <td>${CATEGORY_LABELS[p.category] || p.category}</td>
      <td>Rs. ${Number(p.price || 0).toLocaleString('en-IN')}</td>
      <td>${STOCK_LABELS[p.stockStatus] || p.stockStatus}</td>
      <td>
        <button class="btn btn-ghost btn-small edit-btn" data-id="${p.id}" type="button">Edit</button>
        <button class="btn btn-ghost btn-small toggle-active-btn" data-id="${p.id}" type="button">${p.active === false ? 'Unhide' : 'Hide'}</button>
      </td>
    </tr>`).join('');

  productsTbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openFormForEdit(allProducts.find(p => p.id === btn.dataset.id)));
  });
  productsTbody.querySelectorAll('.toggle-active-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const product = allProducts.find(p => p.id === btn.dataset.id);
      await updateDoc(doc(db, 'products', product.id), { active: product.active === false });
      showToast(product.active === false ? 'Product unhidden' : 'Product hidden');
      loadProducts();
    });
  });
}

// ---------- form open/close ----------

function resetForm() {
  form.reset();
  document.getElementById('p-id').value = '';
  productIdInput.disabled = false;
  productIdInput.value = '';
  photosRepeater.innerHTML = '';
  customRepeater.innerHTML = '';
  addPhotoRow();
  stockCountField.style.display = 'block';
  buildSizesEditor();
  toggleSizesField();
}

document.getElementById('add-product-btn').addEventListener('click', () => {
  resetForm();
  formTitle.textContent = 'Add Product';
  openProductModal();
});

document.getElementById('p-cancel-btn').addEventListener('click', closeProductModal);

function openFormForEdit(product) {
  if (!product) return;
  resetForm();
  formTitle.textContent = 'Edit Product';
  document.getElementById('p-id').value = product.id;
  productIdInput.value = product.id;
  productIdInput.disabled = true;
  document.getElementById('p-category').value = product.category || 'sarees';
  document.getElementById('p-price').value = product.price || 0;
  document.getElementById('p-name').value = product.name || '';
  document.getElementById('p-description').value = product.description || '';
  document.querySelector(`input[name="p-stock"][value="${product.stockStatus || 'in_stock'}"]`).checked = true;
  stockCountField.style.display = (product.stockStatus === 'in_stock' || !product.stockStatus) ? 'block' : 'none';
  document.getElementById('p-stock-count').value = product.stockCount || '';
  document.getElementById('p-active').checked = product.active !== false;

  photosRepeater.innerHTML = '';
  const photos = (product.photos && product.photos.length) ? product.photos : [''];
  photos.forEach(url => addPhotoRow(url));

  const attrs = product.attributes || {};
  document.getElementById('p-fabric').value = attrs.fabric || '';
  document.getElementById('p-design').value = attrs.design || '';
  document.getElementById('p-weave').value = attrs.weave || '';
  document.getElementById('p-loom').value = attrs.loomType || '';
  dressMetersInput.value = attrs.dressMaterialMeters || '';
  pantMetersInput.value = attrs.pantMaterialMeters || '';

  customRepeater.innerHTML = '';
  (attrs.custom || []).forEach(pair => addCustomRow(pair.key, pair.value));

  buildSizesEditor(product.sizes);
  toggleSizesField();

  openProductModal();
}

// ---------- save ----------

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('p-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const photos = Array.from(document.querySelectorAll('.p-photo-input'))
      .map(i => i.value.trim()).filter(Boolean);
    const customPairs = [];
    document.querySelectorAll('#p-custom-repeater .repeater-row').forEach(row => {
      const key = row.querySelector('.p-custom-key').value.trim();
      const value = row.querySelector('.p-custom-value').value.trim();
      if (key && value) customPairs.push({ key, value });
    });

    const fabric = document.getElementById('p-fabric').value.trim();
    const design = document.getElementById('p-design').value.trim();
    const weave = document.getElementById('p-weave').value.trim();
    const loomType = document.getElementById('p-loom').value.trim();
    const stockStatus = document.querySelector('input[name="p-stock"]:checked').value;
    const category = document.getElementById('p-category').value;

    const productData = {
      category,
      name: document.getElementById('p-name').value.trim(),
      description: document.getElementById('p-description').value.trim(),
      price: Number(document.getElementById('p-price').value) || 0,
      photos,
      stockStatus,
      active: document.getElementById('p-active').checked,
      attributes: { fabric, design, weave, loomType, custom: customPairs },
      updatedAt: new Date().toISOString()
    };
    if (stockStatus === 'in_stock') {
      productData.stockCount = Number(document.getElementById('p-stock-count').value) || 0;
    }
    if (category === 'readymade') {
      productData.sizes = readSizesFromEditor();
    }
    if (category === 'unstitched') {
      const dressMeters = dressMetersInput.value.trim();
      const pantMeters = pantMetersInput.value.trim();
      if (dressMeters) productData.attributes.dressMaterialMeters = dressMeters;
      if (pantMeters) productData.attributes.pantMaterialMeters = pantMeters;
    }

    const existingId = document.getElementById('p-id').value;
    if (existingId) {
      await setDoc(doc(db, 'products', existingId), productData, { merge: true });
    } else {
      const customId = productIdInput.value.trim();
      if (customId) {
        if (customId.includes('/') || customId === '.' || customId === '..') {
          showToast('Product ID can\'t contain "/" or be "." or ".."');
          return;
        }
        const clash = await getDoc(doc(db, 'products', customId));
        if (clash.exists()) {
          showToast('That Product ID is already in use — pick a different one.');
          return;
        }
      }
      productData.createdAt = new Date().toISOString();
      await setDoc(doc(db, 'products', customId || generateProductId()), productData);
    }

    // Feed the datalists for next time — arrayUnion is idempotent, safe to
    // call even when nothing actually changed.
    const metaUpdate = {};
    if (fabric) metaUpdate.fabric = arrayUnion(fabric);
    if (design) metaUpdate.design = arrayUnion(design);
    if (weave) metaUpdate.weave = arrayUnion(weave);
    if (loomType) metaUpdate.loomType = arrayUnion(loomType);
    if (customPairs.length) metaUpdate.customKeys = arrayUnion(...customPairs.map(p => p.key));
    if (Object.keys(metaUpdate).length) {
      await setDoc(doc(db, 'meta', 'attributeSuggestions'), metaUpdate, { merge: true });
    }

    showToast('Product saved');
    closeProductModal();
    await loadProducts();
    await loadMetaSuggestions();
  } catch (err) {
    console.error(err);
    showToast('Something went wrong saving — check console for details');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Product';
  }
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadMetaSuggestions();
});
