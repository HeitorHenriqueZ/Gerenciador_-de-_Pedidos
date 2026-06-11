/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  Sistema de Pedidos — Lógica Principal                        ║
 * ║                                                          ║
 * ║  Organização por categoria:                              ║
 * ║   §1  HELPERS           — funções utilitárias puras      ║
 * ║   §2  DATA / STORAGE    — DB object (localStorage)       ║
 * ║   §3  NAVIGATION        — controle de views              ║
 * ║   §4  MODAL             — abertura/fechamento            ║
 * ║   §5  UI: Dashboard                                      ║
 * ║   §6  UI: Clientes                                       ║
 * ║   §7  UI: Produtos                                       ║
 * ║   §8  UI: Lista de Pedidos                               ║
 * ║   §9  UI: Formulário de Pedido                           ║
 * ║   §10 PRINT: Pedido completo (printOrder)                ║
 * ║   §11 PRINT: Recibo de pagamento (printReceipt)          ║
 * ║   §12 UI: Configurações                                  ║
 * ║   §13 INIT                                               ║
 * ╚══════════════════════════════════════════════════════════╝
 */

'use strict';

/* ══════════════════════════════════════════════════════════
   §1  HELPERS — funções utilitárias puras
══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const fmtCur = v =>
  'R$ ' + (parseFloat(v) || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const fmtDate = d => {
  if (!d) return '—';
  const [y, m, day] = (d + '').split('-');
  return `${day}/${m}/${y}`;
};

const todayStr = () => new Date().toISOString().split('T')[0];

const monthName = m =>
  ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][+m] || '';

const monthShort = m => (monthName(m) || '').slice(0, 3);

async function readFileAsB64(file) {
  return new Promise(resolve => {
    const img     = new Image();
    const canvas  = document.createElement('canvas');
    const objUrl  = URL.createObjectURL(file);

    img.onload = () => {
      const MAX = 900;
      let w = img.width, h = img.height;

      if (w > MAX || h > MAX) {
        if (w > h) { h = (h / w) * MAX; w = MAX; }
        else       { w = (w / h) * MAX; h = MAX; }
      }

      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };

    img.onerror = () => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    };

    img.src = objUrl;
  });
}

function showNotif(msg, type = 'ok') {
  const el = $('notif');
  el.textContent = msg;
  el.className = `notif show ${type}`;
  setTimeout(() => { el.className = 'notif'; }, 3200);
}


/* ══════════════════════════════════════════════════════════
   §2  DATA / STORAGE
══════════════════════════════════════════════════════════ */

const DB = {
  _keys: { cli: 'aa_cli', prod: 'aa_prod', ord: 'aa_ord', cfg: 'aa_cfg' },

  _get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch { return defaultValue; }
  },

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showNotif('⚠️ Armazenamento cheio! Remova imagens antigas.', 'err');
      }
      return false;
    }
  },

  getCfg() {
    return this._get(this._keys.cfg, {
      companyName : 'Sua Empresa', logo: '',
      address     : 'Rua das Flores, 123 — Centro', time: '08:00 às 18:00',
      msg         : 'Assim que o seu pedido estiver pronto, entraremos em contato! 💝',
      sellers     : ['Equipe'],
      camps       : ['Convencional', 'Dia das Mães', 'Páscoa', 'Natal', 'Volta às Aulas', 'Dia dos Namorados', 'Dia dos Pais', 'Aniversário', 'Dia das Crianças'],
    });
  },

  saveCfg(value) { return this._set(this._keys.cfg, value); },

  getClis()       { return this._get(this._keys.cli, []); },
  saveClis(value) { return this._set(this._keys.cli, value); },
  getCli(id)      { return this.getClis().find(c => c.id === id); },

  getProds()       { return this._get(this._keys.prod, []); },
  saveProds(value) { return this._set(this._keys.prod, value); },
  getProd(id)      { return this.getProds().find(p => p.id === id); },

  getOrds()       { return this._get(this._keys.ord, []); },
  saveOrds(value) { return this._set(this._keys.ord, value); },
  getOrd(id)      { return this.getOrds().find(o => o.id === id); },

  nextOrdNum() {
    const ords = this.getOrds();
    if (!ords.length) return '001';
    const max = Math.max(...ords.map(o => parseInt(o.number) || 0));
    return String(max + 1).padStart(3, '0');
  },
};


/* ══════════════════════════════════════════════════════════
   §3  NAVIGATION
══════════════════════════════════════════════════════════ */

let CUR_VIEW = 'dashboard';

const VIEW_TO_NAV = {
  dashboard   : 'dashboard', clients     : 'clients', products    : 'products',
  orders      : 'orders',    'order-form': 'orders',  settings    : 'settings',
};

function nav(view, params = {}) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = $(`view-${view}`);
  if (!el) return;
  el.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-view="${VIEW_TO_NAV[view]}"]`)?.classList.add('active');

  CUR_VIEW = view;
  window.scrollTo(0, 0);

  switch (view) {
    case 'dashboard'  : renderDash(); break;
    case 'clients'    : renderClients(); break;
    case 'products'   : renderProds(); break;
    case 'orders'     : populateCampFilter(); renderOrders(); break;
    case 'order-form' : renderOrderForm(params); break;
    case 'settings'   : renderSettings(); break;
  }
}


/* ══════════════════════════════════════════════════════════
   §4  MODAL
══════════════════════════════════════════════════════════ */

let _modalSaveFn = null;

function openModal(title, bodyHTML, footerHTML = null, saveFn = null) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML    = bodyHTML;
  $('modal-footer').innerHTML  = footerHTML || `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_modalSaveFn && _modalSaveFn()">Salvar</button>`;
  $('modal-ov').classList.add('open');
  _modalSaveFn = saveFn;
}

function closeModal() {
  $('modal-ov').classList.remove('open');
  _modalSaveFn = null;
}

function closeModalOv(e) {
  if (e.target === $('modal-ov')) closeModal();
}


/* ══════════════════════════════════════════════════════════
   §5  UI: DASHBOARD
══════════════════════════════════════════════════════════ */

