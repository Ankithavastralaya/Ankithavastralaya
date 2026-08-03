// Server-side price verification + Razorpay integration + email receipts.
//
// Not deployed yet — see functions/README.md for the exact setup steps
// (Blaze plan, Razorpay keys as secrets, Trigger Email extension). Nothing
// here runs or costs anything until deployed.
//
// The one rule this whole file exists to enforce: a price/amount charged
// to a customer must always come from this server's own lookup of the
// live /products collection — never from anything the browser sends.
//
// Flow: createRazorpayOrder verifies the cart server-side, opens a
// Razorpay order, and parks the verified cart in a short-lived
// pendingOrders doc (never exposed to any client read/write rule — only
// this admin-SDK code ever touches that collection). verifyRazorpayPayment
// checks the payment signature, then builds the REAL /orders doc entirely
// from that parked data — never from anything the client resends at
// verify time — decrements sized stock, and queues the receipt email.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const crypto = require("crypto");

initializeApp();
const db = getFirestore();

// Set these once with (see functions/README.md for the exact commands):
//   firebase functions:secrets:set RAZORPAY_KEY_ID
//   firebase functions:secrets:set RAZORPAY_KEY_SECRET
//   firebase functions:secrets:set RAZORPAY_TEST_KEY_ID
//   firebase functions:secrets:set RAZORPAY_TEST_KEY_SECRET
// Never put the actual key values in this file or anywhere client-side —
// key_secret in particular must never reach the browser. The TEST pair is
// what checkout.html?test=1 uses, so testing the flow never touches real
// money even though it's the same live site/database.
const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
const RAZORPAY_TEST_KEY_ID = defineSecret("RAZORPAY_TEST_KEY_ID");
const RAZORPAY_TEST_KEY_SECRET = defineSecret("RAZORPAY_TEST_KEY_SECRET");

