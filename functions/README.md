# Setup steps (only things I can't do for you)

The code in `index.js` is written and ready. Everything below needs your
own login/account access — I can talk you through any step, but can't do
them myself. **Until these are done, the "Pay Now" button on the live
site will show an error** — checkout no longer falls back to WhatsApp, so
this needs to be finished before the site can take real orders again.

## 1. Enable Blaze on the Firebase project

Firebase Console → project **ankithavastralaya-c7356** → gear icon →
Usage and billing → Details & settings → Modify plan → Blaze. Needs a
card on file. No base fee — at this site's order volume this should
realistically cost $0/month (see the pricing discussion earlier).

## 2. Deploy the Firestore rules (already written, not yet live)

Either the Firebase CLI (`firebase deploy --only firestore:rules`, after
`firebase login` and `firebase use ankithavastralaya-c7356`), or copy the
contents of `firestore.rules` into Firebase Console → Firestore Database →
Rules → paste → Publish.

## 3. Get Razorpay API keys — both Test and Live

You said your Razorpay account is already active. From the Dashboard →
Settings → API Keys, generate **both**:
- A **Test mode** key_id/key_secret pair (used automatically whenever
  someone opens `checkout.html?test=1` — no real money moves, lets you
  rehearse the whole flow safely on the live site)
- A **Live mode** key_id/key_secret pair (used for real checkouts)

## 4. Store all four keys as function secrets

Never paste these into any file in this project — they go into Firebase's
secret manager instead:

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_TEST_KEY_ID
firebase functions:secrets:set RAZORPAY_TEST_KEY_SECRET
```

(Each command prompts you to paste the value — stored encrypted, never
written to any file here.)

## 5. Install the Trigger Email extension (for receipt emails)

Firebase Console → project → Extensions → browse → search "Trigger
Email" (by Firebase, official) → Install. It needs an SMTP provider to
actually send through — during setup it asks for an SMTP connection URI.
Easiest options:
- **Gmail**: use your Gmail address + an "App Password" (Google Account →
  Security → 2-Step Verification → App Passwords) — free, fine at low
  volume, but Gmail does cap daily sending.
- **A transactional email service** (SendGrid, Mailgun, Brevo, etc.) —
  all have free tiers (typically 100–300 emails/day), more reliable at
  scale than Gmail.

When the extension asks which Firestore collection to watch, use the
default: **`mail`** — that's the collection name `functions/index.js`
already writes to.

## 6. Install dependencies and deploy

```bash
cd functions
npm install
firebase deploy --only functions
```

## 7. Try it safely first

Open `checkout.html?test=1` on the live site, place an order with a real
card/UPI in Razorpay's **test mode** (Razorpay's test cards: e.g.
4111 1111 1111 1111, any future expiry, any CVV — no real charge).
Confirm: the payment completes, the confirmation page shows, a receipt
email arrives, and the order shows up in the admin Orders tab tagged
TEST. Only then try a real ₹1 order in live mode to confirm end-to-end
before telling customers it's live.
