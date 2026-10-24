/*!
 * SABI CENTEC · Protección de la obra
 * © 2025-2026 SABI CENTEC — Alexander Rojas Zamorano, Paula Andrea Rojas Cairasco y Daniela Rojas Cairasco.
 * Todos los derechos reservados. Prohibida su copia, reproducción o republicación sin autorización escrita.
 * Original: https://sabicentec.com
 */
(function () {
  'use strict';
  var AVISO = '© 2025-2026 SABI CENTEC · Alexander Rojas Zamorano, Paula Andrea Rojas Cairasco y Daniela Rojas Cairasco. Todos los derechos reservados.';
  var h = location.hostname;
  var propio = h === "sabicentec.com" || /\.sabicentec\.com$/.test(h) || h === "localhost" || h === "127.0.0.1" || h === "" || h === "alexrojas0601-hue.github.io" || /\.alexrojas0601\.workers\.dev$/.test(h) || /\.pages\.dev$/.test(h);

  // 1) Nadie puede mostrar el portal dentro de otro sitio (marco/iframe ajeno).
  try {
    if (window.top !== window.self) {
      var padre = ''; try { padre = window.top.location.hostname; } catch (e) { padre = ''; }
      if (!(padre === 'sabicentec.com' || /\.sabicentec\.com$/.test(padre))) window.top.location.replace('https://sabicentec.com' + location.pathname);
    }
  } catch (e) {}

  // 2) Copia alojada en otro dominio: aviso visible y enlace al original.
  if (!propio) {
    var poner = function () {
      var d = document.createElement('div');
      d.setAttribute('role', 'alert');
      d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#050A22;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;font:18px/1.5 system-ui,sans-serif';
      d.innerHTML = '<strong style="font-size:26px;color:#F5C518">Copia no autorizada</strong><span>Esta página es propiedad de SABI CENTEC y solo puede usarse en su sitio oficial.</span><a href="https://sabicentec.com" style="color:#F47C20;font-weight:700">Ir a sabicentec.com</a><small style="color:#AEB8E8;max-width:640px">' + AVISO + '</small>';
      document.body.appendChild(d);
    };
    if (document.body) poner(); else document.addEventListener('DOMContentLoaded', poner);
  }

  // 3) Imágenes, logos y avatar: sin menú «Guardar imagen» ni arrastre.
  document.addEventListener('contextmenu', function (e) { if (e.target && e.target.closest && e.target.closest('img,svg,canvas,picture')) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });

  // 4) Atajos de «guardar página» y «ver código» desactivados (disuasivo).
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if ((mod && (k === 's' || k === 'u')) || (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c'))) { e.preventDefault(); }
  });

  // 5) Textos largos copiados (fuera de campos de texto) llevan la fuente y los titulares (teléfonos y datos cortos se copian normal).
  document.addEventListener('copy', function (e) {
    var t = String(window.getSelection ? window.getSelection() : '');
    var ae = document.activeElement, campo = ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName);
    if (campo || t.length < 160 || !e.clipboardData) return; // campos (CSV, respuestas) se copian sin alterar
    e.clipboardData.setData('text/plain', t + '\n\nFuente: https://sabicentec.com · ' + AVISO);
    e.preventDefault();
  });

  // 6) Aviso para quien abra la consola del navegador.
  try { console.log('%cSABI CENTEC · Obra protegida', 'font:700 20px sans-serif;color:#F47C20'); console.log(AVISO + ' Prohibida su copia o reproducción (Ley 23 de 1982, Decisión Andina 351).'); } catch (e) {}
})();
