// Papeles: campos editables que se recuerdan en este navegador (data-campo) y QR (data-qr).
(function () {
  const K = 'papeles:';
  document.querySelectorAll('[data-campo]').forEach((el) => {
    let v = null;
    try { v = localStorage.getItem(K + el.dataset.campo); } catch { /* */ }
    if (v != null) el.textContent = v;
    el.addEventListener('input', () => {
      try { localStorage.setItem(K + el.dataset.campo, el.textContent.trim()); } catch { /* */ }
      document.querySelectorAll(`[data-copia="${el.dataset.campo}"]`).forEach((c) => { c.textContent = el.textContent; });
    });
    document.querySelectorAll(`[data-copia="${el.dataset.campo}"]`).forEach((c) => { c.textContent = el.textContent; });
  });
  document.querySelectorAll('[data-qr]').forEach((el) => {
    if (!window.qrcode) return;
    const qr = window.qrcode(0, 'M');
    qr.addData(el.dataset.qr);
    qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  });
  const b = document.getElementById('imprimir');
  if (b) b.addEventListener('click', () => window.print());
})();
