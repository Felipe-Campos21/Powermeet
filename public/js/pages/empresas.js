// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCNPJ(v) {
  v = v.replace(/\D/g, '').slice(0, 14);
  if (v.length > 12) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (v.length > 8)  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4');
  if (v.length > 5)  return v.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
  if (v.length > 2)  return v.replace(/(\d{2})(\d{3})/, '$1.$2');
  return v;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, "\\'");
}

// ── Lista dinâmica (sócios / encarregados) ────────────────────────────────────

function renderListaDinamica(containerId, items, placeholder, label) {
  const rows = items.map((item, i) => `
    <div class="lista-item" id="${containerId}-item-${i}">
      <input type="text" class="lista-input" value="${esc(item)}" placeholder="${placeholder}" />
      <button class="btn-icon" onclick="listaRemover('${containerId}',${i})" title="Remover">
        <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>`).join('');

  return `
    <div class="form-group" style="margin-bottom:14px">
      <label>${label}</label>
      <div id="${containerId}" class="lista-dinamica">
        ${rows}
        <button class="btn-add-lista" onclick="listaAdicionar('${containerId}','${placeholder}')">
          <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5"><path d="M12 5v14M5 12h14"/></svg>
          ${items.length === 0 ? `Adicionar ${label.replace(/\(s\)/i, '').trim()}` : 'Adicionar outro'}
        </button>
      </div>
    </div>`;
}

function listaAdicionar(containerId, placeholder) {
  const container = document.getElementById(containerId);
  const i = container.querySelectorAll('.lista-item').length;
  const div = document.createElement('div');
  div.className = 'lista-item';
  div.id = `${containerId}-item-${i}`;
  div.innerHTML = `
    <input type="text" class="lista-input" placeholder="${placeholder}" />
    <button class="btn-icon" onclick="listaRemover('${containerId}',${i})" title="Remover">
      <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
    </button>`;
  container.insertBefore(div, container.querySelector('.btn-add-lista'));
  div.querySelector('input').focus();
}

function listaRemover(containerId, idx) {
  const container = document.getElementById(containerId);
  document.getElementById(`${containerId}-item-${idx}`)?.remove();
  container.querySelectorAll('.lista-item').forEach((el, i) => {
    el.id = `${containerId}-item-${i}`;
    const btn = el.querySelector('button');
    if (btn) btn.setAttribute('onclick', `listaRemover('${containerId}',${i})`);
  });
}

function listaGetValores(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.lista-input'))
    .map(inp => inp.value.trim()).filter(Boolean);
}

// ── Bank Picker (F2) ──────────────────────────────────────────────────────────

let _pickerTarget = { codigo: '', nome: '' };

