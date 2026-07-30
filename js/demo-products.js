// Phase 1 placeholder catalog — same document shape the real Firestore
// products will use later, so data-source.js is the only file that changes
// when Phase 2 (Firebase) is wired in.

function placeholderPhoto(label, bg, fg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 640'>` +
    `<rect width='480' height='640' fill='${bg}'/>` +
    `<text x='240' y='320' font-family='Georgia, serif' font-size='30' fill='${fg}' ` +
    `text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

const DEMO_PRODUCTS = [
  {
    id: 'saree-kanchi-peacock',
    category: 'sarees',
    name: 'Kanchipuram Silk Saree — Peacock Blue',
    description: 'Pure Kanchipuram silk saree with a contrast zari border and peacock motif pallu. Comes with an unstitched matching blouse piece.',
    price: 8500,
    photos: [
      placeholderPhoto('Kanchipuram Silk', '#7a1f3d', '#f2e8d8'),
      placeholderPhoto('Peacock Border', '#5c1730', '#e0c47f')
    ],
    stockStatus: 'in_stock',
    stockCount: 1,
    attributes: {
      fabric: 'Kanchipuram Silk',
      design: 'Peacock Motif',
      weave: 'Handwoven Zari',
      loomType: 'Handloom',
      custom: [{ key: 'Blouse Included', value: 'Yes, unstitched' }, { key: 'Saree Length', value: '6.3 m' }]
    },
    active: true
  },
  {
    id: 'saree-chanderi-mint',
    category: 'sarees',
    name: 'Chanderi Cotton Saree — Mint Green',
    description: 'Lightweight Chanderi cotton saree with a delicate gold booti pattern, ideal for daytime festive wear.',
    price: 3200,
    photos: [placeholderPhoto('Chanderi Cotton', '#2e7d4f', '#fbf6ee')],
    stockStatus: 'pre_order',
    attributes: {
      fabric: 'Chanderi',
      design: 'Gold Booti',
      weave: 'Jacquard',
      loomType: 'Handloom',
      custom: [{ key: 'Wash Care', value: 'Dry clean recommended' }]
    },
    active: true
  },
  {
    id: 'saree-banarasi-maroon',
    category: 'sarees',
    name: 'Banarasi Silk Saree — Maroon & Gold',
    description: 'Rich Banarasi silk saree with an all-over gold zari weave, perfect for weddings and receptions.',
    price: 12000,
    photos: [placeholderPhoto('Banarasi Silk', '#c19a49', '#241611')],
    stockStatus: 'pre_order',
    attributes: {
      fabric: 'Banarasi Silk',
      design: 'Zari Border',
      weave: 'Handwoven Zari',
      loomType: 'Handloom',
      custom: [{ key: 'Blouse Included', value: 'Yes, unstitched' }]
    },
    active: true
  },
  {
    id: 'saree-mysore-purple',
    category: 'sarees',
    name: 'Mysore Silk Saree — Royal Purple',
    description: 'Classic Mysore silk saree in royal purple with a simple gold border, easy to drape and maintain.',
    price: 4200,
    photos: [placeholderPhoto('Mysore Silk', '#5b2a86', '#f2e8d8')],
    stockStatus: 'in_stock',
    stockCount: 2,
    attributes: {
      fabric: 'Mysore Silk',
      design: 'Plain with Zari Border',
      weave: 'Plain Weave',
      loomType: 'Powerloom',
      custom: []
    },
    active: true
  },
  {
    id: 'saree-pochampally-ikat',
    category: 'sarees',
    name: 'Pochampally Ikat Saree — Sunset Orange',
    description: 'Traditional Pochampally Ikat saree with a distinctive diamond weave pattern.',
    price: 5600,
    photos: [placeholderPhoto('Pochampally Ikat', '#b5541e', '#fbf6ee')],
    stockStatus: 'sold_out',
    attributes: {
      fabric: 'Pochampally Ikat',
      design: 'Diamond Pattern',
      weave: 'Ikat',
      loomType: 'Handloom',
      custom: []
    },
    active: true
  },
  {
    id: 'unstitched-cotton-floral',
    category: 'unstitched',
    name: 'Cotton Printed Suit Set — Floral',
    description: 'Unstitched 3-piece cotton suit set (top, bottom, dupatta) with a floral block print.',
    price: 1800,
    photos: [placeholderPhoto('Cotton Floral Set', '#e0c47f', '#241611')],
    stockStatus: 'in_stock',
    stockCount: 4,
    attributes: {
      fabric: 'Cotton',
      design: 'Floral Block Print',
      weave: 'Plain Weave',
      loomType: 'Powerloom',
      custom: [{ key: 'Pieces', value: 'Top + Bottom + Dupatta' }]
    },
    active: true
  },
  {
    id: 'unstitched-georgette-embroidered',
    category: 'unstitched',
    name: 'Georgette Embroidered Suit Set',
    description: 'Unstitched georgette suit set with thread embroidery on the front yoke and matching dupatta.',
    price: 2600,
    photos: [placeholderPhoto('Georgette Set', '#a8631a', '#fbf6ee')],
    stockStatus: 'pre_order',
    attributes: {
      fabric: 'Georgette',
      design: 'Thread Embroidery',
      weave: 'Plain Weave',
      loomType: 'Powerloom',
      custom: []
    },
    active: true
  },
  {
    id: 'readymade-anarkali-wine',
    category: 'readymade',
    name: 'Anarkali Gown — Wine Red',
    description: 'Ready-to-wear floor-length Anarkali gown in wine red with sequin detailing.',
    price: 3500,
    photos: [placeholderPhoto('Anarkali Gown', '#5c1730', '#e0c47f')],
    stockStatus: 'in_stock',
    stockCount: 3,
    attributes: {
      fabric: 'Georgette',
      design: 'Sequin Work',
      weave: '',
      loomType: '',
      custom: [{ key: 'Size', value: 'M, L, XL available' }]
    },
    active: true
  },
  {
    id: 'readymade-kurti-pastel',
    category: 'readymade',
    name: 'Straight Cut Kurti — Pastel Yellow',
    description: 'Comfortable everyday cotton kurti in pastel yellow with a straight cut silhouette.',
    price: 950,
    photos: [placeholderPhoto('Pastel Kurti', '#e0c47f', '#241611')],
    stockStatus: 'in_stock',
    stockCount: 6,
    attributes: {
      fabric: 'Cotton',
      design: 'Plain',
      weave: '',
      loomType: '',
      custom: [{ key: 'Size', value: 'S, M, L available' }]
    },
    active: true
  },
  {
    id: 'jewellery-temple-necklace',
    category: 'jewellery',
    name: 'Temple Design Necklace Set',
    description: '1-gram gold plated temple design necklace with matching jhumka earrings.',
    price: 2200,
    photos: [placeholderPhoto('Temple Necklace Set', '#c19a49', '#241611')],
    stockStatus: 'in_stock',
    stockCount: 2,
    attributes: {
      fabric: '',
      design: 'Temple',
      weave: '',
      loomType: '',
      custom: [{ key: 'Plating', value: '1 gram gold' }, { key: 'Includes', value: 'Necklace + Earrings' }]
    },
    active: true
  },
  {
    id: 'jewellery-kundan-choker',
    category: 'jewellery',
    name: 'Kundan Choker Set',
    description: '1-gram gold plated Kundan choker set with pearl drops, sourced on order.',
    price: 3100,
    photos: [placeholderPhoto('Kundan Choker Set', '#7a1f3d', '#f2e8d8')],
    stockStatus: 'pre_order',
    attributes: {
      fabric: '',
      design: 'Kundan with Pearl Drops',
      weave: '',
      loomType: '',
      custom: [{ key: 'Plating', value: '1 gram gold' }]
    },
    active: true
  }
];