function renderDash() {
  const cfg  = DB.getCfg();
  const clis = DB.getClis();
  const ords = DB.getOrds();

  $('hdr-name').textContent = cfg.companyName;
  $('hdr-logo').innerHTML   = cfg.logo ? `<img src="${cfg.logo}" class="header-logo">` : '💝';

  const totalRev   = ords.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const today      = todayStr();
  const pending    = ords.filter(o => o.deliveryDate && o.deliveryDate >= today).length;
  const thisMonth  = new Date().getMonth() + 1;
  const bdays      = clis.filter(c => c.birthdate && parseInt(c.birthdate.split('-')[1]) === thisMonth);
  const recent     = [...ords].sort((a, b) => b.createdAt > a.createdAt ? 1 : -1).slice(0, 5);

  let h = '';

  if (bdays.length) {
    h += `<div class="bday-banner">
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:6px">🎂 Aniversariantes de ${monthName(thisMonth)}</div>
      <div style="font-size:.83rem;color:var(--text-med)">
        ${bdays.map(c => `<strong>${c.name}</strong> (dia ${c.birthdate.split('-')[2]})`).join(' &bull; ')}
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:10px"
        onclick="nav('clients'); $('cli-bday').value='${thisMonth}'; renderClients()">Ver aniversariantes</button>
    </div>`;
  }

  h += `<div class="stats-grid">
    <div class="stat-card rose"><div class="stat-ico">📋</div><div><div class="stat-num">${ords.length}</div><div class="stat-lbl">Pedidos</div></div></div>
    <div class="stat-card blue"><div class="stat-ico">👥</div><div><div class="stat-num">${clis.length}</div><div class="stat-lbl">Clientes</div></div></div>
    <div class="stat-card yellow"><div class="stat-ico">🚚</div><div><div class="stat-num">${pending}</div><div class="stat-lbl">Entregas Futuras</div></div></div>
    <div class="stat-card green"><div class="stat-ico">💰</div><div><div class="stat-num" style="font-size:1.2rem">${fmtCur(totalRev)}</div><div class="stat-lbl">Total em Pedidos</div></div></div>
  </div>`;

  h += `<div class="card" style="margin-bottom:18px"><div class="card-title">📋 Pedidos Recentes</div>`;

  if (!recent.length) {
    h += `<div class="empty">
      <div class="ei">📝</div><h3>Nenhum pedido ainda</h3><p>Crie seu primeiro pedido</p>
      <button class="btn btn-primary" style="margin-top:14px" onclick="nav('order-form', { isNew: true })">+ Novo Pedido</button>
    </div>`;
  } else {
    recent.forEach(o => { h += buildOrdCardHTML(o); });
    h += `<button class="btn btn-outline" style="width:100%;margin-top:6px" onclick="nav('orders')">Ver todos os pedidos →</button>`;
  }

  h += `</div>
  <div class="card">
    <div class="card-title">⚡ Ações Rápidas</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      <button class="btn btn-primary"   onclick="nav('order-form', { isNew: true })">+ Novo Pedido</button>
      <button class="btn btn-outline"   onclick="openClientModal()">+ Novo Cliente</button>
      <button class="btn btn-secondary" onclick="openProductModal()">+ Novo Produto</button>
    </div>
  </div>`;

  $('dash-content').innerHTML = h;
}