async function abrirBankPicker(codigoId, nomeId) {
  _pickerTarget = { codigo: codigoId, nome: nomeId };
  const bancos = await api.get('/api/bancos');

  const rows = bancos.map(b => `
    <div class="picker-row" data-codigo="${b.codigo}" data-nome="${b.nome.replace(/"/g, '&quot;')}"
      onclick="selecionarBancoPicker(this.dataset.codigo, this.dataset.nome)">
      <span class="picker-codigo">${b.codigo}</span>
      <span>${b.nome}</span>
    </div>`).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-bg" id="modal-bank-picker" onclick="if(event.target===this)this.remove()">
      <div class="modal picker-modal">
        <div class="modal-header">
          <span class="modal-title">Selecionar Banco</span>
          <button class="modal-close" onclick="document.getElementById('modal-bank-picker').remove()">✕</button>
        </div>
        <div style="padding:0 16px 12px">
          <input id="picker-search" type="text" placeholder="Buscar por nome ou código..."
            oninput="filtrarPicker(this.value)"
            onkeydown="if(event.key==='Escape')document.getElementById('modal-bank-picker').remove()" />
        </div>
        <div id="picker-lista">${rows}</div>
        <div class="picker-footer">
          <span style="font-size:11px;color:var(--text-muted)">${bancos.length} bancos cadastrados</span>
          <button class="btn-secondary" style="font-size:12px;padding:5px 12px"
            onclick="document.getElementById('modal-bank-picker').remove();abrirGerenciarBancos()">
            Gerenciar Bancos
          </button>
        </div>
      </div>
    </div>`);

  setTimeout(() => document.getElementById('picker-search')?.focus(), 30);
}

function filtrarPicker(q) {
  const t = q.toLowerCase();
  document.querySelectorAll('#picker-lista .picker-row').forEach(r => {
    r.style.display = (r.dataset.codigo.toLowerCase().includes(t) ||
                       r.dataset.nome.toLowerCase().includes(t)) ? '' : 'none';
  });
}

function selecionarBancoPicker(codigo, nome) {
  const elCod  = document.getElementById(_pickerTarget.codigo);
  const elNome = document.getElementById(_pickerTarget.nome);
  if (elCod)  elCod.value = codigo;
  if (elNome) {
    elNome.value = nome;
    elNome.style.borderColor = 'var(--success)';
    setTimeout(() => elNome.style.borderColor = '', 1500);
  }
  document.getElementById('modal-bank-picker')?.remove();
}

// ── Gerenciar Bancos ──────────────────────────────────────────────────────────

async function abrirGerenciarBancos() {
  const bancos = await api.get('/api/bancos');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-bg" id="modal-gerenciar-bancos" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:500px;max-height:88vh;display:flex;flex-direction:column;padding:0">
        <div class="modal-header" style="padding:16px 20px">
          <span class="modal-title">Gerenciar Bancos</span>
          <button class="modal-close" onclick="document.getElementById('modal-gerenciar-bancos').remove()">✕</button>
        </div>

        <div style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--surface)">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Adicionar banco</div>
          <div style="display:flex;gap:8px">
            <input id="novo-banco-cod"  type="text" placeholder="Código (ex: 13)"  style="width:140px;flex:none" />
            <input id="novo-banco-nome" type="text" placeholder="Nome do banco" style="flex:1"
              onkeydown="if(event.key==='Enter')salvarNovoBanco()" />
            <button class="btn-primary" style="flex:none" onclick="salvarNovoBanco()">Adicionar</button>
          </div>
        </div>

        <div style="overflow-y:auto;flex:1">
          <table style="width:100%">
            <thead><tr>
              <th style="width:56px;text-align:center">Logo</th>
              <th style="width:90px">Código</th>
              <th>Nome</th>
              <th style="width:48px"></th>
            </tr></thead>
            <tbody>
              ${bancos.map(b => `
                <tr>
                  <td style="padding:5px 8px;text-align:center">
                    <label class="banco-logo-cell" title="Clique para ${b.logo_path ? 'trocar' : 'adicionar'} a logo">
                      <img src="http://127.0.0.1:5100/api/bancos/logo/${encodeURIComponent(b.codigo)}"
                        class="banco-logo-mini"
                        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                      <div class="banco-logo-mini-ph">${(b.codigo||'?').slice(0,3)}</div>
                      <input type="file" accept="image/*" style="display:none"
                        onchange="uploadBancoLogoGlobal('${b.codigo}',this)" />
                    </label>
                  </td>
                  <td><span style="font-family:monospace;color:var(--primary)">${b.codigo}</span></td>
                  <td>${b.nome}</td>
                  <td><button class="btn-danger" onclick="excluirBancoCad(${b.id})">✕</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div style="padding:10px 16px;border-top:1px solid var(--border)">
          <button class="btn-secondary" onclick="document.getElementById('modal-gerenciar-bancos').remove()">Fechar</button>
        </div>
      </div>
    </div>`);
}

async function salvarNovoBanco() {
  const codigo = document.getElementById('novo-banco-cod').value.trim();
  const nome   = document.getElementById('novo-banco-nome').value.trim();
  if (!codigo || !nome) return toast('Informe o código e o nome do banco', 'warning');
  await api.post('/api/bancos', { codigo, nome });
  document.getElementById('modal-gerenciar-bancos').remove();
  toast('Banco adicionado!', 'success');
  abrirGerenciarBancos();
}

async function uploadBancoLogoGlobal(codigo, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const data_base64 = e.target.result.split(',')[1];
    const ext = file.name.split('.').pop();
    try {
      await api.post(`/api/bancos/logo/${encodeURIComponent(codigo)}`, { data_base64, ext });
      toast('Logo salva com sucesso', 'success');
      // update img in this row
      const label = input.closest('label');
      const img = label.querySelector('.banco-logo-mini');
      const ph  = label.querySelector('.banco-logo-mini-ph');
      img.src = `http://127.0.0.1:5100/api/bancos/logo/${encodeURIComponent(codigo)}?t=${Date.now()}`;
      img.style.display = '';
      ph.style.display  = 'none';
    } catch {
      toast('Erro ao salvar logo', 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function excluirBancoCad(id) {
  if (!confirm('Excluir este banco?')) return;
  await api.del(`/api/bancos/${id}`);
  document.getElementById('modal-gerenciar-bancos').remove();
  toast('Banco removido', 'success');
  abrirGerenciarBancos();
}

// ── Lookup banco por código (blur / Enter) ────────────────────────────────────

async function lookupBancoRow(codigoId, nomeId) {
  const codigo = document.getElementById(codigoId)?.value?.trim();
  const elNome = document.getElementById(nomeId);
  if (!codigo || !elNome) return;
  const banco = await api.get(`/api/bancos/lookup?codigo=${encodeURIComponent(codigo)}`);
  if (banco) {
    elNome.value = banco.nome;
    elNome.style.borderColor = 'var(--success)';
    setTimeout(() => elNome.style.borderColor = '', 1500);
  } else {
    elNome.style.borderColor = 'var(--danger)';
    setTimeout(() => elNome.style.borderColor = '', 2000);
  }
}

// ── Rows inline no modal da empresa ──────────────────────────────────────────

let _removidosIds = [];
let _rowN = 0;

// Seção principal: bancos da empresa (sem nome de filial)
function adicionarBancoRow(b = null) {
  const n = ++_rowN;
  const row = document.createElement('div');
  row.className = 'banco-row rm-row';
  row.dataset.id   = b?.id || '';
  row.dataset.temp = n;
  row.innerHTML = `
    <input class="ban-codbanco" id="ban-codbanco-${n}" value="${esc(b?.codigo_banco)}" placeholder="Cód"
      title="Código do banco — F2 ou lupa para buscar pelo nome"
      onkeydown="if(event.key==='F2'){event.preventDefault();abrirBankPicker('ban-codbanco-${n}','ban-banco-${n}')}"
      onblur="lookupBancoRow('ban-codbanco-${n}','ban-banco-${n}')" />
    <button class="btn-picker" type="button" title="Buscar banco (F2)"
      onclick="abrirBankPicker('ban-codbanco-${n}','ban-banco-${n}')">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
    </button>
    <input class="ban-banconome" id="ban-banco-${n}" value="${esc(b?.banco)}" placeholder="Nome do banco (preenchido automaticamente)" />
    <input class="ban-cod" id="ban-cod-${n}" value="${esc(b?.codigo_interno)}" placeholder="Cód. Dom." title="Código interno no Domínio" />
    <button class="btn-icon" type="button" title="Remover" onclick="removerLinhaRow(this)">
      <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
    </button>`;
  document.getElementById('modal-bancos-lista').appendChild(row);
}

// Seção secundária: filiais com nome próprio
function adicionarFilialRow(f = null) {
  const n = ++_rowN;
  const row = document.createElement('div');
  row.className = 'filial-row rm-row';
  row.dataset.id   = f?.id || '';
  row.dataset.temp = n;
  row.innerHTML = `
    <input class="fil-r-nome" id="fil-nome-${n}" value="${esc(f?.nome_filial)}" placeholder="Ex: Filial Sinop"
      title="Nome da filial" />
    <input class="fil-r-cod" id="fil-cod-${n}" value="${esc(f?.codigo_interno)}" placeholder="Cód. Dom."
      title="Código interno no Domínio" />
    <div class="fil-r-sep"></div>
    <div class="fil-r-banco-wrap">
      <input class="fil-r-codbanco" id="fil-codbanco-${n}" value="${esc(f?.codigo_banco)}" placeholder="Cód"
        title="Código do banco — F2 ou lupa para buscar pelo nome"
        onkeydown="if(event.key==='F2'){event.preventDefault();abrirBankPicker('fil-codbanco-${n}','fil-banco-${n}')}"
        onblur="lookupBancoRow('fil-codbanco-${n}','fil-banco-${n}')" />
      <button class="btn-picker" type="button" title="Buscar banco (F2)"
        onclick="abrirBankPicker('fil-codbanco-${n}','fil-banco-${n}')">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </button>
      <input class="fil-r-banconome" id="fil-banco-${n}" value="${esc(f?.banco)}" placeholder="Nome do banco (auto)" />
    </div>
    <button class="btn-icon" type="button" title="Remover" onclick="removerLinhaRow(this)">
      <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
    </button>`;
  document.getElementById('modal-filiais-lista').appendChild(row);
}

function removerLinhaRow(btn) {
  const row = btn.closest('.rm-row');
  const id  = row?.dataset.id;
  if (id) {
    if (!confirm('Remover este banco? Os extratos vinculados serão excluídos.')) return;
    _removidosIds.push(parseInt(id));
  }
  row?.remove();
}

function coletarBancosModal() {
  return Array.from(document.querySelectorAll('#modal-bancos-lista .banco-row')).map(row => ({
    id:             row.dataset.id ? parseInt(row.dataset.id) : null,
    nome_filial:    'Matriz',
    codigo_interno: row.querySelector('.ban-cod').value.trim(),
    codigo_banco:   row.querySelector('.ban-codbanco').value.trim(),
    banco:          row.querySelector('.ban-banconome').value.trim(),
  }));
}

function coletarFiliaisModal() {
  return Array.from(document.querySelectorAll('#modal-filiais-lista .filial-row')).map(row => ({
    id:             row.dataset.id ? parseInt(row.dataset.id) : null,
    nome_filial:    row.querySelector('.fil-r-nome').value.trim(),
    codigo_interno: row.querySelector('.fil-r-cod').value.trim(),
    codigo_banco:   row.querySelector('.fil-r-codbanco').value.trim(),
    banco:          row.querySelector('.fil-r-banconome').value.trim(),
  }));
}

function toggleFiliaisSection() {
  const content = document.getElementById('modal-filiais-content');
  const arrow   = document.getElementById('filiais-toggle-arrow');
  if (!content) return;
  const hidden = content.classList.toggle('hidden');
  if (arrow) arrow.textContent = hidden ? '▶' : '▼';
}

// ── Página principal ──────────────────────────────────────────────────────────

const PageEmpresas = {
  async render() {
    const [empresas, filiais] = await Promise.all([
      api.get('/api/empresas'),
      api.get('/api/filiais-bancos'),
    ]);

    const filialPorEmpresa = {};
    filiais.forEach(f => {
      if (!filialPorEmpresa[f.empresa_id]) filialPorEmpresa[f.empresa_id] = [];
      filialPorEmpresa[f.empresa_id].push(f);
    });

    return `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">Empresas / Filiais / Bancos</div>
            <div class="page-subtitle">${empresas.length} empresa(s) cadastrada(s)</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-secondary" onclick="abrirGerenciarBancos()">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              Bancos
            </button>
            <button class="btn-primary" onclick="PageEmpresas.abrirModalEmpresa()">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5"><path d="M12 5v14M5 12h14"/></svg>
              Nova Empresa
            </button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px">
          ${empresas.length === 0 ? `
            <div class="card">
              <div class="empty-state">
                <svg viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <p>Nenhuma empresa cadastrada</p>
                <small>Clique em "Nova Empresa" para começar</small>
              </div>
            </div>
          ` : empresas.map(e => {
            const fs     = filialPorEmpresa[e.id] || [];
            const socios = Array.isArray(e.socios) ? e.socios : [];
            const encs   = Array.isArray(e.encarregados) ? e.encarregados : [];
            return `
              <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${fs.length ? '14px' : '0'}">
                  <div style="flex:1">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                      <span style="font-size:16px;font-weight:700">${e.nome}</span>
                      ${e.codigo_interno ? `<span style="font-size:11px;color:var(--text-muted);background:var(--surface);padding:2px 8px;border-radius:10px;border:1px solid var(--border)">Cód: ${e.codigo_interno}</span>` : ''}
                    </div>
                    <div style="display:flex;gap:20px;margin-top:6px;flex-wrap:wrap">
                      ${e.cnpj        ? `<span style="font-size:12px;color:var(--text-muted)">CNPJ: <strong style="color:var(--text)">${e.cnpj}</strong></span>` : ''}
                      ${socios.length ? `<span style="font-size:12px;color:var(--text-muted)">Sócio(s): <strong style="color:var(--text)">${socios.join(' · ')}</strong></span>` : ''}
                      ${encs.length   ? `<span style="font-size:12px;color:var(--text-muted)">Financeiro: <strong style="color:var(--text)">${encs.join(' · ')}</strong></span>` : ''}
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;flex-shrink:0;margin-left:12px">
                    <button class="btn-icon" title="Editar empresa"
                      onclick="PageEmpresas.abrirModalEmpresa(${JSON.stringify(e).replace(/"/g, '&quot;')})">
                      <svg viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="btn-danger" onclick="PageEmpresas.excluirEmpresa(${e.id})">✕</button>
                  </div>
                </div>

                ${fs.length ? `
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Filial</th>
                          <th style="width:110px">Cód. Filial</th>
                          <th style="width:100px">Cód. Banco</th>
                          <th>Banco</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${fs.map(f => `
                          <tr>
                            <td>${f.nome_filial}</td>
                            <td><span style="font-family:monospace;font-size:12px;color:var(--text-muted)">${f.codigo_interno || '–'}</span></td>
                            <td><span style="font-family:monospace;font-size:12px;color:var(--primary)">${f.codigo_banco || '–'}</span></td>
                            <td>${f.banco}</td>
                          </tr>`).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : `<div style="font-size:12px;color:var(--text-muted);margin-top:${e.cnpj || socios.length || encs.length ? '10px' : '0'}">
                    Nenhum banco cadastrado — clique em ✎ para adicionar
                  </div>`}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  async abrirModalEmpresa(e = null) {
    _removidosIds = [];
    _rowN = 0;
    const socios = e?.socios || [];
    const encs   = e?.encarregados || [];

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-bg" id="modal-empresa" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:740px;max-height:92vh;overflow-y:auto">
          <div class="modal-header">
            <span class="modal-title">${e ? 'Editar' : 'Nova'} Empresa</span>
            <button class="modal-close" onclick="document.getElementById('modal-empresa').remove()">✕</button>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Nome da Empresa *</label>
              <input type="text" id="emp-nome" value="${esc(e?.nome)}" placeholder="Rural Cereais Ltda" />
            </div>
            <div class="form-group" style="max-width:120px">
              <label>Código</label>
              <input type="text" id="emp-codigo" value="${esc(e?.codigo_interno)}" placeholder="001" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom:14px">
            <label>CNPJ</label>
            <input type="text" id="emp-cnpj" value="${esc(e?.cnpj)}"
              placeholder="00.000.000/0001-00" maxlength="18"
              oninput="this.value=formatCNPJ(this.value)" />
          </div>

          ${renderListaDinamica('lista-socios', socios, 'Nome do Sócio', 'Sócio(s)')}
          ${renderListaDinamica('lista-encs', encs, 'Nome / Cargo (ex: Maria — Financeiro)', 'Encarregado(s) / Financeiro')}

          <!-- ── Bancos (seção principal) ── -->
          <div class="bancos-section">
            <div class="filiais-section-header">
              <span class="filiais-section-label">Bancos</span>
              <button class="btn-add-lista" type="button" onclick="adicionarBancoRow()">
                <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5"><path d="M12 5v14M5 12h14"/></svg>
                Adicionar Banco
              </button>
            </div>
            <div class="filiais-legend">
              Digite o código do banco e pressione Tab — o nome é preenchido automaticamente.
              Pressione <kbd>F2</kbd> ou clique em
              <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;display:inline-block;vertical-align:middle"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              para buscar pelo nome do banco.
            </div>
            <div id="modal-bancos-lista"></div>
          </div>

          <!-- ── Filiais (seção secundária, colapsada) ── -->
          <div class="filiais-section" style="margin-top:6px">
            <button class="filiais-toggle" type="button" onclick="toggleFiliaisSection()">
              <span id="filiais-toggle-arrow">▶</span>
              Filiais
              <span style="font-size:11px;color:var(--text-muted);font-weight:400;margin-left:6px">para empresas com múltiplas filiais (ex: Matriz + Filial Sinop)</span>
            </button>
            <div id="modal-filiais-content" class="hidden" style="margin-top:10px">
              <div class="filiais-legend" style="margin-bottom:8px">
                Informe o nome de cada filial e seu banco. Cada filial gera uma aba de conciliação separada.
              </div>
              <div id="modal-filiais-lista" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"></div>
              <button class="btn-add-lista" type="button" onclick="adicionarFilialRow()">
                <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5"><path d="M12 5v14M5 12h14"/></svg>
                Adicionar Filial
              </button>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" onclick="document.getElementById('modal-empresa').remove()">Cancelar</button>
            <button class="btn-primary" onclick="PageEmpresas.salvarEmpresa(${e?.id ?? 'null'})">Salvar</button>
          </div>
        </div>
      </div>`);

    if (e?.id) {
      const filiais = await api.get(`/api/filiais-bancos?empresa_id=${e.id}`);
      let temFiliais = false;
      filiais.forEach(f => {
        if (!f.nome_filial || f.nome_filial === 'Matriz') {
          adicionarBancoRow(f);
        } else {
          adicionarFilialRow(f);
          temFiliais = true;
        }
      });
      if (temFiliais) {
        document.getElementById('modal-filiais-content')?.classList.remove('hidden');
        const arrow = document.getElementById('filiais-toggle-arrow');
        if (arrow) arrow.textContent = '▼';
      }
    }
  },

  async salvarEmpresa(id) {
    const body = {
      nome:           document.getElementById('emp-nome').value.trim(),
      codigo_interno: document.getElementById('emp-codigo').value.trim(),
      cnpj:           document.getElementById('emp-cnpj').value.trim(),
      socios:         listaGetValores('lista-socios'),
      encarregados:   listaGetValores('lista-encs'),
    };
    if (!body.nome) return toast('Nome é obrigatório', 'warning');

    let empresaId = id;
    if (id) {
      await api.put(`/api/empresas/${id}`, body);
    } else {
      const r = await api.post('/api/empresas', body);
      empresaId = r.id;
    }

    const todos = [...coletarBancosModal(), ...coletarFiliaisModal()];
    for (const f of todos) {
      if (!f.codigo_banco) continue;
      const payload = { empresa_id: empresaId, ...f };
      if (f.id) await api.put(`/api/filiais-bancos/${f.id}`, payload);
      else       await api.post('/api/filiais-bancos', payload);
    }
    for (const rid of _removidosIds) {
      await api.del(`/api/filiais-bancos/${rid}`);
    }

    document.getElementById('modal-empresa').remove();
    toast('Empresa salva!', 'success');
    App.navigate('empresas');
  },

  async excluirEmpresa(id) {
    if (!confirm('Excluir esta empresa e todas as suas filiais/extratos?')) return;
    await api.del(`/api/empresas/${id}`);
    toast('Empresa removida', 'success');
    App.navigate('empresas');
  },
};