function generateOrderId() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AV${y}${m}${d}-${rand}`;
}

// Looks up each cart line's REAL current price/stock from Firestore and
// recomputes the subtotal from that — the browser's own idea of the price
// is never trusted, only used to know which products/sizes/quantities
// were requested.
async function computeVerifiedCart(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new HttpsError("invalid-argument", "Cart is empty or too large.");
  }

  const verifiedItems = [];
  let subtotal = 0;

  for (const rawItem of items) {
    const { productId, qty, size } = rawItem || {};
    const quantity = Number(qty);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new HttpsError("invalid-argument", `Invalid item for product ${productId}.`);
    }

    const snap = await db.collection("products").doc(productId).get();
    if (!snap.exists || snap.data().active === false) {
      throw new HttpsError("failed-precondition", `Product ${productId} is no longer available.`);
    }
    const product = snap.data();

    if (size) {
      const sizeEntry = (product.sizes || []).find((s) => s.label === size);
      if (!sizeEntry || sizeEntry.status === "sold_out") {
        throw new HttpsError("failed-precondition", `${product.name} in size ${size} is sold out.`);
      }
    } else if (product.stockStatus === "sold_out") {
      throw new HttpsError("failed-precondition", `${product.name} is sold out.`);
    }

    const price = Number(product.price) || 0;
    subtotal += price * quantity;
    verifiedItems.push({
      productId,
      name: product.name,
      price,
      qty: quantity,
      size: size || null
    });
  }

  return { verifiedItems, subtotal };
}

exports.createRazorpayOrder = onCall(
  { secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_TEST_KEY_ID, RAZORPAY_TEST_KEY_SECRET] },
  async (request) => {
    const { items, customer, isTest } = request.data || {};
    const { verifiedItems, subtotal } = await computeVerifiedCart(items);

    if (subtotal <= 0) {
      throw new HttpsError("invalid-argument", "Order total must be greater than zero.");
    }

    const keyId = isTest ? RAZORPAY_TEST_KEY_ID.value() : RAZORPAY_KEY_ID.value();
    const keySecret = isTest ? RAZORPAY_TEST_KEY_SECRET.value() : RAZORPAY_KEY_SECRET.value();

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(subtotal * 100), // Razorpay wants paise, not rupees
        currency: "INR",
        notes: { source: "ankithavastralaya-website", isTest: String(!!isTest) }
      })
    });
    if (!razorpayRes.ok) {
      throw new HttpsError("internal", "Could not create the payment order — please try again.");
    }
    const razorpayOrder = await razorpayRes.json();

    // Parked here, not written to /orders yet — /orders only ever holds
    // real, paid orders. verifyRazorpayPayment reads this back by ID and
    // deletes it once the real order is created.
    const pendingRef = db.collection("pendingOrders").doc();
    await pendingRef.set({
      items: verifiedItems,
      subtotal,
      customer: customer || {},
      isTest: !!isTest,
      razorpayOrderId: razorpayOrder.id,
      createdAt: new Date().toISOString()
    });

    return {
      pendingOrderId: pendingRef.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      keyId
    };
  }
);

exports.verifyRazorpayPayment = onCall(
  { secrets: [RAZORPAY_KEY_SECRET, RAZORPAY_TEST_KEY_SECRET] },
  async (request) => {
    const { pendingOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.data || {};
    if (!pendingOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new HttpsError("invalid-argument", "Missing payment details.");
    }

    const pendingRef = db.collection("pendingOrders").doc(pendingOrderId);
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      throw new HttpsError("not-found", "Order not found or already processed.");
    }
    const pending = pendingSnap.data();
    if (pending.razorpayOrderId !== razorpay_order_id) {
      throw new HttpsError("invalid-argument", "Order mismatch.");
    }

    const keySecret = pending.isTest ? RAZORPAY_TEST_KEY_SECRET.value() : RAZORPAY_KEY_SECRET.value();
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const isValid =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!isValid) {
      throw new HttpsError("permission-denied", "Payment could not be verified.");
    }

    // Decrement sized stock right away for a real (non-test) paid order.
    if (!pending.isTest) {
      const sizedItems = (pending.items || []).filter((item) => item.size && item.productId);
      for (const item of sizedItems) {
        const productRef = db.collection("products").doc(item.productId);
        await db.runTransaction(async (tx) => {
          const productSnap = await tx.get(productRef);
          if (!productSnap.exists) return;
          const sizes = productSnap.data().sizes;
          if (!Array.isArray(sizes)) return;
          const updated = sizes.map((s) => {
            if (s.label !== item.size) return s;
            const newStock = Math.max(0, (Number(s.stock) || 0) - item.qty);
            return { ...s, stock: newStock, status: newStock <= 0 ? "sold_out" : s.status || "in_stock" };
          });
          tx.update(productRef, { sizes: updated });
        });
      }
    }

    const orderId = generateOrderId();
    await db.collection("orders").doc(orderId).set({
      orderId,
      items: pending.items,
      subtotal: pending.subtotal,
      customer: pending.customer,
      status: "placed",
      isTest: !!pending.isTest,
      stockProcessed: true,
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    await pendingRef.delete();

    // Trigger Email extension picks up docs added to /mail and sends them
    // via whatever SMTP provider it's configured with — see
    // functions/README.md. If the extension isn't installed yet, this
    // write just sits unused; it doesn't block the order or throw.
    if (pending.customer && pending.customer.email) {
      const itemLines = pending.items
        .map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} x${i.qty} — Rs. ${i.price * i.qty}`)
        .join("\n");
      await db.collection("mail").add({
        to: [pending.customer.email],
        message: {
          subject: `Order confirmed — ${orderId} — Ankitha Vastralaya`,
          text: `Hi ${pending.customer.name || ""},\n\nThank you for your order!\n\nOrder ID: ${orderId}\n\n${itemLines}\n\nTotal: Rs. ${pending.subtotal}\n\nWe'll be in touch about delivery.\n\n— Ankitha Vastralaya`
        }
      }).catch((e) => console.error("Failed to queue receipt email:", e));
    }

    return { ok: true, orderId };
  }
);
