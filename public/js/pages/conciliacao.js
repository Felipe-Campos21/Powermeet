const PageConciliacao = {
  _filialId: null,
  _empresaId: null,
  _empresaInfo: null,
  _todasFiliais: [],
  _dados: [],
  _filtros: { categoria: '', mes: '', ano: '', situacao: '', tipo: '', dataDe: '', dataAte: '', historico: '' },

  async render() {
    const requests = [
      api.get('/api/filiais-bancos'),
      this._filialId ? api.get(`/api/indicadores?filial_banco_id=${this._filialId}`) : Promise.resolve(null),
      this._empresaId ? api.get('/api/empresas') : Promise.resolve(null),
    ];
    const [filiais, indicadores, todasEmpresas] = await Promise.all(requests);

    this._todasFiliais = filiais;

    if (todasEmpresas && this._empresaId) {
      const emp = todasEmpresas.find(e => e.id == this._empresaId);
      this._empresaInfo = emp || null;
    } else if (!this._empresaId) {
      this._empresaInfo = null;
    }

    const empresaMap = {};
    for (const f of filiais) {
      if (!empresaMap[f.empresa_id]) {
        empresaMap[f.empresa_id] = { id: f.empresa_id, nome: f.empresa_nome, codigo: f.empresa_codigo || '' };
      }
    }

    const empresaSel  = this._empresaId ? empresaMap[this._empresaId] : null;
    const filiaisEmp  = empresaSel ? filiais.filter(f => f.empresa_id == this._empresaId) : [];
    const filialAtiva = this._filialId;

    return `
      <div class="top-sticky">
        <!-- Barra 1: seletor de empresa + botões -->
        <div class="selector-bar">
          <div id="empresa-selector-area">
            ${empresaSel ? `
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap">Empresa</span>
                <div class="empresa-chip">
                  ${empresaSel.codigo ? `<span class="empresa-chip-cod">${empresaSel.codigo}</span>` : ''}
                  <span class="empresa-chip-nome">${empresaSel.nome}</span>
                  <button class="empresa-chip-clear" onclick="PageConciliacao.limparEmpresa()">×</button>
                </div>
              </div>
            ` : `
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap">Empresa</span>
                <div class="empresa-search-wrap">
                  <input type="text" id="empresa-search" class="empresa-search-input"
                    placeholder="Código ou nome..."
                    oninput="PageConciliacao.filtrarEmpresas(this.value)"
                    onblur="setTimeout(()=>{const d=document.getElementById('empresa-dropdown');if(d)d.innerHTML='';},150)"
                    autocomplete="off" />
                  <div class="empresa-dropdown" id="empresa-dropdown"></div>
                </div>
              </div>
            `}
          </div>
          <div id="selector-botoes" style="display:${filialAtiva ? 'flex' : 'none'};gap:8px;align-items:center;margin-left:auto">
            <button class="btn-secondary" id="btn-importar" onclick="App.navigate('importar')" style="font-size:13px">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Importar Extrato
            </button>
            <button class="btn-secondary" style="font-size:12px" onclick="PageConciliacao.corrigirNomes()">✎ Corrigir Nomes</button>
            <button class="btn-danger"    style="font-size:12px" onclick="PageConciliacao.limparExtrato()">Limpar Extrato</button>
          </div>
        </div>

        <!-- Barra 2: cards de banco -->
        <div id="banco-selector-wrap" class="banco-selector-bar" ${!empresaSel ? 'style="display:none"' : ''}>
          <span class="selector-label-v">Banco</span>
          <div class="banco-cards" id="banco-cards">
            ${this._renderBancoCards(filiaisEmp)}
          </div>
        </div>

        <!-- Barra 3: info da empresa (CNPJ / Sócios / Encarregados) -->
        ${this._renderEmpresaInfo()}
      </div>

      <div class="page" style="padding-top:16px">
        ${!filialAtiva ? `
          <div class="empty-state" style="margin-top:80px">
            <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            <p>${empresaSel ? 'Selecione um banco acima para ver o extrato' : 'Selecione uma empresa para começar'}</p>
            <small>${empresaSel ? `${filiaisEmp.length} conta(s) disponível(is) para ${empresaSel.nome}` : 'Os dados de conciliação aparecerão aqui'}</small>
          </div>
        ` : `
          <!-- Indicadores -->
          <div class="indicadores-grid" id="ind-container">
            ${this._renderIndicadores(indicadores)}
          </div>

          <!-- Filtros -->
          <div class="filtros-bar" id="filtros-bar">
            <div class="filtro-group">
              <label>Categoria</label>
              <select id="f-cat" onchange="PageConciliacao.aplicarFiltros()">
                <option value="">Todas</option>
                ${(indicadores?.categorias || []).map(c => `<option value="${c}" ${this._filtros.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="filtro-group">
              <label>Mês</label>
              <select id="f-mes" onchange="PageConciliacao.aplicarFiltros()">
                <option value="">Todos</option>
                ${[...new Set(this._dados.map(r => r.mes))].sort((a,b)=>a-b).map(m => `<option value="${m}" ${this._filtros.mes == m ? 'selected' : ''}>${nomeMes(m)}</option>`).join('')}
              </select>
            </div>
            <div class="filtro-group">
              <label>Ano</label>
              <select id="f-ano" onchange="PageConciliacao.aplicarFiltros()">
                <option value="">Todos</option>
                ${[...new Set(this._dados.map(r => r.ano))].sort().map(a => `<option value="${a}" ${this._filtros.ano == a ? 'selected' : ''}>${a}</option>`).join('')}
              </select>
            </div>
            <div class="filtro-group">
              <label>Período</label>
              <div style="display:flex;align-items:center;gap:5px">
                <input type="date" id="f-data-de"  value="${this._filtros.dataDe}"  onchange="PageConciliacao.aplicarFiltros()" style="padding:5px 8px;font-size:12px" />
                <span style="color:var(--text-dim);font-size:11px">até</span>
                <input type="date" id="f-data-ate" value="${this._filtros.dataAte}" onchange="PageConciliacao.aplicarFiltros()" style="padding:5px 8px;font-size:12px" />
              </div>
            </div>
            <div class="filtro-group">
              <label>Tipo</label>
              <select id="f-tipo" onchange="PageConciliacao.aplicarFiltros()">
                <option value="">Todos</option>
                <option value="subtrai" ${this._filtros.tipo === 'subtrai' ? 'selected' : ''}>↓ Subtrai</option>
                <option value="soma"    ${this._filtros.tipo === 'soma'    ? 'selected' : ''}>↑ Soma</option>
              </select>
            </div>
            <div class="filtro-group">
              <label>Situação</label>
              <select id="f-sit" onchange="PageConciliacao.aplicarFiltros()">
                <option value="">Todas</option>
                <option value="pendente"   ${this._filtros.situacao === 'pendente'   ? 'selected' : ''}>Pendente</option>
                <option value="conciliado" ${this._filtros.situacao === 'conciliado' ? 'selected' : ''}>Conciliado</option>
              </select>
            </div>
            <div class="filtro-group">
              <label>Buscar Histórico</label>
              <input type="text" id="f-hist" value="${this._filtros.historico}" oninput="PageConciliacao.aplicarFiltros()" placeholder="Ex: rural t..." style="padding:6px 10px;font-size:12px;min-width:160px" />
            </div>
            <button id="btn-subst-hist" class="filtro-btn-subst" onclick="PageConciliacao.substituirHistorico()" style="${this._filtros.historico ? '' : 'display:none'}">
              ↺ Substituir todos
            </button>
            <button class="filtro-btn-clear" onclick="PageConciliacao.limparFiltros()">✕ Limpar</button>
            <div style="margin-left:auto;font-size:12px;color:var(--text-muted);align-self:center" id="contagem-label"></div>
          </div>

          <!-- Tabela -->
          <div class="table-wrap" id="tabela-extrato">
            <div style="padding:40px;text-align:center;color:var(--text-muted)">Carregando...</div>
          </div>
        `}
      </div>
    `;
  },

  _renderBancoCards(filiais) {
    const BASE = 'http://127.0.0.1:5100';
    if (!filiais.length) return `<span style="color:var(--text-muted);font-size:13px">Nenhum banco cadastrado para esta empresa</span>`;
    return filiais.map(f => `
      <div class="banco-card ${f.id == this._filialId ? 'active' : ''}" onclick="PageConciliacao.trocarFilial(${f.id})" data-id="${f.id}">
        <div class="banco-card-logo-wrap">
          <img src="${BASE}/api/bancos/logo/${encodeURIComponent(f.codigo_banco || '')}"
            class="banco-card-logo"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
          <div class="banco-logo-fallback">${(f.codigo_banco || '?').slice(0, 3)}</div>
        </div>
        <div class="banco-card-info">
          <span class="banco-card-nome">${f.banco || 'Banco'}</span>
          <span class="banco-card-filial">${f.nome_filial}</span>
          <span class="banco-card-cod">cód ${f.codigo_banco || '-'}</span>
        </div>
        <label class="banco-logo-upload-btn" title="Trocar logo do banco" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          <input type="file" accept="image/*" style="display:none"
            onchange="PageConciliacao.uploadBancoLogo('${f.codigo_banco}', this)" />
        </label>
      </div>
    `).join('');
  },

  _renderEmpresaInfo() {
    const e = this._empresaInfo;
    if (!e) return '';

    const socios       = Array.isArray(e.socios)       ? e.socios.filter(Boolean)       : [];
    const encarregados = Array.isArray(e.encarregados) ? e.encarregados.filter(Boolean) : [];

    const hasData = e.cnpj || socios.length || encarregados.length;
    if (!hasData) return '';

    const chips = [];
    if (e.cnpj) {
      chips.push(`<div class="emp-info-item"><span class="emp-info-label">CNPJ</span><span class="emp-info-value">${e.cnpj}</span></div>`);
    }
    socios.forEach(s => {
      chips.push(`<div class="emp-info-item"><span class="emp-info-label">Sócio</span><span class="emp-info-value">${s}</span></div>`);
    });
    encarregados.forEach(enc => {
      chips.push(`<div class="emp-info-item"><span class="emp-info-label">Encarregado</span><span class="emp-info-value">${enc}</span></div>`);
    });

    return `
      <div class="empresa-info-bar">
        ${chips.join('')}
      </div>
    `;
  },

  filtrarEmpresas(valor) {
    const dd = document.getElementById('empresa-dropdown');
    if (!dd) return;
    const q = valor.trim().toLowerCase();
    if (!q) { dd.innerHTML = ''; return; }
    const empresaMap = {};
    for (const f of this._todasFiliais) {
      if (!empresaMap[f.empresa_id]) {
        empresaMap[f.empresa_id] = { id: f.empresa_id, nome: f.empresa_nome, codigo: f.empresa_codigo || '' };
      }
    }
    const matches = Object.values(empresaMap).filter(e =>
      e.nome.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q)
    );
    if (!matches.length) {
      dd.innerHTML = `<div class="empresa-dd-empty">Nenhuma empresa encontrada</div>`;
      return;
    }
    dd.innerHTML = matches.slice(0, 8).map(e => `
      <div class="empresa-dd-item" onmousedown="PageConciliacao.selecionarEmpresa(${e.id})">
        ${e.codigo ? `<span class="empresa-dd-cod">${e.codigo}</span>` : ''}
        <span class="empresa-dd-nome">${e.nome}</span>
      </div>
    `).join('');
  },

  async selecionarEmpresa(id) {
    this._empresaId = id;
    this._filialId = null;
    this._dados = [];
    this._filtros = { categoria: '', mes: '', ano: '', situacao: '', tipo: '', dataDe: '', dataAte: '', historico: '' };
    App.setFilialAtiva(null);
    await this._rerender();
  },

  limparEmpresa() {
    this._empresaId = null;
    this._filialId = null;
    this._dados = [];
    App.setFilialAtiva(null);
    this._rerender();
  },

  async _rerender() {
    const content = document.getElementById('page-content');
    if (!content) return;
    content.innerHTML = await this.render();
    if (this.afterRender) await this.afterRender();
  },

  async uploadBancoLogo(codigo, input) {
    const file = input.files[0];
    if (!file || !codigo) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      await api.post(`/api/bancos/logo/${encodeURIComponent(codigo)}`, { data_base64: base64, mime: file.type });
      toast('Logo atualizado', 'success');
      const filiaisEmp = this._todasFiliais.filter(f => f.empresa_id == this._empresaId);
      const cards = document.getElementById('banco-cards');
      if (cards) cards.innerHTML = this._renderBancoCards(filiaisEmp);
    };
    reader.readAsDataURL(file);
  },

  _renderIndicadores(ind) {
    if (!ind) return '';
    const total = ind.total || { total: 0, conciliados: 0 };
    const pctTotal = total.total > 0 ? Math.round((total.conciliados / total.total) * 100) : 0;

    const filtroAtivo = Object.values(this._filtros).some(v => v !== '');
    let parcialHtml = '';
    if (filtroAtivo) {
      const vis = this._dadosVisiveis();
      const concVis = vis.filter(r => r.situacao === 'conciliado').length;
      const pctParcial = vis.length > 0 ? Math.round((concVis / vis.length) * 100) : 0;
      parcialHtml = `
        <div class="indicador-card">
          <div class="ind-title">Conciliação Parcial <span style="font-size:10px;color:var(--text-dim)">(filtro ativo)</span></div>
          <div class="ind-percent">${pctParcial}%</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pctParcial}%"></div></div>
          <div class="ind-detail">${concVis} de ${vis.length} item(ns)</div>
        </div>
      `;
    } else {
      parcialHtml = `
        <div class="indicador-card">
          <div class="ind-title">Conciliação Parcial</div>
          <div class="ind-parcial-info">Aplique um filtro para ver o progresso de um grupo específico</div>
        </div>
      `;
    }

    const mensalHtml = ind.mensal && ind.mensal.length > 0 ? `
      <div class="indicador-card">
        <div class="ind-title">Conciliação Mensal</div>
        <div class="mensal-list">
          ${ind.mensal.map(m => {
            const pct = m.total > 0 ? Math.round((m.conciliados / m.total) * 100) : 0;
            return `
              <div class="mensal-row">
                <span class="mensal-label">${nomeMes(m.mes)}/${String(m.ano).slice(2)}</span>
                <div class="mensal-bar-wrap"><div class="mensal-bar-fill" style="width:${pct}%"></div></div>
                <span class="mensal-pct">${pct}%</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : `
      <div class="indicador-card">
        <div class="ind-title">Conciliação Mensal</div>
        <div class="ind-parcial-info">Importe extratos para ver o progresso mensal</div>
      </div>
    `;

    return `
      <div class="indicador-card">
        <div class="ind-title">Conciliação Total</div>
        <div class="ind-percent">${pctTotal}%</div>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pctTotal}%"></div></div>
        <div class="ind-detail">${total.conciliados} de ${total.total} item(ns)</div>
      </div>
      ${parcialHtml}
      ${mensalHtml}
    `;
  },

  _dadosVisiveis() {
    const f = this._filtros;
    return this._dados.filter(r => {
      if (f.categoria && r.categoria_exibida !== f.categoria) return false;
      if (f.mes       && String(r.mes) !== String(f.mes))     return false;
      if (f.ano       && String(r.ano) !== String(f.ano))     return false;
      if (f.situacao  && r.situacao !== f.situacao)           return false;
      if (f.tipo      && r.tipo_transacao !== f.tipo)         return false;
      if (f.dataDe    && r.data < f.dataDe)                   return false;
      if (f.dataAte   && r.data > f.dataAte)                  return false;
      if (f.historico && !(r.historico || '').toLowerCase().includes(f.historico.toLowerCase())) return false;
      return true;
    });
  },

  _atualizarOpçoesFiltro() {
    const meses = [...new Set(this._dados.map(r => r.mes))].sort((a, b) => a - b);
    const anos  = [...new Set(this._dados.map(r => r.ano))].sort();

    const fMes = document.getElementById('f-mes');
    if (fMes) {
      const cur = this._filtros.mes;
      fMes.innerHTML = `<option value="">Todos</option>` +
        meses.map(m => `<option value="${m}" ${String(m) === cur ? 'selected' : ''}>${nomeMes(m)}</option>`).join('');
    }

    const fAno = document.getElementById('f-ano');
    if (fAno) {
      const cur = this._filtros.ano;
      fAno.innerHTML = `<option value="">Todos</option>` +
        anos.map(a => `<option value="${a}" ${String(a) === cur ? 'selected' : ''}>${a}</option>`).join('');
    }
  },

  _renderTabela(dados) {
    if (!dados.length) {
      return `
        <div class="empty-state" style="padding:60px">
          <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          <p>Nenhum lançamento encontrado</p>
          <small>Ajuste os filtros ou importe um extrato</small>
        </div>
      `;
    }

    const rows = dados.map(r => {
      const cor = r.cor_hex || null;
      const matched = !!cor;
      const histEsc = (r.historico || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const docEsc  = (r.documento || '').replace(/"/g, '&quot;');
      const pendEsc = (r.pendencia || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const nAnexos = r.anexos_count || 0;
      return `
        <tr class="${matched ? 'row-matched' : 'row-unmatched'}" data-id="${r.id}">
          <td class="cor-stripe">
            <div class="stripe-bar" style="background:${cor || 'transparent'};${cor ? '' : 'border:1px dashed rgba(255,255,255,.1)'}"></div>
          </td>
          <td style="white-space:nowrap;color:var(--text-muted)">${formatarData(r.data)}</td>
          <td>
            <textarea class="historico-edit" rows="1"
              onblur="PageConciliacao.salvarCampo(${r.id},'historico',this.value)"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.blur()}"
              oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
            >${histEsc}</textarea>
          </td>
          <td>
            <input class="editable" value="${docEsc}"
              onblur="PageConciliacao.salvarCampo(${r.id},'documento',this.value)"
              onkeydown="if(event.key==='Enter')this.blur()"
              placeholder="NF / contrato..." />
          </td>
          <td style="white-space:nowrap;text-align:right" class="valor-${r.tipo_transacao}">${formatarValor(r.valor)}</td>
          <td><span class="tipo-${r.tipo_transacao}">${r.tipo_transacao === 'soma' ? '↑' : '↓'}</span></td>
          <td>
            <span class="lancamento-text" style="max-width:220px" title="${r.lancamento_exibido || ''}">${r.lancamento_exibido || '<span style="color:var(--text-dim);font-size:11px;font-family:inherit">não identificado</span>'}</span>
          </td>
          <td>
            <span class="badge badge-${r.situacao}" onclick="PageConciliacao.toggleSituacao(${r.id},'${r.situacao}',this)">
              ${r.situacao === 'conciliado' ? '✓ Conciliado' : '● Pendente'}
            </span>
          </td>
          <td style="text-align:center">
            <button class="btn-attach${nAnexos > 0 ? ' has-attach' : ''}" onclick="PageConciliacao.abrirAnexos(${r.id})" title="${nAnexos} anexo(s)">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              ${nAnexos > 0 ? `<span class="attach-count">${nAnexos}</span>` : ''}
            </button>
          </td>
          <td>
            <textarea class="pendencia-edit" rows="1"
              onblur="PageConciliacao.salvarCampo(${r.id},'pendencia',this.value)"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.blur()}"
              oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
              placeholder="Observação..."
            >${pendEsc}</textarea>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table>
        <thead>
          <tr>
            <th class="th-group th-group-extrato" colspan="6">Lançamento de Extrato</th>
            <th class="th-group th-group-conciliacao" colspan="4">Lançamento Contábil</th>
          </tr>
          <tr>
            <th style="width:6px;padding:0"></th>
            <th style="width:90px">Data</th>
            <th>Histórico</th>
            <th style="width:160px">Documento</th>
            <th style="text-align:right;width:110px">Valor</th>
            <th style="width:30px">Tp</th>
            <th>Lançamento</th>
            <th style="width:120px">Situação</th>
            <th style="width:46px;text-align:center">Anx</th>
            <th style="width:200px">Pendência</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },

  async trocarFilial(id) {
    this._filialId = id || null;
    this._filtros = { categoria: '', mes: '', ano: '', situacao: '', tipo: '', dataDe: '', dataAte: '', historico: '' };
    App.setFilialAtiva(id);
    await this._rerender();
  },

  async _carregarDados() {
    if (!this._filialId) { this._dados = []; return; }
    this._dados = await api.get(`/api/extrato?filial_banco_id=${this._filialId}`);
  },

  aplicarFiltros() {
    this._filtros.categoria = document.getElementById('f-cat')?.value     || '';
    this._filtros.mes       = document.getElementById('f-mes')?.value     || '';
    this._filtros.ano       = document.getElementById('f-ano')?.value     || '';
    this._filtros.tipo      = document.getElementById('f-tipo')?.value    || '';
    this._filtros.situacao  = document.getElementById('f-sit')?.value     || '';
    this._filtros.dataDe    = document.getElementById('f-data-de')?.value  || '';
    this._filtros.dataAte   = document.getElementById('f-data-ate')?.value || '';
    this._filtros.historico = document.getElementById('f-hist')?.value     || '';
    const btnSubst = document.getElementById('btn-subst-hist');
    if (btnSubst) btnSubst.style.display = this._filtros.historico ? '' : 'none';
    this._atualizarTabela();
    this._atualizarIndicadoresParcial();
  },

  limparFiltros() {
    this._filtros = { categoria: '', mes: '', ano: '', situacao: '', tipo: '', dataDe: '', dataAte: '', historico: '' };
    ['f-cat','f-mes','f-ano','f-tipo','f-sit','f-data-de','f-data-ate','f-hist'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const btnSubst = document.getElementById('btn-subst-hist');
    if (btnSubst) btnSubst.style.display = 'none';
    this._atualizarTabela();
    this._atualizarIndicadoresParcial();
  },

  _atualizarTabela() {
    const vis = this._dadosVisiveis();
    const wrap = document.getElementById('tabela-extrato');
    if (wrap) {
      wrap.innerHTML = this._renderTabela(vis);
      wrap.querySelectorAll('.historico-edit, .pendencia-edit').forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }
    const label = document.getElementById('contagem-label');
    if (label) {
      const pend = vis.filter(r => r.situacao === 'pendente').length;
      label.textContent = `${vis.length} item(ns) · ${pend} pendente(s)`;
    }
  },

  _atualizarIndicadoresParcial() {
    const container = document.getElementById('ind-container');
    if (!container) return;

    const filtroAtivo = Object.values(this._filtros).some(v => v !== '');
    const cards = container.querySelectorAll('.indicador-card');
    if (cards.length < 2) return;

    if (filtroAtivo) {
      const vis = this._dadosVisiveis();
      const concVis = vis.filter(r => r.situacao === 'conciliado').length;
      const pct = vis.length > 0 ? Math.round((concVis / vis.length) * 100) : 0;
      cards[1].innerHTML = `
        <div class="ind-title">Conciliação Parcial <span style="font-size:10px;color:var(--text-dim)">(filtro ativo)</span></div>
        <div class="ind-percent">${pct}%</div>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="ind-detail">${concVis} de ${vis.length} item(ns)</div>
      `;
    } else {
      cards[1].innerHTML = `
        <div class="ind-title">Conciliação Parcial</div>
        <div class="ind-parcial-info">Aplique um filtro para ver o progresso de um grupo específico</div>
      `;
    }
  },

  async _atualizarIndicadores() {
    if (!this._filialId) return;
    const ind = await api.get(`/api/indicadores?filial_banco_id=${this._filialId}`);
    const container = document.getElementById('ind-container');
    if (container) container.innerHTML = this._renderIndicadores(ind);

    // Atualizar opções de categoria no filtro
    const fCat = document.getElementById('f-cat');
    if (fCat && ind.categorias) {
      const atual = fCat.value;
      fCat.innerHTML = `<option value="">Todas</option>${ind.categorias.map(c => `<option value="${c}" ${c === atual ? 'selected' : ''}>${c}</option>`).join('')}`;
    }
  },

  async toggleSituacao(id, atual, el) {
    const nova = atual === 'pendente' ? 'conciliado' : 'pendente';
    await api.put(`/api/extrato/${id}`, { situacao: nova });

    // Atualiza local
    const item = this._dados.find(d => d.id === id);
    if (item) item.situacao = nova;

    el.className = `badge badge-${nova}`;
    el.textContent = nova === 'conciliado' ? '✓ Conciliado' : '● Pendente';
    el.onclick = () => PageConciliacao.toggleSituacao(id, nova, el);

    // Atualiza indicadores de progresso
    this._atualizarIndicadoresParcial();
    this._atualizarIndicadorTotal();
  },

  _atualizarIndicadorTotal() {
    const container = document.getElementById('ind-container');
    if (!container) return;
    const cards = container.querySelectorAll('.indicador-card');
    if (!cards[0]) return;
    const total = this._dados.length;
    const conc  = this._dados.filter(d => d.situacao === 'conciliado').length;
    const pct   = total > 0 ? Math.round((conc / total) * 100) : 0;
    cards[0].innerHTML = `
      <div class="ind-title">Conciliação Total</div>
      <div class="ind-percent">${pct}%</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div class="ind-detail">${conc} de ${total} item(ns)</div>
    `;
  },

  async salvarCampo(id, campo, valor) {
    const item = this._dados.find(d => d.id === id);
    if (item && item[campo] === valor) return;
    await api.put(`/api/extrato/${id}`, { [campo]: valor });
    if (item) item[campo] = valor;
  },

  async corrigirNomes() {
    if (!this._filialId) return;
    const agrupamentos = await api.get('/api/agrupamentos');
    const grupo = agrupamentos.find(a => Number(a.codigo) === 5);
    if (!grupo) { toast('Agrupamento "Corrigir Nome" (código 5) não encontrado', 'warning'); return; }

    const params = await api.get(`/api/parametros?filial_banco_id=${this._filialId}`);
    const correcoes = params.filter(p => p.agrupamento_id == grupo.id && p.lancamento_contabil && p.ativo);
    if (!correcoes.length) { toast('Nenhum parâmetro de correção configurado no agrupamento', 'warning'); return; }

    let count = 0;
    for (const param of correcoes) {
      const regex = new RegExp(param.palavra_chave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      // Para corrigir nomes, usa o primeiro lançamento em texto plano
      let replaceText = param.lancamento_contabil || '';
      try {
        const arr = JSON.parse(replaceText);
        if (Array.isArray(arr) && arr.length) {
          const first = arr[0];
          replaceText = first.tipo === 'estruturado'
            ? [first.d && `D ${first.d}`, first.c && `C ${first.c}`, first.h && `H ${first.h}`].filter(Boolean).join(' ')
            : (first.texto || '');
        }
      } catch {}
      for (const r of this._dados) {
        if (regex.test(r.historico)) {
          const novoHist = r.historico.replace(regex, replaceText);
          if (novoHist !== r.historico) {
            await api.put(`/api/extrato/${r.id}`, { historico: novoHist });
            r.historico = novoHist;
            count++;
          }
        }
      }
    }
    toast(count > 0 ? `${count} histórico(s) corrigido(s)` : 'Nenhuma correção necessária', count > 0 ? 'success' : 'warning');
    if (count > 0) this._atualizarTabela();
  },

  async abrirAnexos(extratoId) {
    const anexos = await api.get(`/api/anexos?extrato_id=${extratoId}`);
    const listHtml = anexos.length
      ? anexos.map(a => `
          <div class="anexo-item" id="anx-${a.id}">
            ${a.mime.startsWith('image/') ? `<img src="http://127.0.0.1:5100/api/anexos/${a.id}/view" class="anexo-thumb" onclick="window.open('http://127.0.0.1:5100/api/anexos/${a.id}/view')" />` : `<div class="anexo-icon">PDF</div>`}
            <div class="anexo-info">
              <a href="http://127.0.0.1:5100/api/anexos/${a.id}/view" target="_blank" class="anexo-nome">${a.nome}</a>
              <span class="anexo-data">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
            </div>
            <button class="btn-icon" onclick="PageConciliacao.removerAnexo(${a.id},${extratoId})" title="Remover">
              <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Nenhum anexo ainda.</p>';

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-bg" id="modal-anexos" onclick="if(event.target.id==='modal-anexos')PageConciliacao.fecharAnexos()">
        <div class="modal" style="max-width:480px">
          <div class="modal-header">
            <span class="modal-title">Anexos do Lançamento</span>
            <button class="modal-close" onclick="PageConciliacao.fecharAnexos()">×</button>
          </div>
          <div class="anexos-list">${listHtml}</div>
          <div style="margin-top:16px">
            <label class="btn-secondary" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M12 5v14M5 12h14"/></svg>
              Adicionar arquivo
              <input type="file" accept="image/*,.pdf" style="display:none" onchange="PageConciliacao.uploadAnexo(${extratoId},this)" />
            </label>
          </div>
        </div>
      </div>
    `);
  },

  fecharAnexos() {
    document.getElementById('modal-anexos')?.remove();
  },

  async uploadAnexo(extratoId, input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      await api.post('/api/anexos', { extrato_id: extratoId, nome: file.name, data_base64: base64, mime: file.type || 'application/octet-stream' });
      const item = this._dados.find(d => d.id === extratoId);
      if (item) item.anexos_count = (item.anexos_count || 0) + 1;
      this._atualizarBotaoAnexo(extratoId);
      this.fecharAnexos();
      await this.abrirAnexos(extratoId);
      toast('Arquivo anexado', 'success');
    };
    reader.readAsDataURL(file);
  },

  async removerAnexo(anexoId, extratoId) {
    if (!confirm('Remover este anexo?')) return;
    await api.del(`/api/anexos/${anexoId}`);
    const item = this._dados.find(d => d.id === extratoId);
    if (item && item.anexos_count > 0) item.anexos_count--;
    this._atualizarBotaoAnexo(extratoId);
    this.fecharAnexos();
    await this.abrirAnexos(extratoId);
  },

  _atualizarBotaoAnexo(extratoId) {
    const item = this._dados.find(d => d.id === extratoId);
    if (!item) return;
    const btn = document.querySelector(`tr[data-id="${extratoId}"] .btn-attach`);
    if (!btn) return;
    const n = item.anexos_count || 0;
    btn.className = `btn-attach${n > 0 ? ' has-attach' : ''}`;
    btn.title = `${n} anexo(s)`;
    const span = btn.querySelector('.attach-count');
    if (n > 0) { if (span) span.textContent = n; else btn.insertAdjacentHTML('beforeend', `<span class="attach-count">${n}</span>`); }
    else span?.remove();
  },

  async substituirHistorico() {
    const busca = this._filtros.historico;
    if (!busca) return;
    const vis = this._dadosVisiveis();
    if (!vis.length) { toast('Nenhum lançamento visível', 'warning'); return; }

    const substituto = prompt(`Substituir "${busca}" por:\n(nos ${vis.length} lançamento(s) filtrado(s))`);
    if (substituto === null) return;

    const regex = new RegExp(busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let count = 0;
    for (const r of vis) {
      const novoHist = (r.historico || '').replace(regex, substituto);
      if (novoHist !== r.historico) {
        await api.put(`/api/extrato/${r.id}`, { historico: novoHist });
        r.historico = novoHist;
        count++;
      }
    }
    toast(`${count} histórico(s) atualizado(s)`, 'success');
    this._atualizarTabela();
  },

  async limparExtrato() {
    if (!this._filialId) return;
    const f = this._filtros;
    const temFiltro = f.mes || f.ano;
    const msg = temFiltro
      ? `Remover os lançamentos do período filtrado (Mês: ${f.mes || 'todos'} / Ano: ${f.ano || 'todos'})?`
      : 'Remover TODOS os lançamentos desta filial/banco?';
    if (!confirm(msg)) return;

    let url = `/api/extrato?filial_banco_id=${this._filialId}`;
    if (f.mes) url += `&mes=${f.mes}`;
    if (f.ano) url += `&ano=${f.ano}`;
    const r = await api.del(url);
    toast(`${r.removidas} lançamento(s) removido(s)`, 'success');
    await this._carregarDados();
    this._atualizarTabela();
    this._atualizarIndicadores();
  },

  // Chamado ao entrar na página
  async afterRender() {
    if (!this._filialId) return;
    await this._carregarDados();
    this._atualizarOpçoesFiltro();
    this._atualizarTabela();
  },
};

function nomeMes(n) {
  return ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][n] || '';
}
