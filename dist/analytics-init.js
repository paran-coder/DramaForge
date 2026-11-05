// Vercel Web Analytics queue shim for a plain HTML/ESM application.
// A separate file keeps the strict CSP (no 'unsafe-inline').
window.va = window.va || function () {
  (window.vaq = window.vaq || []).push(arguments);
};
