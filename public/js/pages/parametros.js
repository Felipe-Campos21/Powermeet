const PageParametros = {
  _filtro: 'todos',
  _lancamentos: [],

  // ── Helpers de lançamentos ────────────────────────────────────────────────────

  _parseLancs(val) {
    if (!val) return [];
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) return arr.map(item => ({
        tipo:  item.tipo  || 'livre',
        texto: item.texto || '',
        d:     item.d     || '',
        c:     item.c     || '',
        h:     item.h     || '',
      }));
    } catch {}
    // Legado: string simples — tenta detectar D x C y H z
    const dcMatch = val.match(/^D\s+(.+?)\s+C\s+(.+?)(?:\s+H\s+(.+))?$/i);
    if (dcMatch) {
      return [{ tipo: 'estruturado', d: dcMatch[1]||'', c: dcMatch[2]||'', h: dcMatch[3]||'', texto: '' }];
    }
    return [{ tipo: 'livre', texto: val, d: '', c: '', h: '' }];
  },

  _formatLancItem(item) {
    if (!item) return '';
    if (item.tipo === 'estruturado') {
      let s = '';
      if (item.d) s += `D ${item.d}`;
      if (item.c) s += ` C ${item.c}`;
      if (item.h) s += ` H ${item.h}`;
      return s.trim();
    }
    return item.texto || '';
  },

  _formatLancsDisplay(val) {
    const items = this._parseLancs(val);
    if (!items.length) return '';
    return items.map(i => this._formatLancItem(i)).filter(Boolean).join(' · ');
  },

  // ── Render principal ──────────────────────────────────────────────────────────

  async render() {
    const [params, agrupamentos, empresas] = await Promise.all([
      api.get('/api/parametros'),
      api.get('/api/agrupamentos'),
      api.get('/api/empresas'),
    ]);

    const agMap  = {};  agrupamentos.forEach(a => { agMap[a.id]  = a; });
    const empMap = {};  empresas.forEach(e => { empMap[e.id] = e; });

    const filtro = this._filtro;
    let lista = params;
    if (filtro === 'global')  lista = params.filter(p => !p.empresa_id);
    if (filtro === 'empresa') lista = params.filter(p =>  p.empresa_id);

    return `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">Parâmetros de Identificação</div>
            <div class="page-subtitle">${params.length} regra(s) — ${params.filter(p=>!p.empresa_id).length} globais · ${params.filter(p=>p.empresa_id).length} por empresa</div>
          </div>
          <button class="btn-primary" onclick="PageParametros.abrirModal()">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5"><path d="M12 5v14M5 12h14"/></svg>
            Novo Parâmetro
          </button>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn-secondary ${filtro==='todos'   ? 'active-filter' : ''}" onclick="PageParametros._filtro='todos';App.navigate('parametros')">Todos</button>
          <button class="btn-secondary ${filtro==='global'  ? 'active-filter' : ''}"  onclick="PageParametros._filtro='global';App.navigate('parametros')">Globais</button>
          <button class="btn-secondary ${filtro==='empresa' ? 'active-filter' : ''}" onclick="PageParametros._filtro='empresa';App.navigate('parametros')">Por Empresa</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Palavra-chave</th>
                <th>Categoria</th>
                <th style="width:70px">Tipo</th>
                <th style="width:60px">Prio.</th>
                <th style="width:110px">Agrupamento</th>
                <th>Lançamentos Contábeis</th>
                <th style="width:120px">Escopo</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              ${lista.length === 0 ? `
                <tr><td colspan="8">
                  <div class="empty-state">
                    <svg viewBox="0 0 24 24"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                    <p>Nenhum parâmetro encontrado</p>
                  </div>
                </td></tr>
              ` : lista.map(p => {
                const ag  = agMap[p.agrupamento_id];
                const emp = p.empresa_id ? empMap[p.empresa_id] : null;
                const lancItems = this._parseLancs(p.lancamento_contabil);
                const lancDisplay = lancItems.map(i => this._formatLancItem(i)).filter(Boolean);
                return `
                  <tr style="${!p.ativo ? 'opacity:.4' : ''}">
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        ${ag ? `<div class="color-swatch" style="background:${ag.cor_hex}"></div>` : '<div style="width:18px"></div>'}
                        <strong style="font-family:monospace;font-size:13px">${p.palavra_chave}</strong>
                      </div>
                    </td>
                    <td>${p.categoria}</td>
                    <td>
                      <span style="font-size:11px;padding:2px 7px;border-radius:10px;${
                        p.tipo === 'soma'    ? 'background:rgba(0,214,143,.12);color:var(--success)' :
                        p.tipo === 'subtrai' ? 'background:rgba(255,77,109,.12);color:var(--danger)' :
                                              'background:rgba(255,255,255,.06);color:var(--text-muted)'
                      }">${p.tipo === '-' ? 'Ambos' : p.tipo}</span>
                    </td>
                    <td style="text-align:center;font-weight:700">${p.prioridade}</td>
                    <td>${ag ? `<span style="font-size:11px;padding:2px 7px;border-radius:4px;background:${ag.cor_hex}22;color:${ag.cor_hex};border:1px solid ${ag.cor_hex}44">${ag.descricao}</span>` : '-'}</td>
                    <td>
                      ${lancDisplay.length === 0 ? `<span style="color:var(--text-dim)">—</span>` : `
                        <div class="lanc-table-list">
                          ${lancDisplay.map((txt, idx) => `<div class="lanc-table-item"><span class="lanc-table-num">${idx+1}</span>${txt}</div>`).join('')}
                        </div>
                      `}
                    </td>
                    <td>
                      ${emp ? `<span class="chip chip-empresa" title="${emp.nome}">${emp.codigo_interno ? emp.codigo_interno + ' · ' : ''}${emp.nome}</span>` : '<span class="chip chip-global">Global</span>'}
                    </td>
                    <td>
                      <div style="display:flex;gap:6px">
                        <button class="btn-icon" onclick="PageParametros.abrirModal(${JSON.stringify(p).replace(/"/g,'&quot;')})">
                          <svg viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="btn-danger" onclick="PageParametros.excluir(${p.id})">✕</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────

  async abrirModal(p = null) {
    const [agrupamentos, empresas] = await Promise.all([
      api.get('/api/agrupamentos'),
      api.get('/api/empresas'),
    ]);

    // Inicializa lista de lançamentos
    this._lancamentos = this._parseLancs(p?.lancamento_contabil || '');
    if (!this._lancamentos.length) {
      this._lancamentos = [{ tipo: 'estruturado', texto: '', d: '', c: '', h: '' }];
    }

    const html = `
      <div class="modal-bg" id="modal-param">
        <div class="modal" style="max-width:700px">
          <div class="modal-header">
            <span class="modal-title">${p ? 'Editar' : 'Novo'} Parâmetro</span>
            <button class="modal-close" onclick="document.getElementById('modal-param').remove()">✕</button>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Palavra-chave *</label>
              <input type="text" id="p-palavra" value="${p?.palavra_chave ?? ''}" placeholder="Ex: ENERGISA, Municipio de Cuiaba..." />
            </div>
            <div class="form-group" style="max-width:80px">
              <label>Prioridade</label>
              <input type="number" id="p-prio" value="${p?.prioridade ?? 1}" min="1" max="999" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Categoria *</label>
              <input type="text" id="p-cat" value="${p?.categoria ?? ''}" placeholder="Energia / Funcionário / ICMS..." />
            </div>
            <div class="form-group" style="max-width:130px">
              <label>Tipo</label>
              <select id="p-tipo">
                <option value="-"       ${p?.tipo === '-'       ? 'selected' : ''}>Ambos (−)</option>
                <option value="subtrai" ${p?.tipo === 'subtrai' ? 'selected' : ''}>Subtrai (saída)</option>
                <option value="soma"    ${p?.tipo === 'soma'    ? 'selected' : ''}>Soma (entrada)</option>
              </select>
            </div>
            <div class="form-group" style="max-width:180px">
              <label>Agrupamento / Cor</label>
              <select id="p-ag">
                <option value="">— sem cor —</option>
                ${agrupamentos.map(a => `<option value="${a.id}" ${p?.agrupamento_id == a.id ? 'selected' : ''}>${a.codigo} · ${a.descricao}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Lançamentos Contábeis (múltiplos) -->
          <div style="margin-bottom:14px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <label style="margin:0">Lançamentos Contábeis</label>
              <button class="lanc-add-btn" onclick="PageParametros._addLancamento()">
                + Adicionar lançamento
              </button>
            </div>
            <div id="lanc-lista"></div>
          </div>

          <div class="form-group" style="margin-bottom:14px">
            <label>Escopo — Empresa (deixe em branco para Global)</label>
            <select id="p-empresa">
              <option value="">🌐 Global (todas as empresas)</option>
              ${empresas.map(e => `<option value="${e.id}" ${p?.empresa_id == e.id ? 'selected' : ''}>${e.codigo_interno ? e.codigo_interno + ' · ' : ''}${e.nome}</option>`).join('')}
            </select>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" onclick="document.getElementById('modal-param').remove()">Cancelar</button>
            <button class="btn-primary" onclick="PageParametros.salvar(${p?.id ?? 'null'})">Salvar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    this._renderLancamentos();
  },

  // ── Gestão da lista dinâmica de lançamentos ───────────────────────────────────

  _renderLancamentos() {
    const el = document.getElementById('lanc-lista');
    if (!el) return;

    el.innerHTML = this._lancamentos.map((item, i) => {
      const canRemove = this._lancamentos.length > 1;
      const preview   = this._formatLancItem(item);
      return `
        <div class="lanc-item" data-i="${i}">
          <div class="lanc-item-header">
            <span class="lanc-num">${i + 1}</span>
            <div class="lanc-modo-toggle">
              <button class="lanc-modo-btn ${item.tipo === 'livre'       ? 'active' : ''}"
                onclick="PageParametros._setModoLancItem(${i}, 'livre')">Texto livre</button>
              <button class="lanc-modo-btn ${item.tipo === 'estruturado' ? 'active' : ''}"
                onclick="PageParametros._setModoLancItem(${i}, 'estruturado')">D · C · H</button>
            </div>
            <button class="btn-danger" style="padding:3px 8px;font-size:12px;${canRemove ? '' : 'opacity:.3;cursor:not-allowed'}"
              onclick="PageParametros._removeLanc(${i})">✕</button>
          </div>

          ${item.tipo === 'livre' ? `
            <input type="text" class="lanc-input-livre"
              value="${(item.texto || '').replace(/"/g, '&quot;')}"
              placeholder="Ex: Pagar (D 3338/C Banco) ou qualquer descrição"
              oninput="PageParametros._updateLancItem(${i}, 'texto', this.value)" />
          ` : `
            <div style="display:flex;gap:8px;align-items:center">
              <div style="display:flex;align-items:center;gap:6px;flex:1">
                <span class="lanc-label-dc">D</span>
                <input type="text" value="${(item.d || '').replace(/"/g, '&quot;')}"
                  placeholder="Ex: 597" style="flex:1"
                  oninput="PageParametros._updateLancItem(${i}, 'd', this.value)" />
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex:1">
                <span class="lanc-label-dc">C</span>
                <input type="text" value="${(item.c || '').replace(/"/g, '&quot;')}"
                  placeholder="Ex: Banco" style="flex:1"
                  oninput="PageParametros._updateLancItem(${i}, 'c', this.value)" />
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex:1">
                <span class="lanc-label-dc" style="background:rgba(255,200,0,.15);color:#ffd060">H</span>
                <input type="text" value="${(item.h || '').replace(/"/g, '&quot;')}"
                  placeholder="149 (opcional)" style="flex:1"
                  oninput="PageParametros._updateLancItem(${i}, 'h', this.value)" />
              </div>
            </div>
            <div class="lanc-preview">${preview ? '→ ' + preview : ''}</div>
          `}
        </div>
      `;
    }).join('');
  },

  _addLancamento() {
    this._lancamentos.push({ tipo: 'estruturado', texto: '', d: '', c: '', h: '' });
    this._renderLancamentos();
    // Scroll lista para baixo
    const el = document.getElementById('lanc-lista');
    if (el) el.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  _removeLanc(i) {
    if (this._lancamentos.length <= 1) return;
    this._lancamentos.splice(i, 1);
    this._renderLancamentos();
  },

  _setModoLancItem(i, modo) {
    this._lancamentos[i].tipo = modo;
    this._renderLancamentos();
  },

  _updateLancItem(i, field, val) {
    this._lancamentos[i][field] = val;
    // Atualiza preview inline (sem re-render para não perder foco)
    if (this._lancamentos[i].tipo === 'estruturado') {
      const item    = this._lancamentos[i];
      const preview = document.querySelector(`#lanc-lista [data-i="${i}"] .lanc-preview`);
      if (preview) {
        const txt = this._formatLancItem(item);
        preview.textContent = txt ? '→ ' + txt : '';
      }
    }
  },

  _getLancamento() {
    const validos = this._lancamentos.filter(item =>
      item.tipo === 'estruturado' ? (item.d || item.c) : item.texto?.trim()
    );
    if (!validos.length) return '';
    return JSON.stringify(validos);
  },

  // ── Salvar ────────────────────────────────────────────────────────────────────

  async salvar(id) {
    const body = {
      palavra_chave:       document.getElementById('p-palavra').value.trim(),
      categoria:           document.getElementById('p-cat').value.trim(),
      tipo:                document.getElementById('p-tipo').value,
      prioridade:          parseInt(document.getElementById('p-prio').value) || 1,
      agrupamento_id:      document.getElementById('p-ag').value || null,
      lancamento_contabil: this._getLancamento(),
      empresa_id:          document.getElementById('p-empresa').value || null,
      ativo: 1,
    };
    if (!body.palavra_chave || !body.categoria) return toast('Palavra-chave e Categoria são obrigatórias', 'warning');
    if (id) await api.put(`/api/parametros/${id}`, body);
    else     await api.post('/api/parametros', body);
    document.getElementById('modal-param').remove();
    toast('Parâmetro salvo!', 'success');
    App.navigate('parametros');
  },

  async excluir(id) {
    if (!confirm('Excluir este parâmetro?')) return;
    await api.del(`/api/parametros/${id}`);
    toast('Parâmetro removido', 'success');
    App.navigate('parametros');
  },
};
