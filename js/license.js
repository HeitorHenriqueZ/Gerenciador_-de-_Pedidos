/**
 * js/license.js
 *
 * O machineId é injetado diretamente pelo main.js via executeJavaScript
 * após o carregamento da página (did-finish-load).
 *
 * Este arquivo só precisa gerenciar o botão de ativação.
 */

'use strict';

// Inicializa placeholder (será substituído pelo main.js logo após o load)
window._machineId = '';

/* ── Ativar licença ── */
function activateLicense() {
  var keyInput = document.getElementById('lic-key-input');
  var errorEl  = document.getElementById('lic-error');
  var btn      = document.getElementById('lic-btn');
  var key      = keyInput ? keyInput.value.trim() : '';

  if (!key) {
    if (errorEl) errorEl.textContent = 'Por favor, insira a chave de ativação.';
    return;
  }

  if (!window.electronAPI) {
    if (errorEl) { errorEl.style.color = '#ff6b6b'; errorEl.textContent = 'Erro: electronAPI indisponível.'; }
    return;
  }

  if (btn)     { btn.disabled = true; btn.textContent = 'Verificando…'; }
  if (errorEl)   errorEl.textContent = '';

  window.electronAPI.activateLicense(key)
    .then(function(result) {
      if (result.success) {
        if (errorEl) { errorEl.style.color = '#69f0ae'; errorEl.textContent = '✅ Ativado! Carregando…'; }
        setTimeout(function() { location.reload(); }, 1200);
      } else {
        if (errorEl) { errorEl.style.color = '#ff6b6b'; errorEl.textContent = result.error || 'Chave inválida.'; }
        if (btn)   { btn.disabled = false; btn.textContent = 'Ativar Software'; }
      }
    })
    .catch(function(err) {
      if (errorEl) { errorEl.style.color = '#ff6b6b'; errorEl.textContent = 'Erro: ' + err.message; }
      if (btn)   { btn.disabled = false; btn.textContent = 'Ativar Software'; }
    });
}

/* ── Copiar código da máquina ── */
function copyMachineId() {
  var id = window._machineId
    || (document.getElementById('lic-machine-id') || {}).textContent
    || '';

  if (!id || id === 'Carregando…') return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(id).then(function() {
      var btn = event.target;
      var orig = btn.textContent;
      btn.textContent = '✅ Copiado!';
      setTimeout(function() { btn.textContent = orig; }, 2000);
    });
  } else {
    var el = document.getElementById('lic-machine-id');
    if (el) {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}
