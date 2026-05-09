const PageImportar = {
  _filialId: null,
  _preview: [],

  async render() {
    const BASE     = 'http://127.0.0.1:5100';
    const empresaId = PageConciliacao._empresaId;

    // Reusa filiais já carregadas pela conciliação; faz fetch se ainda não tiver
    let todasFiliais = PageConciliacao._todasFiliais;
    if (!todasFiliais || !todasFiliais.length) {
      todasFiliais = await api.get('/api/filiais-bancos');
    }

    const empresaInfo = empresaId
      ? (() => {
          const f = todasFiliais.find(f => f.empresa_id == empresaId);
          return f ? { id: f.empresa_id, nome: f.empresa_nome, codigo: f.empresa_codigo || '' } : null;
        })()
      : null;

    const filiaisEmp = empresaId
      ? todasFiliais.filter(f => f.empresa_id == empresaId)
      : [];

    const filialAtiva = this._filialId;

    return `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">Importar Extrato</div>
            <div class="page-subtitle">Cole os dados exportados do Domínio — o app identifica automaticamente</div>
          </div>
        </div>

        ${!empresaId || !empresaInfo ? `
          <div class="card" style="text-align:center;padding:48px 32px;color:var(--text-muted)">
            <svg viewBox="0 0 24 24" style="width:48px;height:48px;stroke:var(--border);fill:none;stroke-width:1.5;margin:0 auto 16px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <p style="margin:0 0 16px;font-size:14px">Nenhuma empresa selecionada.<br>Selecione uma empresa na aba <strong>Conciliação</strong> primeiro.</p>
            <button class="btn-secondary" onclick="App.navigate('conciliacao')">← Ir para Conciliação</button>
          </div>
        ` : `
          <div class="card" style="margin-bottom:14px">

            <!-- Empresa (somente leitura) -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
              <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap">Empresa</span>
              <div class="empresa-chip">
                ${empresaInfo.codigo ? `<span class="empresa-chip-cod">${empresaInfo.codigo}</span>` : ''}
                <span class="empresa-chip-nome">${empresaInfo.nome}</span>
              </div>
            </div>

            <!-- Seletor de banco -->
            <div style="margin-bottom:16px">
              <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">Banco</span>
              ${filiaisEmp.length === 0 ? `
                <span style="font-size:13px;color:var(--text-muted)">Nenhum banco cadastrado para esta empresa.</span>
              ` : `
                <div class="banco-cards">
                  ${filiaisEmp.map(f => `
                    <div class="banco-card ${f.id == filialAtiva ? 'active' : ''}"
                         onclick="PageImportar.selecionarBanco(${f.id})">
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
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- Formato esperado -->
            <div style="margin-bottom:10px">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
                <strong>Formato esperado (separado por tabulação):</strong><br>
                <code style="font-size:11px">Data &nbsp;&nbsp; Histórico &nbsp;&nbsp; Valor &nbsp;&nbsp; Tipo</code><br>
                <span style="font-size:11px">Tipo: <strong>soma</strong> (entrada) ou <strong>subtrai</strong> (saída)</span>
              </div>
            </div>

            <div class="import-area">
              <textarea id="imp-texto" placeholder="Cole aqui os dados do extrato...
Exemplo:
01/04/2025&#9;ENERGISA CUIABA&#9;1250,50&#9;subtrai
02/04/2025&#9;TRANSFERENCIA PIX DES: JOAO SILVA&#9;3000,00&#9;subtrai
03/04/2025&#9;DEPOSITO CLIENTE&#9;8500,00&#9;soma"></textarea>
            </div>

            <div style="display:flex;gap:10px">
              <button class="btn-primary" onclick="PageImportar.processar()">
                <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                Processar e Visualizar
              </button>
              <button class="btn-secondary" onclick="PageImportar.limpar()">Limpar</button>
            </div>
          </div>

          <div id="imp-preview"></div>
        `}
      </div>
    `;
  },

  async selecionarBanco(id) {
    this._filialId = id;
    this._preview  = [];
    const content = document.getElementById('page-content');
    content.innerHTML = await this.render();
    // Restaura texto digitado (se houver)
    const ta = document.getElementById('imp-texto');
    if (ta && this._textoRascunho) ta.value = this._textoRascunho;
  },

  limpar() {
    this._textoRascunho = '';
    const ta = document.getElementById('imp-texto');
    if (ta) ta.value = '';
    const prev = document.getElementById('imp-preview');
    if (prev) prev.innerHTML = '';
    this._preview = [];
  },

  parseLinha(linha) {
    const cols = linha.split('\t');
    if (cols.length < 4) return null;

    const dataRaw   = cols[0].trim();
    const historico = cols[1].trim();
    const valorRaw  = cols[2].trim()
      .replace(/R\$\s*/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const tipoRaw   = cols[3].trim().toLowerCase();

    const valor = parseFloat(valorRaw);
    if (isNaN(valor) || !historico) return null;

    let data = dataRaw;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataRaw)) {
      const [d, m, a] = dataRaw.split('/');
      data = `${a}-${m}-${d}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;

    const tipo_transacao = (tipoRaw === 'soma' || tipoRaw === 'entrada' || tipoRaw === '+') ? 'soma' : 'subtrai';
    return { data, historico, valor: Math.abs(valor), tipo_transacao };
  },

  processar() {
    if (!this._filialId) return toast('Selecione um banco antes de processar', 'warning');

    const texto = document.getElementById('imp-texto')?.value?.trim();
    if (!texto) return toast('Cole os dados do extrato', 'warning');

    this._textoRascunho = texto;

    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    const erros  = [];

    linhas.forEach((l, i) => {
      const p = this.parseLinha(l);
      if (p) parsed.push(p);
      else erros.push(i + 1);
    });

    if (parsed.length === 0) return toast('Nenhuma linha válida encontrada. Verifique o formato.', 'error');

    this._preview = parsed;

    const preview = document.getElementById('imp-preview');
    preview.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div>
            <strong>${parsed.length} linha(s) válida(s)</strong>
            ${erros.length > 0 ? `<span style="color:var(--warning);font-size:12px;margin-left:10px">⚠ ${erros.length} linha(s) ignorada(s) (formato inválido)</span>` : ''}
          </div>
          <button class="btn-primary" onclick="PageImportar.confirmarImportacao()">
            ✓ Confirmar Importação
          </button>
        </div>
        <div class="table-wrap" style="max-height:400px;overflow-y:auto">
          <table class="preview-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Histórico</th>
                <th>Valor</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              ${parsed.map(p => `
                <tr>
                  <td>${formatarData(p.data)}</td>
                  <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.historico}">${p.historico}</td>
                  <td class="valor-${p.tipo_transacao}">${formatarValor(p.valor)}</td>
                  <td><span class="tipo-${p.tipo_transacao}">${p.tipo_transacao === 'soma' ? '↑ Soma' : '↓ Subtrai'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async confirmarImportacao() {
    if (!this._preview.length || !this._filialId) return;
    const r = await api.post('/api/extrato/importar', {
      filial_banco_id: this._filialId,
      linhas: this._preview,
    });
    if (r.error) return toast('Erro: ' + r.error, 'error');
    toast(`✓ ${r.importadas} linha(s) importada(s) — ${r.identificadas} identificada(s) automaticamente`, 'success');
    this._preview        = [];
    this._textoRascunho  = '';
    App.setFilialAtiva(this._filialId);
    PageConciliacao._filialId = this._filialId;
    App.navigate('conciliacao');
  },
};

function formatarData(iso) {
  if (!iso) return '-';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function formatarValor(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
