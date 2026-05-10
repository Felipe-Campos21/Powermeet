// Toast container
document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');

function toast(msg, tipo = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// Estilo para filtro ativo
const _s = document.createElement('style');
_s.textContent = `.active-filter { border-color: var(--primary) !important; color: var(--primary) !important; background: var(--primary-glow) !important; }`;
document.head.appendChild(_s);

// ── Aguarda servidor ficar disponível ─────────────────────────────────────────
async function aguardaServidor(tentativas = 20) {
  for (let i = 0; i < tentativas; i++) {
    try {
      await fetch(`http://127.0.0.1:5100/api/config`);
      return true;
    } catch (_) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return false;
}

// ── App Router ────────────────────────────────────────────────────────────────
const PAGES = {
  conciliacao:  PageConciliacao,
  importar:     PageImportar,
  parametros:   PageParametros,
  empresas:     PageEmpresas,
  agrupamentos: PageAgrupamentos,
};

const App = {
  _paginaAtual: 'conciliacao',
  _filialAtiva: null,

  getFilialAtiva() { return this._filialAtiva; },

  setFilialAtiva(id) {
    this._filialAtiva = id || null;
    if (PageConciliacao._filialId !== undefined) PageConciliacao._filialId = this._filialAtiva;
  },

  async navigate(pagina) {
    this._paginaAtual = pagina;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pagina);
    });

    const page = PAGES[pagina];
    if (!page) return;

    const content = document.getElementById('page-content');
    if (!content) return;

    try {
      content.innerHTML = await page.render();
      if (page.afterRender) await page.afterRender();
    } catch (e) {
      content.innerHTML = `
        <div class="empty-state" style="margin-top:120px">
          <svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <p>Erro ao carregar a página</p>
          <small>${e.message}</small>
        </div>`;
    }
  },

  _setupNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(el.dataset.page);
      });
    });
  },

  async init() {
    // Pega porta do Electron (se disponível)
    if (window.electron) {
      const port = await window.electron.getPort();
      api.setPort(port);
    }

    // Mostra loading enquanto aguarda servidor
    const overlay = document.getElementById('setup-overlay');
    const appDiv  = document.getElementById('app');

    // Aguarda o servidor subir (sql.js demora ~1-2s para inicializar)
    const ok = await aguardaServidor();
    if (!ok) {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;color:#6b7a99;font-family:Segoe UI,sans-serif">
          <p>Não foi possível conectar ao servidor interno.</p>
          <small>Feche e abra o PowerMeet novamente.</small>
        </div>`;
      return;
    }

    // Verifica configuração
    const cfg = await api.get('/api/config');

    if (!cfg || !cfg.dbPath) {
      overlay.classList.remove('hidden');
      return;
    }

    // App configurado — mostra e navega
    appDiv.classList.remove('hidden');
    this._setupNav();
    await this.navigate('conciliacao');
    this._loadVersion();
  },

  async _loadVersion() {
    try {
      const { version } = await api.get('/api/version');
      const el = document.getElementById('app-version');
      if (el) el.textContent = 'v' + version;
    } catch (_) {}
  },

  toggleSidebar() {
    const sidebar  = document.querySelector('.sidebar');
    const reopenBtn = document.getElementById('sidebar-reopen-btn');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    reopenBtn.classList.toggle('hidden', !isCollapsed);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
