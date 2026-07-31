// Products tab: list, add, edit, hide/unhide. Every save also runs
// arrayUnion on meta/attributeSuggestions for any fabric/design/weave/loom
// value or custom-attribute key just typed in — arrayUnion is naturally
// idempotent, so this is safe to call unconditionally on every save and is
// what makes those values show up as <datalist> suggestions on the next
// product without any code change.

import { db } from '../../js/firebase-init.js';
import {
  collection, getDocs, doc, addDoc, setDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CATEGORY_LABELS = {
  sarees: 'Sarees',
  unstitched: 'Unstitched Dress Materials',
  readymade: 'Ready-Made Dresses',
  jewellery: 'Jewellery'
};
const STOCK_LABELS = { in_stock: 'In Stock', pre_order: 'Pre-Order', sold_out: 'Sold Out' };
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const productsTbody = document.getElementById('products-tbody');
const productsEmpty = document.getElementById('products-empty');
const form = document.getElementById('product-form');
const formTitle = document.getElementById('product-form-title');
const stockCountField = document.getElementById('p-stock-count-field');
const photosRepeater = document.getElementById('p-photos-repeater');
const customRepeater = document.getElementById('p-custom-repeater');
const sizesField = document.getElementById('p-sizes-field');
const sizesEditor = document.getElementById('p-sizes-editor');
const categorySelect = document.getElementById('p-category');

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

function buildSizesEditor(sizes) {
  sizes = sizes || {};
  sizesEditor.innerHTML = SIZE_OPTIONS.map(size => `
    <div class="size-editor-row">
      <span class="size-editor-label">${size}</span>
      <select class="size-editor-select" data-size="${size}">
        <option value="not_offered">Not Offered</option>
        <option value="in_stock">Available</option>
        <option value="out_of_stock">Out of Stock</option>
      </select>
    </div>`).join('');
  SIZE_OPTIONS.forEach(size => {
    sizesEditor.querySelector(`[data-size="${size}"]`).value = sizes[size] || 'not_offered';
  });
}

function readSizesFromEditor() {
  const sizes = {};
  sizesEditor.querySelectorAll('.size-editor-select').forEach(sel => {
    if (sel.value !== 'not_offered') sizes[sel.dataset.size] = sel.value;
  });
  return sizes;
}

function toggleSizesField() {
  sizesField.style.display = categorySelect.value === 'readymade' ? 'block' : 'none';
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
  form.style.display = 'block';
  form.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('p-cancel-btn').addEventListener('click', () => {
  form.style.display = 'none';
});

function openFormForEdit(product) {
  if (!product) return;
  resetForm();
  formTitle.textContent = 'Edit Product';
  document.getElementById('p-id').value = product.id;
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

  customRepeater.innerHTML = '';
  (attrs.custom || []).forEach(pair => addCustomRow(pair.key, pair.value));

  buildSizesEditor(product.sizes);
  toggleSizesField();

  form.style.display = 'block';
  form.scrollIntoView({ behavior: 'smooth' });
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

    const existingId = document.getElementById('p-id').value;
    if (existingId) {
      await setDoc(doc(db, 'products', existingId), productData, { merge: true });
    } else {
      productData.createdAt = new Date().toISOString();
      await addDoc(collection(db, 'products'), productData);
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
    form.style.display = 'none';
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