function buildOrdCardHTML(o) {
  const cli       = DB.getCli(o.clientId);
  const paid      = o.payments?.reduce((s, p) => s + (parseFloat(p.value) || 0), 0) || 0;
  const remaining = Math.max(0, (parseFloat(o.total) || 0) - paid);

  return `<div class="ord-card">
    <div>
      <div class="ord-num">#${o.number}</div>
      <div class="ord-client">${cli?.name || 'Cliente não encontrado'}</div>
      <div class="ord-meta">
        ${o.deliveryDate ? `📅 Entrega: ${fmtDate(o.deliveryDate)} &nbsp;` : ''}
        ${o.campaign ? `<span class="badge badge-rose">${o.campaign}</span>` : ''}
        ${remaining > 0
          ? `<span class="badge badge-yellow" style="margin-left:4px">Restante: ${fmtCur(remaining)}</span>`
          : `<span class="badge badge-green"  style="margin-left:4px">✓ Pago</span>`}
      </div>
    </div>
    <div>
      <div class="ord-total">${fmtCur(o.total)}</div>
      <div class="ord-actions">
        <button class="btn btn-ghost btn-sm btn-icon" title="Editar pedido" onclick="nav('order-form', { id: '${o.id}' })">✏️</button>
        <button class="btn btn-success btn-sm btn-icon" title="Imprimir pedido completo" onclick="printOrder('${o.id}')">🖨️</button>
        <button class="btn btn-receipt btn-sm btn-icon" title="Gerar recibo de pagamento" onclick="printReceipt('${o.id}')">🎫</button>
        <button class="btn btn-danger btn-sm btn-icon" title="Excluir pedido" onclick="deleteOrder('${o.id}')">🗑️</button>
      </div>
    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════
   §6  UI: CLIENTES
══════════════════════════════════════════════════════════ */

function renderClients() {
  const search = ($('cli-search')?.value || '').toLowerCase();
  const bdayF  = $('cli-bday')?.value || '';

  let clis = DB.getClis();

  if (search) {
    const searchNum = search.replace(/\D/g, ''); 
    clis = clis.filter(c =>
      (c.name  || '').toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search) ||
      (c.phone || '').includes(search) ||
      (c.cpf   || '').toLowerCase().includes(search) ||
      (searchNum && (c.cpf || '').replace(/\D/g, '').includes(searchNum))
    );
  }

  if (bdayF) {
    clis = clis.filter(c => c.birthdate && parseInt(c.birthdate.split('-')[1]) === parseInt(bdayF));
  }

  clis.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const el = $('cli-list');
  if (!el) return;

  if (!clis.length) {
    el.innerHTML = `<div class="empty">
      <div class="ei">👥</div>
      <h3>${search || bdayF ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}</h3>
      <p>${search || bdayF ? 'Tente ajustar a busca' : ''}</p>
      ${!search && !bdayF ? `<button class="btn btn-primary" style="margin-top:14px" onclick="openClientModal()">+ Novo Cliente</button>` : ''}
    </div>`;
    return;
  }

  const thisMonth = new Date().getMonth() + 1;

  let h = `<div class="tbl-wrap"><table><thead><tr>
    <th>Nome</th><th>CPF</th><th>Telefone</th><th>E-mail</th><th>Aniversário</th><th>Ações</th>
  </tr></thead><tbody>`;

  clis.forEach(c => {
    const parts = c.birthdate ? c.birthdate.split('-') : null;
    const bday  = parts ? `${parts[2]}/${monthShort(parseInt(parts[1]))}` : '-';
    const isTm  = parts && parseInt(parts[1]) === thisMonth;

    h += `<tr>
      <td><div style="font-weight:700">${c.name}</div>${c.address ? `<div style="font-size:.73rem;color:var(--text-light)">${c.address}</div>` : ''}</td>
      <td>${c.cpf || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td>${c.email || '-'}</td>
      <td>${isTm ? `<span class="badge badge-rose">🎂 ${bday}</span>` : bday}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn btn-ghost btn-sm" onclick="openClientModal('${c.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCli('${c.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  });

  h += `</tbody></table></div>`;
  el.innerHTML = h;
}

function openClientModal(id) {
  const c = id ? DB.getCli(id) : null;

  openModal(
    id ? '✏️ Editar Cliente' : '+ Novo Cliente',
    `<div class="form-grid">
      <div class="form-group full"><label>👤 Nome Completo *</label><input type="text" id="cf-name" value="${c?.name || ''}" placeholder="Nome completo"></div>
      <div class="form-group"><label>📄 CPF *</label><input type="text" id="cf-cpf" value="${c?.cpf || ''}" placeholder="000.000.000-00"></div>
      <div class="form-group"><label>📱 Telefone</label><input type="tel" id="cf-phone" value="${c?.phone || ''}" placeholder="(00) 00000-0000"></div>
      <div class="form-group"><label>📧 E-mail</label><input type="email" id="cf-email" value="${c?.email || ''}" placeholder="email@exemplo.com"></div>
      <div class="form-group full"><label>📍 Endereço</label><input type="text" id="cf-addr" value="${c?.address || ''}" placeholder="Rua, número, bairro, cidade"></div>
      <div class="form-group"><label>🎂 Data de Nascimento</label><input type="date" id="cf-bday" value="${c?.birthdate || ''}"></div>
      <div class="form-group full">
        <label>🔒 Observações Internas <small style="font-weight:400;color:var(--text-light)">(não aparece no PDF)</small></label>
        <textarea id="cf-notes" placeholder="Anotações particulares...">${c?.notes || ''}</textarea>
      </div>
    </div>`,
    null,
    () => saveCli(id)
  );
}

function saveCli(id) {
  const name = ($('cf-name').value || '').trim();
  if (!name) { showNotif('Informe o nome do cliente!', 'err'); return; }
  const cpf = ($('cf-cpf')?.value || '').trim();
  if (!cpf) { showNotif('Informe o CPF do cliente!', 'err'); return; }

  const now  = new Date().toISOString();
  const clis = DB.getClis();

  const data = {
    id        : id || uid(),
    name,
    cpf       : ($('cf-cpf')?.value || '').trim(),
    phone     : ($('cf-phone').value || '').trim(),
    email     : ($('cf-email').value || '').trim(),
    address   : ($('cf-addr').value  || '').trim(),
    birthdate : $('cf-bday').value   || '',
    notes     : ($('cf-notes').value || '').trim(),
    updatedAt : now,
  };

  if (id) {
    const i = clis.findIndex(c => c.id === id);
    if (i >= 0) { data.createdAt = clis[i].createdAt; clis[i] = data; }
  } else {
    data.createdAt = now;
    clis.push(data);
  }

  if (DB.saveClis(clis)) {
    closeModal();
    showNotif(id ? '✅ Cliente atualizado!' : '✅ Cliente cadastrado!');
    renderClients();
  }
}

function deleteCli(id) {
  if (!confirm('Excluir este cliente?')) return;
  DB.saveClis(DB.getClis().filter(c => c.id !== id));
  showNotif('🗑️ Cliente removido.');
  renderClients();
}


/* ══════════════════════════════════════════════════════════
   §7  UI: PRODUTOS
══════════════════════════════════════════════════════════ */

function renderProds() {
  const prods = DB.getProds();
  const el    = $('prod-list');
  if (!el) return;

  if (!prods.length) {
    el.innerHTML = `<div class="empty">
      <div class="ei">📦</div><h3>Nenhum produto cadastrado</h3>
      <button class="btn btn-primary" style="margin-top:14px" onclick="openProductModal()">+ Novo Produto</button>
    </div>`;
    return;
  }

  let h = `<div class="tbl-wrap"><table><thead><tr><th>Produto</th><th>Unidade</th><th>Valor Unitário</th><th>Ações</th></tr></thead><tbody>`;

  prods.forEach(p => {
    h += `<tr>
      <td style="font-weight:700">${p.name}</td><td>${p.unit || 'un'}</td><td style="font-weight:700;color:#AD1457">${fmtCur(p.price)}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn btn-ghost btn-sm" onclick="openProductModal('${p.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProd('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  });

  h += `</tbody></table></div>`;
  el.innerHTML = h;
}

function openProductModal(id) {
  const p = id ? DB.getProd(id) : null;
  openModal(
    id ? '✏️ Editar Produto' : '+ Novo Produto',
    `<div class="form-grid">
      <div class="form-group full"><label>📦 Nome do Produto *</label><input type="text" id="pf-name" value="${p?.name || ''}" placeholder="Nome do produto"></div>
      <div class="form-group"><label>📐 Unidade</label><input type="text" id="pf-unit" value="${p?.unit || 'un'}" placeholder="un, kit, pç..."></div>
      <div class="form-group"><label>💰 Valor Unitário (R$) *</label><input type="number" id="pf-price" value="${p?.price || ''}" min="0" step="0.01" placeholder="0,00"></div>
    </div>`, null, () => saveProd(id)
  );
}

function saveProd(id) {
  const name  = ($('pf-name').value || '').trim();
  const price = parseFloat($('pf-price').value) || 0;
  if (!name) { showNotif('Informe o nome do produto!', 'err'); return; }

  const prods = DB.getProds();
  const data  = { id: id || uid(), name, unit: ($('pf-unit').value || 'un').trim(), price };

  if (id) {
    const i = prods.findIndex(p => p.id === id);
    if (i >= 0) prods[i] = data;
  } else { prods.push(data); }

  if (DB.saveProds(prods)) {
    closeModal();
    showNotif(id ? '✅ Produto atualizado!' : '✅ Produto cadastrado!');
    renderProds();
  }
}

function deleteProd(id) {
  if (!confirm('Excluir este produto?')) return;
  DB.saveProds(DB.getProds().filter(p => p.id !== id));
  showNotif('🗑️ Produto removido.');
  renderProds();
}


/* ══════════════════════════════════════════════════════════
   §8  UI: LISTA DE PEDIDOS
══════════════════════════════════════════════════════════ */

function populateCampFilter() {
  const cfg = DB.getCfg();
  const sel = $('ord-camp');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">🎯 Campanha</option>';
  (cfg.camps || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    if (c === cur) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderOrders() {
  const search  = ($('ord-search')?.value || '').toLowerCase();
  const campF   = $('ord-camp')?.value    || '';
  const monthF  = $('ord-month')?.value   || '';

  let ords = [...DB.getOrds()].sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);

  if (search) {
    const clis = DB.getClis();
    ords = ords.filter(o => {
      const cli = clis.find(c => c.id === o.clientId);
      return (o.number || '').includes(search) || (cli?.name || '').toLowerCase().includes(search) || (cli?.phone || '').includes(search);
    });
  }

  if (campF)  ords = ords.filter(o => o.campaign === campF);
  if (monthF) ords = ords.filter(o => o.deliveryDate && parseInt(o.deliveryDate.split('-')[1]) === parseInt(monthF));

  const el = $('ord-list');
  if (!el) return;

  if (!ords.length) {
    el.innerHTML = `<div class="empty">
      <div class="ei">📋</div><h3>${search || campF || monthF ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}</h3>
      ${!search && !campF && !monthF ? `<button class="btn btn-primary" style="margin-top:14px" onclick="nav('order-form', { isNew: true })">+ Novo Pedido</button>` : ''}
    </div>`;
    return;
  }

  el.innerHTML = ords.map(o => buildOrdCardHTML(o)).join('');
}


/* ══════════════════════════════════════════════════════════
   §9  UI: FORMULÁRIO DE PEDIDO & BUSCA DROPDOWN CUSTOM
══════════════════════════════════════════════════════════ */

let OF = { order: null, items: [], payments: [], arts: [] };

function renderOrderForm(params = {}) {
  const cfg = DB.getCfg();

  if (params.isNew) {
    OF = {
      order: {
        id: uid(), number: DB.nextOrdNum(), clientId: '', sellerId: cfg.sellers[0] || '', campaign: '',
        createdAt: todayStr(), deliveryDate: '', notes: '', importantNotes: '', total: 0,
      },
      items    : [{ id: uid(), productId: '', name: '', unit: 'un', qty: 1, price: 0, total: 0 }],
      payments : [], arts : [],
    };
  } else if (params.id) {
    const ord = DB.getOrd(params.id);
    if (!ord) { nav('orders'); return; }
    OF = {
      order    : { ...ord },
      items    : (ord.items    || [{ id: uid(), productId: '', name: '', unit: 'un', qty: 1, price: 0, total: 0 }]).map(i => ({ ...i })),
      payments : (ord.payments || []).map(p => ({ ...p })),
      arts     : (ord.arts     || []).map(a => ({ ...a })),
    };
  } else { nav('orders'); return; }

  buildOrderFormHTML();
}

function buildOrderFormHTML() {
  const cfg   = DB.getCfg();
  const clis  = DB.getClis().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const o     = OF.order;
  const isNew = !DB.getOrd(o.id);

  const selClient = clis.find(c => c.id === o.clientId);

  const h = `
  <div class="pg-head">
    <div class="pg-title">
      ${isNew ? 'Novo Pedido' : `Pedido #${o.number}`}
      <small>${isNew ? 'Preencha os dados do pedido' : 'Editando pedido'}</small>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost" onclick="nav('orders')">← Voltar</button>
      <button class="btn btn-primary" onclick="saveOrder()">💾 Salvar Pedido</button>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="card-title">📋 Dados do Pedido</div>
    <div class="form-grid">

      <div class="form-group">
        <label>🔢 Nº do Pedido</label>
        <input type="text" value="#${o.number}" disabled style="background:var(--rose-pale);font-weight:700;color:var(--rose)">
      </div>

      <div class="form-group">
        <label>📅 Data de Criação</label>
        <input type="date" id="of-created" value="${o.createdAt || todayStr()}">
      </div>

      <div class="form-group" style="position: relative;">
        <label>👤 Cliente *</label>
        <div class="search-wrap" style="width: 100%; min-width: unset;">
          <input type="text" id="of-client-search" placeholder="Buscar nome, CPF, telefone..." 
            value="${selClient ? selClient.name : ''}" 
            oninput="handleClientSearchInput()" 
            onfocus="searchClientDropdown()" 
            autocomplete="off"
            style="border-radius: var(--r-sm); box-shadow: none; width: 100%;">
        </div>
        
        <div id="of-client-dropdown" style="display:none; position:absolute; top:75px; left:0; right:0; background:#fff; border:1px solid var(--border-light); border-radius:var(--r-sm); box-shadow:var(--shadow-md); z-index:999; max-height:220px; overflow-y:auto;">
        </div>
        <input type="hidden" id="of-client" value="${o.clientId || ''}">
      </div>

      <div class="form-group">
        <label>👩‍💼 Vendedor(a)</label>
        <select id="of-seller">
          ${(cfg.sellers || []).map(s => `<option ${o.sellerId === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>🎯 Campanha</label>
        <select id="of-camp">
          <option value="">— Sem campanha —</option>
          ${(cfg.camps || []).map(c => `<option ${o.campaign === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>🚚 Data de Entrega</label>
        <input type="date" id="of-delivery" value="${o.deliveryDate || ''}">
      </div>

    </div>
    <div id="of-client-info" style="margin-top:12px"></div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="card-title">📝 Observações</div>
    <div class="form-grid">
      <div class="form-group full"><label>💬 Observação do Pedido</label><textarea id="of-notes" placeholder="Observações gerais sobre o pedido...">${o.notes || ''}</textarea></div>
      <div class="form-group full">
        <label class="important-label">⚠️ OBSERVAÇÃO IMPORTANTE — aparece em destaque no pedido</label>
        <textarea id="of-impt" class="important-field" placeholder="Ex: Arte pendente de aprovação, cor específica...">${o.importantNotes || ''}</textarea>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="card-title">🛒 Itens do Pedido</div>
    <div id="of-items-wrap"></div>
    <button class="btn btn-outline btn-sm" onclick="addItem()">+ Adicionar Item</button>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="card-title">💰 Resumo Financeiro</div>
    <div id="of-fin-wrap"></div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div class="card-title">💳 Pagamentos</div>
    <div id="of-pays-wrap"></div>
    <button class="btn btn-secondary btn-sm" onclick="addPayment()">+ Adicionar Pagamento</button>
  </div>

  <div class="card" style="margin-bottom:24px">
    <div class="card-title">🎨 Artes do Cliente</div>
    <div id="of-arts-wrap"></div>
    <button class="btn btn-ghost btn-sm" onclick="addArt()">+ Adicionar Arte</button>
  </div>

  <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:30px">
    <button class="btn btn-ghost" onclick="nav('orders')">← Cancelar</button>
    <button class="btn btn-primary" onclick="saveOrder()">💾 Salvar Pedido</button>
  </div>`;

  $('of-content').innerHTML = h;

  renderItems();
  renderFin();
  renderPayments();
  renderArts();

  if (o.clientId) showClientInfo(o.clientId);
}

/* ── Helpers do dropdown de cliente ── */

function handleClientSearchInput() {
  $('of-client').value = '';
  OF.order.clientId = '';
  const el = $('of-client-info');
  if (el) el.innerHTML = '';
  searchClientDropdown();
}

function searchClientDropdown() {
  const inputVal = ($('of-client-search').value || '').toLowerCase();
  const drop = $('of-client-dropdown');
  if (!drop) return;
  
  const clis = DB.getClis().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  let filtered = clis;
  
  if (inputVal) {
    const searchNum = inputVal.replace(/\D/g, '');
    filtered = clis.filter(c => 
      (c.name || '').toLowerCase().includes(inputVal) || 
      (c.cpf || '').includes(inputVal) || 
      (searchNum && (c.cpf || '').replace(/\D/g, '').includes(searchNum)) ||
      (c.phone || '').includes(inputVal)
    );
  }

  if (!filtered.length) {
    drop.innerHTML = '<div style="padding:12px 14px; color:var(--text-light); font-size:0.85rem; text-align:center;">Nenhum cliente encontrado</div>';
  } else {
    const itemStyle = "padding:10px 14px; border-bottom:1px solid var(--border-light); cursor:pointer; display:flex; flex-direction:column; gap:3px; transition: background 0.2s;";
    
    drop.innerHTML = filtered.map(c => `
      <div style="${itemStyle}" 
           onmouseover="this.style.background='var(--rose-pale)'" 
           onmouseout="this.style.background='transparent'"
           onclick="selectClientDropdown('${c.id}', '${(c.name || '').replace(/'/g, "\\'")}')">
        <span style="font-weight:700; color:var(--text); font-size:0.9rem;">${c.name}</span>
        <span style="font-size:0.75rem; color:var(--text-light)">
          ${c.cpf ? '📄 ' + c.cpf : 'Sem CPF'} ${c.phone ? '&nbsp;&bull;&nbsp; 📱 ' + c.phone : ''}
        </span>
      </div>
    `).join('');
  }
  drop.style.display = 'block';
}

function selectClientDropdown(id, name) {
  $('of-client').value = id;
  $('of-client-search').value = name;
  $('of-client-dropdown').style.display = 'none';
  OF.order.clientId = id;
  showClientInfo(id);
}

// Fechar menu ao clicar fora
document.addEventListener('click', e => {
  const drop = document.getElementById('of-client-dropdown');
  if (drop && drop.style.display === 'block') {
    if (e.target.id !== 'of-client-search' && !drop.contains(e.target)) {
      drop.style.display = 'none';
    }
  }
});

function showClientInfo(id) {
  const el = $('of-client-info');
  if (!el) return;
  if (!id) { el.innerHTML = ''; return; }

  const c = DB.getCli(id);
  if (!c) { el.innerHTML = ''; return; }

  el.innerHTML = `<div style="background:var(--blue-pale);border:1px solid var(--blue-light); border-radius:var(--r-sm);padding:10px 14px;font-size:.82rem">
    <strong>${c.name}</strong>
    ${c.cpf     ? ` &bull; 📄 ${c.cpf}` : ''}
    ${c.phone   ? ` &bull; 📱 ${c.phone}` : ''}
    ${c.email   ? ` &bull; ✉️ ${c.email}` : ''}
    ${c.address ? `<br>📍 ${c.address}`    : ''}
    ${c.birthdate ? ` &bull; 🎂 ${fmtDate(c.birthdate)}` : ''}
  </div>`;
}

/* ── Itens do pedido ── */

function renderItems() {
  const prods = DB.getProds();
  let h = '';

  if (!OF.items.length) {
    h = `<div style="text-align:center;color:var(--text-light);padding:16px;font-size:.84rem">Nenhum item adicionado.</div>`;
  } else {
    h = `<div class="items-tbl-wrap" style="margin-bottom:10px">
      <table class="items-tbl"><thead><tr>
        <th style="min-width:180px">Produto</th><th style="min-width:80px">Unid.</th><th style="min-width:70px">Qtd.</th><th style="min-width:100px">V. Unit.</th><th style="min-width:100px">Total</th><th></th>
      </tr></thead><tbody>`;

    OF.items.forEach((it, i) => {
      h += `<tr>
        <td>
          <select onchange="onItemProdChange(${i}, this.value)" style="min-width:170px">
            <option value="">— Produto —</option>
            ${prods.map(p => `<option value="${p.id}" ${it.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            <option value="__custom__" ${!it.productId && it.name ? 'selected' : ''}>Outro (digitar)</option>
          </select>
          ${!it.productId && it.name !== undefined ? `<input type="text" style="margin-top:4px" id="item-name-${i}" value="${it.name || ''}" placeholder="Nome do produto" oninput="itemFieldChange(${i}, 'name', this.value)">` : ''}
        </td>
        <td><input type="text" value="${it.unit || 'un'}" style="width:60px" oninput="itemFieldChange(${i}, 'unit', this.value)"></td>
        <td><input type="number" value="${it.qty || 1}" min="1" style="width:65px" oninput="itemFieldChange(${i}, 'qty', this.value); recalcItem(${i})"></td>
        <td><input type="number" value="${it.price || 0}" min="0" step="0.01" style="width:90px" oninput="itemFieldChange(${i}, 'price', this.value); recalcItem(${i})"></td>
        <td style="font-weight:700;color:#AD1457">${fmtCur(it.total || 0)}</td>
        <td><button class="btn btn-danger btn-sm btn-icon" onclick="removeItem(${i})">✕</button></td>
      </tr>`;
    });

    h += `</tbody></table></div>`;
  }
  const wrap = $('of-items-wrap');
  if (wrap) wrap.innerHTML = h;
}

function onItemProdChange(i, prodId) {
  if (prodId === '__custom__') {
    OF.items[i].productId = ''; OF.items[i].name = '';
  } else if (prodId) {
    const p = DB.getProd(prodId);
    if (p) {
      OF.items[i].productId = p.id; OF.items[i].name = p.name; OF.items[i].unit = p.unit || 'un'; OF.items[i].price = p.price || 0;
    }
  } else { OF.items[i].productId = ''; }
  recalcItem(i); renderItems(); renderFin();
}

function itemFieldChange(i, field, val) { OF.items[i][field] = (field === 'qty' || field === 'price') ? (parseFloat(val) || 0) : val; }

function recalcItem(i) {
  const it = OF.items[i];
  it.qty = parseFloat(it.qty) || 1; it.price = parseFloat(it.price) || 0; it.total = it.qty * it.price;
  renderFin();
  const rows = document.querySelectorAll('.items-tbl tbody tr');
  if (rows[i]) {
    const totalCell = rows[i].querySelectorAll('td')[4];
    if (totalCell) totalCell.textContent = fmtCur(it.total);
  }
}

function addItem() { OF.items.push({ id: uid(), productId: '', name: '', unit: 'un', qty: 1, price: 0, total: 0 }); renderItems(); renderFin(); }
function removeItem(i) { OF.items.splice(i, 1); renderItems(); renderFin(); }

/* ── Resumo financeiro ── */

function renderFin() {
  const subtotal = OF.items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0);
  const disc     = parseFloat($('of-disc')?.value) || 0;
  const ship     = parseFloat($('of-ship')?.value) || 0;
  const total    = Math.max(0, subtotal - disc + ship);

  OF.order.total = total;
  const paid      = OF.payments.reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
  const remaining = Math.max(0, total - paid);

  const wrap = $('of-fin-wrap');
  if (!wrap) return;

  wrap.innerHTML = `<div class="fin-box">
    <div class="fin-row"><span>Subtotal dos itens</span><span style="font-weight:700">${fmtCur(subtotal)}</span></div>
    <div class="fin-row"><span>Desconto (R$)</span><input type="number" id="of-disc" class="fin-input" min="0" step="0.01" value="${disc || 0}" oninput="renderFin()" style="width:100px;text-align:right"></div>
    <div class="fin-row"><span>Frete (R$)</span><input type="number" id="of-ship" class="fin-input" min="0" step="0.01" value="${ship || 0}" oninput="renderFin()" style="width:100px;text-align:right"></div>
    <div class="fin-row total"><span class="fl">TOTAL DO PEDIDO</span><span class="fv">${fmtCur(total)}</span></div>
    <div class="fin-row" style="margin-top:8px;font-size:.82rem;color:var(--text-light)">
      <span>Pago: ${fmtCur(paid)}</span>
      <span ${remaining > 0 ? 'style="color:#AD1457;font-weight:700"' : 'style="color:#2E7D32;font-weight:700"'}>
        ${remaining > 0 ? `Restante: ${fmtCur(remaining)}` : '✓ Totalmente pago'}
      </span>
    </div>
  </div>`;
}

/* ── Pagamentos ── */

function renderPayments() {
  const wrap = $('of-pays-wrap');
  if (!wrap) return;

  if (!OF.payments.length) {
    wrap.innerHTML = `<div style="text-align:center;color:var(--text-light);padding:12px;font-size:.84rem">Nenhum pagamento registrado.</div>`;
    return;
  }

  let h = '';
  OF.payments.forEach((p, i) => {
    h += `<div class="pay-card">
      <button class="btn btn-danger btn-sm btn-icon" style="position:absolute;top:10px;right:10px" onclick="removePayment(${i})">✕</button>
      <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">Pagamento ${i + 1}</div>
      <div class="pay-grid">
        <div class="form-group"><label>Forma</label>
          <select onchange="onPayTypeChange(${i}, this.value)">
            <option value="pix" ${p.type === 'pix' ? 'selected' : ''}>PIX</option><option value="card" ${p.type === 'card' ? 'selected' : ''}>Cartão</option>
            <option value="cash" ${p.type === 'cash' ? 'selected' : ''}>Dinheiro</option><option value="transfer" ${p.type === 'transfer' ? 'selected' : ''}>Transferência</option>
          </select>
        </div>
        <div class="form-group"><label>Valor (R$)</label><input type="number" value="${p.value || ''}" min="0" step="0.01" placeholder="0,00" oninput="payFieldChange(${i}, 'value', this.value); renderFin()"></div>
        <div class="form-group"><label>Data</label><input type="date" value="${p.date || ''}" oninput="payFieldChange(${i}, 'date', this.value)"></div>
        <div class="form-group"><label>Nome do Pagador</label><input type="text" value="${p.payer || ''}" placeholder="Nome" oninput="payFieldChange(${i}, 'payer', this.value)"></div>
      </div>
      ${p.type === 'card' ? `
      <div class="pay-grid" style="margin-top:8px">
        <div class="form-group"><label>Bandeira</label>
          <select onchange="payFieldChange(${i}, 'brand', this.value)">
            <option value="">Selecione</option>
            ${['Visa', 'Mastercard', 'Elo', 'Hipercard', 'American Express', 'Pix Parcelado'].map(b => `<option ${p.brand === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Últimos 4 dígitos</label><input type="text" maxlength="4" value="${p.lastDigits || ''}" placeholder="0000" oninput="payFieldChange(${i}, 'lastDigits', this.value)"></div>
        <div class="form-group"><label>Parcelas</label>
          <select onchange="payFieldChange(${i}, 'installments', this.value)">
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n => `<option value="${n}" ${parseInt(p.installments) === n ? 'selected' : ''}>${n}x</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Maquininha</label><input type="text" value="${p.machine || ''}" placeholder="Ex: InfinitePay" oninput="payFieldChange(${i}, 'machine', this.value)"></div>
      </div>` : ''}
      <div style="margin-top:10px">
        <label style="margin-bottom:5px">📎 Comprovante</label>
        ${p.proof ? `<div><img src="${p.proof}" class="img-preview" style="max-height:120px"><button class="btn btn-danger btn-sm" style="margin-top:5px" onclick="removePayProof(${i})">Remover imagem</button></div>`
          : `<div class="upload-area" onclick="triggerPayProof(${i})">📷 Clique para enviar comprovante (JPG/PNG)</div>`}
        <input type="file" id="pay-proof-${i}" accept="image/*" onchange="handlePayProof(${i}, this)">
      </div>
    </div>`;
  });
  wrap.innerHTML = h;
}

function addPayment() { OF.payments.push({ id: uid(), type: 'pix', value: '', date: todayStr(), payer: '', proof: '' }); renderPayments(); renderFin(); }
function removePayment(i) { OF.payments.splice(i, 1); renderPayments(); renderFin(); }
function onPayTypeChange(i, val) {
  OF.payments[i].type = val;
  if (val !== 'card') { delete OF.payments[i].brand; delete OF.payments[i].lastDigits; delete OF.payments[i].installments; delete OF.payments[i].machine; }
  renderPayments(); renderFin();
}
function payFieldChange(i, field, val) { OF.payments[i][field] = (field === 'value') ? (parseFloat(val) || 0) : val; }
function triggerPayProof(i) { $(`pay-proof-${i}`)?.click(); }
async function handlePayProof(i, input) {
  if (!input.files[0]) return;
  try { OF.payments[i].proof = await readFileAsB64(input.files[0]); renderPayments(); } catch { showNotif('Erro ao carregar imagem', 'err'); }
}
function removePayProof(i) { OF.payments[i].proof = ''; renderPayments(); }

/* ── Artes do cliente ── */

function renderArts() {
  const wrap = $('of-arts-wrap');
  if (!wrap) return;

  if (!OF.arts.length) {
    wrap.innerHTML = `<div style="text-align:center;color:var(--text-light);padding:12px;font-size:.84rem">Nenhuma arte adicionada.</div>`;
    return;
  }

  let h = '';
  OF.arts.forEach((a, i) => {
    h += `<div class="art-card">
      <button class="btn btn-danger btn-sm btn-icon" style="position:absolute;top:10px;right:10px" onclick="removeArt(${i})">✕</button>
      <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">Arte ${i + 1}</div>
      <div class="form-group" style="margin-bottom:10px"><label>Descrição da Arte</label><input type="text" value="${a.description || ''}" placeholder="Ex: Logo principal, fundo personalizado..." oninput="artFieldChange(${i}, 'description', this.value)"></div>
      ${a.image ? `<div><img src="${a.image}" class="img-preview"><button class="btn btn-danger btn-sm" style="margin-top:5px" onclick="removeArtImg(${i})">Remover imagem</button></div>` : `<div class="upload-area" onclick="triggerArt(${i})">🎨 Clique para enviar arte (JPG/PNG)</div>`}
      <input type="file" id="art-file-${i}" accept="image/*" onchange="handleArt(${i}, this)">
    </div>`;
  });
  wrap.innerHTML = h;
}

function addArt() { OF.arts.push({ id: uid(), description: '', image: '' }); renderArts(); }
function removeArt(i) { OF.arts.splice(i, 1); renderArts(); }
function artFieldChange(i, f, v) { OF.arts[i][f] = v; }
function triggerArt(i) { $(`art-file-${i}`)?.click(); }
async function handleArt(i, input) {
  if (!input.files[0]) return;
  try { OF.arts[i].image = await readFileAsB64(input.files[0]); renderArts(); } catch { showNotif('Erro ao carregar imagem', 'err'); }
}
function removeArtImg(i) { OF.arts[i].image = ''; renderArts(); }

/* ── Salvar pedido ── */

function saveOrder() {
  const clientId = $('of-client')?.value || OF.order.clientId;
  if (!clientId) { showNotif('Selecione o cliente!', 'err'); return; }

  const disc     = parseFloat($('of-disc')?.value) || 0;
  const ship     = parseFloat($('of-ship')?.value) || 0;
  const subtotal = OF.items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0);
  const total    = Math.max(0, subtotal - disc + ship);

  const ord = {
    ...OF.order, clientId,
    sellerId        : $('of-seller')?.value   || '', campaign        : $('of-camp')?.value     || '',
    createdAt       : $('of-created')?.value  || todayStr(), deliveryDate    : $('of-delivery')?.value || '',
    notes           : $('of-notes')?.value    || '', importantNotes  : $('of-impt')?.value     || '',
    items    : OF.items, payments : OF.payments, arts     : OF.arts, discount : disc, shipping : ship, total,
  };

  const ords = DB.getOrds();
  const idx  = ords.findIndex(o => o.id === ord.id);
  if (idx >= 0) ords[idx] = ord; else ords.push(ord);

  if (DB.saveOrds(ords)) { showNotif('✅ Pedido salvo com sucesso!'); nav('orders'); }
}

function deleteOrder(id) {
  if (!confirm('Excluir este pedido? Esta ação não pode ser desfeita.')) return;
  DB.saveOrds(DB.getOrds().filter(o => o.id !== id));
  showNotif('🗑️ Pedido removido.');
  if (CUR_VIEW === 'orders') renderOrders(); else if (CUR_VIEW === 'dashboard') renderDash();
}


/* ══════════════════════════════════════════════════════════
   §10  PRINT: PEDIDO COMPLETO
══════════════════════════════════════════════════════════ */

function printOrder(id) {
  const ord = DB.getOrd(id);
  if (!ord) { showNotif('Pedido não encontrado', 'err'); return; }

  const cfg = DB.getCfg(); const cli = DB.getCli(ord.clientId);
  const paid = ord.payments?.reduce((s, p) => s + (parseFloat(p.value) || 0), 0) || 0;
  const remaining = Math.max(0, (parseFloat(ord.total) || 0) - paid);
  const logoHTML = cfg.logo ? `<img src="${cfg.logo}" class="pr-logo">` : `<div class="pr-logo-ph">💝</div>`;

  let h = `<div class="pr-header">${logoHTML}<div><div class="pr-co-name">${cfg.companyName}</div><div class="pr-co-sub">Produtos Personalizados</div></div><div class="pr-order-num">Pedido #${ord.number}<br><span style="font-size:9pt;font-weight:400">Criado em ${fmtDate(ord.createdAt)}</span></div></div>`;

  h += `<div class="pr-section"><div class="pr-sec-title">Dados do Cliente</div><div class="pr-info-grid">
    <div class="pr-info-item"><span>Nome:</span> ${cli?.name || '-'}</div>
    ${cli?.cpf ? `<div class="pr-info-item"><span>CPF:</span> ${cli.cpf}</div>` : ''}
    <div class="pr-info-item"><span>Telefone:</span> ${cli?.phone || '-'}</div><div class="pr-info-item"><span>E-mail:</span> ${cli?.email || '-'}</div>
    ${cli?.address ? `<div class="pr-info-item" style="grid-column:1/-1"><span>Endereço:</span> ${cli.address}</div>` : ''}
  </div></div>`;

  if (ord.campaign) { h += `<div class="pr-section"><div style="font-size:9.5pt">🎯 <strong>Campanha:</strong> ${ord.campaign}</div></div>`; }
  if (ord.notes) { h += `<div class="pr-section"><div class="pr-sec-title">Observações</div><div style="font-size:9.5pt">${ord.notes}</div></div>`; }
  if (ord.importantNotes) { h += `<div class="pr-section" style="border:2px solid #000;padding:8px 12px;background:#FFFDE7"><div class="pr-sec-title" style="border-bottom-color:#000;color:#E65100">⚠️ OBSERVAÇÃO IMPORTANTE</div><div style="font-size:10pt;font-weight:700">${ord.importantNotes}</div></div>`; }

  h += `<div class="pr-section"><div class="pr-sec-title">Itens do Pedido</div><table class="pr-table"><thead><tr><th>Produto</th><th>Unidade</th><th>Qtd.</th><th>V. Unitário</th><th>Total</th></tr></thead><tbody>`;
  (ord.items || []).forEach(it => { h += `<tr><td>${it.name || it.productId || '-'}</td><td>${it.unit || 'un'}</td><td>${it.qty || 1}</td><td>${fmtCur(it.price || 0)}</td><td style="font-weight:700">${fmtCur(it.total || 0)}</td></tr>`; });
  h += `</tbody></table></div>`;

  const subtotal = (ord.items || []).reduce((s, it) => s + (parseFloat(it.total) || 0), 0);
  h += `<div class="pr-section"><div class="pr-fin"><div class="pr-fin-row"><span>Subtotal dos itens</span><span>${fmtCur(subtotal)}</span></div>
    ${(parseFloat(ord.discount) || 0) > 0 ? `<div class="pr-fin-row"><span>Desconto</span><span>- ${fmtCur(ord.discount)}</span></div>` : ''}
    ${(parseFloat(ord.shipping) || 0) > 0 ? `<div class="pr-fin-row"><span>Frete</span><span>${fmtCur(ord.shipping)}</span></div>` : ''}
    <div class="pr-fin-row pr-total"><span class="pr-fl">TOTAL DO PEDIDO</span><span class="pr-fv">${fmtCur(ord.total)}</span></div>
    ${paid > 0 ? `<div class="pr-fin-row" style="margin-top:6px;font-size:9pt"><span>Pago: ${fmtCur(paid)}</span><span style="font-weight:700">${remaining > 0 ? `Restante: ${fmtCur(remaining)}` : '✓ Totalmente pago'}</span></div>` : ''}
  </div></div>`;

  if (ord.deliveryDate) { h += `<div class="pr-section"><div class="pr-delivery-label">Data de Entrega</div><div class="pr-delivery-box">📅 ${fmtDate(ord.deliveryDate)}</div></div>`; }

  if (ord.payments?.length) {
    h += `<div class="pr-section"><div class="pr-sec-title">Pagamentos</div>`;
    const typeLabel = { pix: 'PIX', card: 'Cartão', cash: 'Dinheiro', transfer: 'Transferência' };
    ord.payments.forEach(p => {
      h += `<div class="pr-pay-row"><strong>${typeLabel[p.type] || p.type}</strong> — ${fmtCur(p.value)} ${p.date ? ` — ${fmtDate(p.date)}` : ''} ${p.payer ? ` — ${p.payer}` : ''} ${p.type === 'card' && p.brand ? ` — ${p.brand}${p.lastDigits ? ` *${p.lastDigits}` : ''}${parseInt(p.installments) > 1 ? ` — ${p.installments}x` : ''}` : ''}</div>`;
    });
    h += `</div>`;
  }

  if (ord.sellerId) { h += `<div class="pr-section" style="font-size:9pt"><strong>Atendente:</strong> ${ord.sellerId}</div>`; }

  const artsWithImg = (ord.arts || []).filter(a => a.image);
  if (artsWithImg.length) {
    h += `<div class="pr-section"><div class="pr-sec-title">Arte do Cliente</div><div class="pr-arts">`;
    artsWithImg.forEach(a => { h += `<div><img src="${a.image}" class="pr-art-img"><div class="pr-art-label">${a.description || ''}</div></div>`; });
    h += `</div></div>`;
  }

  h += `<div class="pr-msg">💝 ${cfg.msg}</div><div class="pr-footer"><strong>${cfg.companyName}</strong><br>${cfg.address ? `📍 ${cfg.address}` : ''}${cfg.time ? ` &nbsp;|&nbsp; ⏰ ${cfg.time}` : ''}</div>`;

  const pv = $('print-view'); pv.className = ''; pv.innerHTML = h; setTimeout(() => window.print(), 200);
}


/* ══════════════════════════════════════════════════════════
   §11  PRINT: RECIBO DE PAGAMENTO
══════════════════════════════════════════════════════════ */

function printReceipt(id) {
  const ord = DB.getOrd(id);
  if (!ord) { showNotif('Pedido não encontrado', 'err'); return; }

  const cfg  = DB.getCfg(); const cli  = DB.getCli(ord.clientId);
  const totalPaid = (ord.payments || []).reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
  const remaining = Math.max(0, (parseFloat(ord.total) || 0) - totalPaid);
  const lastPayDate = (ord.payments || []).map(p => p.date).filter(Boolean).sort().pop() || todayStr();
  const logoHTML = cfg.logo ? `<img src="${cfg.logo}" class="rc-logo">` : `<div class="rc-logo-ph">💝</div>`;
  const itemsSummary = (ord.items || []).filter(it => it.name || it.productId).map(it => `${it.qty || 1}x ${it.name || 'Produto'}`).join(', ') || '—';
  const payMethods = [...new Set((ord.payments || []).map(p => ({ pix: 'PIX', card: 'Cartão', cash: 'Dinheiro', transfer: 'Transferência' }[p.type] || p.type)))].join(', ') || '—';

  const h = `<div class="rc-wrap">
    <div class="rc-header">${logoHTML}<div class="rc-company">${cfg.companyName}</div><div class="rc-subtitle">Produtos Personalizados — Recibo de Pagamento</div></div>
    <div class="rc-title">✦ Recibo de Pagamento ✦</div>
    <div class="rc-row"><span class="rc-label">Nº do Pedido</span><span class="rc-val">#${ord.number}</span></div>
    <div class="rc-row"><span class="rc-label">Data</span><span class="rc-val">${fmtDate(lastPayDate)}</span></div>
    <div class="rc-row"><span class="rc-label">Cliente</span><span class="rc-val">${cli?.name || '—'} ${cli?.cpf ? `(CPF: ${cli.cpf})` : ''}</span></div>
    ${cli?.phone ? `<div class="rc-row"><span class="rc-label">Telefone</span><span class="rc-val">${cli.phone}</span></div>` : ''}
    ${ord.campaign ? `<div class="rc-row"><span class="rc-label">Campanha</span><span class="rc-val">${ord.campaign}</span></div>` : ''}
    <div class="rc-row"><span class="rc-label">Forma de Pgto.</span><span class="rc-val">${payMethods}</span></div>
    <div class="rc-row"><span class="rc-label">Descrição</span><span class="rc-val" style="text-align:right;max-width:200px">${itemsSummary}</span></div>
    ${ord.deliveryDate ? `<div class="rc-row"><span class="rc-label">Entrega prevista</span><span class="rc-val">${fmtDate(ord.deliveryDate)}</span></div>` : ''}

    <div class="rc-total-box"><span class="rc-total-label">Total Pago</span><span class="rc-total-value">${fmtCur(totalPaid)}</span></div>
    ${remaining > 0 ? `<div class="rc-row" style="font-size:9pt;font-weight:700;"><span class="rc-label">Saldo Restante</span><span class="rc-val">${fmtCur(remaining)}</span></div>` : `<div style="text-align:center;font-size:9pt;font-weight:700;padding:4px 0;">✓ Pagamento integral realizado</div>`}

    <div class="rc-sign-area">
      <div class="rc-sign-line">Assinatura do Cliente</div><div class="rc-sign-line">Assinatura / Carimbo ${cfg.companyName}</div>
    </div>
    <div class="rc-footer">${cfg.companyName} ${cfg.address ? `&nbsp;|&nbsp; ${cfg.address}` : ''} ${cfg.time ? `&nbsp;|&nbsp; ${cfg.time}` : ''}<br>Documento gerado em ${fmtDate(todayStr())}</div>
  </div>`;

  const pv = $('print-view'); pv.className = 'receipt-mode'; pv.innerHTML = h; setTimeout(() => window.print(), 200);
}


/* ══════════════════════════════════════════════════════════
   §12  UI: CONFIGURAÇÕES
══════════════════════════════════════════════════════════ */

function renderSettings() {
  const cfg = DB.getCfg();

  const h = `
  <div class="pg-head"><div class="pg-title">Configurações <small>Personalize o sistema</small></div></div>

  <div class="set-sec">
    <h3>🏢 Dados da Empresa</h3>
    <div class="form-grid">
      <div class="form-group full"><label>Nome da Empresa</label><input type="text" id="cfg-name" value="${cfg.companyName || ''}"></div>
      <div class="form-group full"><label>Logo da Empresa</label>
        ${cfg.logo ? `<div style="margin-bottom:8px"><img src="${cfg.logo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--rose-light)"></div>` : ''}
        <div class="upload-area" onclick="$('cfg-logo-file').click()">📷 Clique para enviar logo (JPG/PNG)</div>
        <input type="file" id="cfg-logo-file" accept="image/*" onchange="handleLogoUpload(this)">
        ${cfg.logo ? `<button class="btn btn-danger btn-sm" style="margin-top:6px" onclick="removeLogo()">Remover logo</button>` : ''}
      </div>
    </div>
  </div>

  <div class="set-sec">
    <h3>📄 Rodapé do PDF</h3>
    <div class="form-grid">
      <div class="form-group full"><label>📍 Endereço de Retirada / Entrega</label><input type="text" id="cfg-addr" value="${cfg.address || ''}"></div>
      <div class="form-group full"><label>⏰ Horário de Funcionamento</label><input type="text" id="cfg-time" value="${cfg.time || ''}" placeholder="Ex: Seg a Sex 09:00 às 18:00"></div>
      <div class="form-group full"><label>💬 Mensagem de Conclusão (aparece no PDF)</label><textarea id="cfg-msg">${cfg.msg || ''}</textarea></div>
    </div>
  </div>

  <div class="set-sec">
    <h3>👩‍💼 Vendedor(a)es</h3>
    <div class="tags-wrap" id="sellers-tags">${(cfg.sellers || []).map(s => `<span class="tag tag-rose">${s}<span class="tag-rm" onclick="removeSeller('${s.replace(/'/g, "\\'")}')">×</span></span>`).join('')}</div>
    <div class="add-tag-row"><input type="text" id="new-seller" placeholder="Nome do(a) vendedor(a)" style="max-width:240px"><button class="btn btn-outline btn-sm" onclick="addSeller()">+ Adicionar</button></div>
  </div>

  <div class="set-sec">
    <h3>🎯 Campanhas</h3>
    <div class="tags-wrap" id="camps-tags">${(cfg.camps || []).map(c => `<span class="tag tag-blue">${c}<span class="tag-rm" onclick="removeCamp('${c.replace(/'/g, "\\'")}')">×</span></span>`).join('')}</div>
    <div class="add-tag-row"><input type="text" id="new-camp" placeholder="Nome da campanha" style="max-width:240px"><button class="btn btn-secondary btn-sm" onclick="addCamp()">+ Adicionar</button></div>
  </div>

  <div style="margin-bottom:30px"><button class="btn btn-primary" onclick="saveSettings()">💾 Salvar Configurações</button></div>

  <div class="set-sec" style="border-color:#FFCDD2">
    <h3 style="color:#C62828">⚠️ Dados do Sistema</h3>
    <p style="font-size:.84rem;color:var(--text-light);margin-bottom:12px">Os dados ficam salvos no navegador (localStorage). Faça backup regularmente.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="exportData()">📥 Exportar Dados (JSON)</button>
      <button class="btn btn-ghost btn-sm" onclick="importDataClick()">📤 Importar Dados (JSON)</button>
      <input type="file" id="import-file" accept=".json" onchange="importData(this)">
    </div>
  </div>`;

  $('set-content').innerHTML = h;
}

async function handleLogoUpload(input) {
  if (!input.files[0]) return;
  try { const b64 = await readFileAsB64(input.files[0]); const cfg = DB.getCfg(); cfg.logo = b64; DB.saveCfg(cfg); showNotif('✅ Logo atualizada!'); renderSettings(); renderDash(); } catch { showNotif('Erro ao carregar logo', 'err'); }
}
function removeLogo() { const cfg = DB.getCfg(); cfg.logo = ''; DB.saveCfg(cfg); showNotif('Logo removida.'); renderSettings(); }

function addSeller() { const v = ($('new-seller').value || '').trim(); if (!v) return; const cfg = DB.getCfg(); if (!cfg.sellers.includes(v)) cfg.sellers.push(v); DB.saveCfg(cfg); renderSettings(); }
function removeSeller(s) { const cfg = DB.getCfg(); cfg.sellers = (cfg.sellers || []).filter(x => x !== s); DB.saveCfg(cfg); renderSettings(); }

function addCamp() { const v = ($('new-camp').value || '').trim(); if (!v) return; const cfg = DB.getCfg(); if (!cfg.camps.includes(v)) cfg.camps.push(v); DB.saveCfg(cfg); renderSettings(); }
function removeCamp(c) { const cfg = DB.getCfg(); cfg.camps = (cfg.camps || []).filter(x => x !== c); DB.saveCfg(cfg); renderSettings(); }

function saveSettings() {
  const cfg = DB.getCfg();
  cfg.companyName = ($('cfg-name')?.value || 'Sua Empresa').trim(); cfg.address = ($('cfg-addr')?.value || '').trim(); cfg.time = ($('cfg-time')?.value || '').trim(); cfg.msg = ($('cfg-msg')?.value || '').trim();
  if (DB.saveCfg(cfg)) { showNotif('✅ Configurações salvas!'); $('hdr-name').textContent = cfg.companyName; $('hdr-logo').innerHTML = cfg.logo ? `<img src="${cfg.logo}" class="header-logo">` : '💝'; }
}

function exportData() {
  const data = { clients: DB.getClis(), products: DB.getProds(), orders: DB.getOrds(), settings: DB.getCfg(), exportedAt: new Date().toISOString(), version: '2.0' };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sistema-backup-${todayStr()}.json`; a.click(); showNotif('📥 Exportado com sucesso!');
}

function importDataClick() { $('import-file').click(); }

function importData(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm('Importar dados? Os dados atuais serão substituídos.')) {
        if (data.clients) DB.saveClis(data.clients); if (data.products) DB.saveProds(data.products); if (data.orders) DB.saveOrds(data.orders); if (data.settings) DB.saveCfg(data.settings);
        showNotif('✅ Dados importados com sucesso!'); nav('dashboard');
      }
    } catch { showNotif('Arquivo inválido!', 'err'); }
  };
  reader.readAsText(input.files[0]);
}


/* ══════════════════════════════════════════════════════════
   §13  INIT
══════════════════════════════════════════════════════════ */

nav('dashboard');