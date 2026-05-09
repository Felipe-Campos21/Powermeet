const PageAgrupamentos = {
  async render() {
    const lista = await api.get('/api/agrupamentos');
    return `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">Agrupamentos</div>
            <div class="page-subtitle">Paleta de cores para identificação visual — ${lista.length} grupos cadastrados</div>
          </div>
          <button class="btn-primary" onclick="PageAgrupamentos.abrirModal()">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.5"><path d="M12 5v14M5 12h14"/></svg>
            Novo Agrupamento
          </button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:60px">Código</th>
                <th>Descrição</th>
                <th style="width:100px">Cor</th>
                <th style="width:100px">Preview</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              ${lista.length === 0 ? `
                <tr><td colspan="5">
                  <div class="empty-state">
                    <svg viewBox="0 0 24 24"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                    <p>Nenhum agrupamento cadastrado</p>
                    <small>Crie agrupamentos para definir as cores de identificação</small>
                  </div>
                </td></tr>
              ` : lista.map(a => `
                <tr>
                  <td><strong>${a.codigo}</strong></td>
                  <td>${a.descricao}</td>
                  <td><code style="font-size:11px;color:var(--text-muted)">${a.cor_hex}</code></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="color-swatch" style="background:${a.cor_hex};width:28px;height:20px;border-radius:4px"></div>
                      <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${a.cor_hex}22;color:${a.cor_hex};border:1px solid ${a.cor_hex}44">Exemplo</span>
                    </div>
                  </td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn-icon" onclick="PageAgrupamentos.abrirModal(${JSON.stringify(a).replace(/"/g,'&quot;')})">
                        <svg viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button class="btn-danger" onclick="PageAgrupamentos.excluir(${a.id})">✕</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  abrirModal(ag = null) {
    const isEdit = !!ag;
    const html = `
      <div class="modal-bg" id="modal-ag">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">${isEdit ? 'Editar' : 'Novo'} Agrupamento</span>
            <button class="modal-close" onclick="document.getElementById('modal-ag').remove()">✕</button>
          </div>
          <div class="form-row">
            <div class="form-group" style="max-width:90px">
              <label>Código</label>
              <input type="number" id="ag-codigo" value="${ag?.codigo ?? ''}" placeholder="1" />
            </div>
            <div class="form-group">
              <label>Descrição</label>
              <input type="text" id="ag-desc" value="${ag?.descricao ?? ''}" placeholder="Ex: Impostos Federais" />
            </div>
            <div class="form-group" style="max-width:90px">
              <label>Cor</label>
              <input type="color" id="ag-cor" value="${ag?.cor_hex ?? '#0080ff'}" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" onclick="document.getElementById('modal-ag').remove()">Cancelar</button>
            <button class="btn-primary" onclick="PageAgrupamentos.salvar(${ag?.id ?? 'null'})">Salvar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  async salvar(id) {
    const body = {
      codigo: parseInt(document.getElementById('ag-codigo').value),
      descricao: document.getElementById('ag-desc').value.trim(),
      cor_hex: document.getElementById('ag-cor').value,
    };
    if (!body.codigo || !body.descricao) return toast('Preencha código e descrição', 'warning');
    if (id) await api.put(`/api/agrupamentos/${id}`, body);
    else     await api.post('/api/agrupamentos', body);
    document.getElementById('modal-ag').remove();
    toast('Agrupamento salvo!', 'success');
    App.navigate('agrupamentos');
  },

  async excluir(id) {
    if (!confirm('Excluir este agrupamento?')) return;
    await api.del(`/api/agrupamentos/${id}`);
    toast('Agrupamento removido', 'success');
    App.navigate('agrupamentos');
  },
};
