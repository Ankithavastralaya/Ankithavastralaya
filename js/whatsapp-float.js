// Floating WhatsApp contact button, shown on every customer-facing page —
// a direct line to the owner for questions outside the order flow itself
// (checkout.js handles the actual order message separately).

const WHATSAPP_FLOAT_NUMBER = '918500907070';

function ensureWhatsAppFloatButton() {
  if (document.getElementById('whatsapp-float')) return;
  const btn = document.createElement('a');
  btn.id = 'whatsapp-float';
  btn.className = 'whatsapp-float';
  btn.href = `https://wa.me/${WHATSAPP_FLOAT_NUMBER}?text=${encodeURIComponent('Hi Ankitha Vastralaya, I have a question about your products.')}`;
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.setAttribute('aria-label', 'Chat with us on WhatsApp');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.2 14.3c-.22.62-1.27 1.19-1.76 1.23-.45.04-.9.22-3.03-.63-2.57-1.03-4.22-3.66-4.35-3.83-.13-.17-1.04-1.38-1.04-2.64 0-1.25.66-1.87.89-2.12.22-.25.5-.31.66-.31.17 0 .33 0 .48.01.15.01.36-.06.56.43.22.53.74 1.83.8 1.96.06.13.1.29.02.46-.08.17-.13.28-.25.43-.13.15-.27.34-.38.46-.13.13-.26.27-.11.53.15.26.67 1.1 1.43 1.78.98.88 1.81 1.15 2.07 1.28.26.13.41.11.56-.07.15-.17.63-.73.8-.98.17-.25.34-.21.56-.13.22.08 1.42.67 1.66.79.24.13.4.19.46.29.06.11.06.62-.16 1.23z"/>
    </svg>`;
  document.body.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', ensureWhatsAppFloatButton);
