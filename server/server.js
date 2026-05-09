const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

const app      = express();
const PORT     = process.env.PORT || 5100;
const USER_DATA = process.env.USER_DATA || path.join(os.homedir(), 'PowerMeet');
const CONFIG_FILE = path.join(USER_DATA, 'config.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Config ──────────────────────────────────────────────────────────────────

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return null; }
}
function writeConfig(cfg) {
  if (!fs.existsSync(USER_DATA)) fs.mkdirSync(USER_DATA, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// ── DB (sql.js) ──────────────────────────────────────────────────────────────

let SQL = null;
let _db  = null;
let _dbFile = null;

async function ensureSql() {
  if (SQL) return;
  SQL = await require('sql.js')();
}

async function getDb() {
  await ensureSql();
  if (_db) return _db;
  const cfg = readConfig();
  if (!cfg?.dbPath) return null;
  _dbFile = path.join(cfg.dbPath, 'powermeet.db');
  if (fs.existsSync(_dbFile)) {
    _db = new SQL.Database(fs.readFileSync(_dbFile));
  } else {
    _db = new SQL.Database();
  }
  _db.run('PRAGMA foreign_keys = ON;');
  initSchema();
  saveDb();
  return _db;
}

function saveDb() {
  if (!_db || !_dbFile) return;
  const data = _db.export();
  fs.writeFileSync(_dbFile, Buffer.from(data));
}

// Helpers que imitam a API do better-sqlite3
function dbRun(sql, params = []) {
  _db.run(sql, params);
  const r = _db.exec('SELECT last_insert_rowid(), changes()');
  const vals = r[0]?.values[0] || [null, 0];
  saveDb();
  return { lastInsertRowid: vals[0], changes: vals[1] };
}

function dbAll(sql, params = []) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows[0] || null;
}

function dbExec(sql) {
  _db.run(sql);
  saveDb();
}

const BANCOS_PADRAO = [
  ['3444','Banco Bradesco S/A'],['10100','Banco Bradesco S/A - Filial 0003'],
  ['7424','Banco Bradesco S/A C/C 23363-3'],['14557','Banco Bradesco S/A C/C 591772-7'],
  ['9147','Banco C6 Bank S/A'],['6211','Banco Cora SCD - Sociedade de Crédito Direto S.A'],
  ['15915','Banco da Amazônia S.A.'],['15917','Banco do Bradesco S/A Filial 2 Conta 147437-5'],
  ['13','Banco do Brasil S/A'],['9128','Banco do Brasil S/A - Ag. 7139-0 C/C 12654-3 - Filial 0002-45.'],
  ['11843','Banco do Brasil S/A - Ag. 8687-8 C/C 7000-9'],['5158','Banco do Brasil S/A Filial 0004-17 Sinop'],
  ['15916','Banco do Brasil S/A Filial 2 Conta 12780-9'],['15919','Banco do Brasil S/A Filial 3 Conta 124681'],
  ['9532','Banco Efí S/a'],['6517','Banco Fibra'],['4372','Banco Inter'],
  ['16','Banco Itaú S/A'],['14578','Banco Itaú S/A'],
  ['9163','Banco Itaú S/A - Ag. 1689 C/C 47709-7 - Caixa Reserva'],
  ['9129','Banco Itaú S/A - Ag. 1689 C/C 98288-0 - Filial 0002-45.'],
  ['4837','Banco Mundomaxx Pagamentos Eletronicos Ltda'],['1845','Banco Safra S/A'],
  ['15918','Banco Safra S/A Filial 2 Conta 583189-9'],['67','Banco Santander S/A'],
  ['8232','Banco XP S.A.'],['12','Caixa Econômica Federal S/A'],['11154','Grafeno Digital'],
  ['3697','Juno S/A'],['5811','Mercado Pago Brasil - Banco Digital'],['6366','Nu Pagamentos S.A.'],
  ['7238','PagBank S/A'],['986','Sicoob - Sistema de Cooperativas de Crédito do Brasil'],
  ['3448','Sistema de Crédito Cooperativo (Sicredi)'],['7675','Stone Instituição de Pagamento S.A.'],
  ['5783','Stone Instituição de Pagamento S.A. - Filial 0003-82'],
  ['4830','Unicred - Coop. Crédito dos Med. Prof. Saúde e Emp. de MT'],
  ['15455','Banco Credisis- Ag. 0002-7 / C.C 2300503-3'],
];

function initSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS agrupamentos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo    INTEGER UNIQUE NOT NULL,
      descricao TEXT NOT NULL,
      cor_hex   TEXT NOT NULL DEFAULT '#888888'
    );
    CREATE TABLE IF NOT EXISTS bancos (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nome   TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS empresas (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nome           TEXT NOT NULL,
      codigo_interno TEXT DEFAULT '',
      cnpj           TEXT DEFAULT '',
      socios         TEXT DEFAULT '[]',
      encarregados   TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS filiais_bancos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id   INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      nome_filial  TEXT NOT NULL,
      banco        TEXT NOT NULL,
      agencia      TEXT DEFAULT '',
      conta        TEXT DEFAULT '',
      codigo_banco TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS parametros (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      filial_banco_id     INTEGER REFERENCES filiais_bancos(id) ON DELETE CASCADE,
      palavra_chave       TEXT NOT NULL,
      categoria           TEXT NOT NULL,
      tipo                TEXT NOT NULL DEFAULT '-',
      prioridade          INTEGER NOT NULL DEFAULT 1,
      agrupamento_id      INTEGER REFERENCES agrupamentos(id),
      lancamento_contabil TEXT DEFAULT '',
      ativo               INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS extrato (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      filial_banco_id    INTEGER NOT NULL REFERENCES filiais_bancos(id) ON DELETE CASCADE,
      data               TEXT NOT NULL,
      historico          TEXT NOT NULL,
      valor              REAL NOT NULL,
      tipo_transacao     TEXT NOT NULL,
      parametro_id       INTEGER,
      lancamento_exibido TEXT,
      categoria_exibida  TEXT,
      agrupamento_id     INTEGER,
      cor_hex            TEXT,
      documento          TEXT DEFAULT '',
      situacao           TEXT NOT NULL DEFAULT 'pendente',
      pendencia          TEXT DEFAULT '',
      mes                INTEGER,
      ano                INTEGER,
      importado_em       TEXT
    );
    CREATE TABLE IF NOT EXISTS anexos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      extrato_id INTEGER NOT NULL REFERENCES extrato(id) ON DELETE CASCADE,
      nome       TEXT NOT NULL,
      caminho    TEXT NOT NULL,
      mime       TEXT NOT NULL DEFAULT 'application/octet-stream',
      criado_em  TEXT NOT NULL
    );
  `);

  // Migração: adiciona colunas novas em tabelas existentes (sem perder dados)
  const colsEmp = dbAll('PRAGMA table_info(empresas)').map(r => r.name);
  if (!colsEmp.includes('cnpj'))          _db.run('ALTER TABLE empresas ADD COLUMN cnpj TEXT DEFAULT ""');
  if (!colsEmp.includes('socios'))        _db.run('ALTER TABLE empresas ADD COLUMN socios TEXT DEFAULT "[]"');
  if (!colsEmp.includes('encarregados'))  _db.run('ALTER TABLE empresas ADD COLUMN encarregados TEXT DEFAULT "[]"');

  const colsFil = dbAll('PRAGMA table_info(filiais_bancos)').map(r => r.name);
  if (!colsFil.includes('codigo_banco'))    _db.run('ALTER TABLE filiais_bancos ADD COLUMN codigo_banco TEXT DEFAULT ""');
  if (!colsFil.includes('codigo_interno'))  _db.run('ALTER TABLE filiais_bancos ADD COLUMN codigo_interno TEXT DEFAULT ""');

  const colsBancos = dbAll('PRAGMA table_info(bancos)').map(r => r.name);
  if (!colsBancos.includes('logo_path'))    _db.run('ALTER TABLE bancos ADD COLUMN logo_path TEXT DEFAULT ""');

  const colsParam = dbAll('PRAGMA table_info(parametros)').map(r => r.name);
  if (!colsParam.includes('empresa_id'))    _db.run('ALTER TABLE parametros ADD COLUMN empresa_id INTEGER');

  // Popula bancos padrão se a tabela estiver vazia
  const qtdBancos = dbGet('SELECT COUNT(*) as n FROM bancos');
  if (!qtdBancos || qtdBancos.n === 0) {
    _db.run('BEGIN');
    for (const [codigo, nome] of BANCOS_PADRAO) {
      _db.run('INSERT OR IGNORE INTO bancos (codigo, nome) VALUES (?,?)', [codigo, nome]);
    }
    _db.run('COMMIT');
  }
}

// ── Formata lançamentos contábeis (JSON array ou string legada) ──────────────

function formatLancamentos(val) {
  if (!val) return '';
  let items;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) items = parsed;
    else return val;
  } catch { return val; }
  return items.map(item => {
    if (item.tipo === 'estruturado') {
      let s = '';
      if (item.d) s += `D ${item.d}`;
      if (item.c) s += ` C ${item.c}`;
      if (item.h) s += ` H ${item.h}`;
      return s.trim();
    }
    return item.texto || '';
  }).filter(Boolean).join(' | ');
}

// ── Motor de Matching ────────────────────────────────────────────────────────

function matchLinha(historico, tipoTransacao, parametros) {
  const hist = historico.toLowerCase();
  const candidatos = parametros.filter(p => {
    if (!p.ativo) return false;
    const tipoOk = p.tipo === '-' || p.tipo === tipoTransacao;
    return tipoOk && hist.includes(p.palavra_chave.toLowerCase());
  });
  if (!candidatos.length) return null;
  return candidatos.reduce((m, p) => p.prioridade > m.prioridade ? p : m);
}

// ── Config ───────────────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => res.json(readConfig() || {}));

app.post('/api/config', async (req, res) => {
  const { dbPath } = req.body;
  if (!dbPath) return res.status(400).json({ error: 'dbPath obrigatório' });
  if (!fs.existsSync(dbPath)) {
    try { fs.mkdirSync(dbPath, { recursive: true }); }
    catch (e) { return res.status(400).json({ error: e.message }); }
  }
  _db = null; _dbFile = null;
  writeConfig({ dbPath });
  await getDb();
  res.json({ ok: true });
});

// ── Agrupamentos ─────────────────────────────────────────────────────────────

app.get('/api/agrupamentos', async (req, res) => {
  const d = await getDb(); if (!d) return res.json([]);
  res.json(dbAll('SELECT * FROM agrupamentos ORDER BY codigo'));
});
app.post('/api/agrupamentos', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { codigo, descricao, cor_hex } = req.body;
  const r = dbRun('INSERT INTO agrupamentos (codigo,descricao,cor_hex) VALUES (?,?,?)', [codigo, descricao, cor_hex || '#888888']);
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/agrupamentos/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { codigo, descricao, cor_hex } = req.body;
  dbRun('UPDATE agrupamentos SET codigo=?,descricao=?,cor_hex=? WHERE id=?', [codigo, descricao, cor_hex, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/agrupamentos/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  dbRun('DELETE FROM agrupamentos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Bancos ───────────────────────────────────────────────────────────────────

app.get('/api/bancos', async (req, res) => {
  const d = await getDb(); if (!d) return res.json([]);
  res.json(dbAll('SELECT * FROM bancos ORDER BY codigo * 1, codigo'));
});
app.get('/api/bancos/lookup', async (req, res) => {
  const d = await getDb(); if (!d) return res.json(null);
  const { codigo } = req.query;
  if (!codigo) return res.json(null);
  const banco = dbGet('SELECT * FROM bancos WHERE codigo=?', [String(codigo).trim()]);
  res.json(banco || null);
});
app.post('/api/bancos', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { codigo, nome } = req.body;
  const r = dbRun('INSERT OR REPLACE INTO bancos (codigo, nome) VALUES (?,?)', [String(codigo).trim(), nome]);
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/bancos/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { codigo, nome } = req.body;
  dbRun('UPDATE bancos SET codigo=?,nome=? WHERE id=?', [String(codigo).trim(), nome, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/bancos/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  dbRun('DELETE FROM bancos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Empresas ─────────────────────────────────────────────────────────────────

app.get('/api/empresas', async (req, res) => {
  const d = await getDb(); if (!d) return res.json([]);
  const rows = dbAll('SELECT * FROM empresas ORDER BY nome');
  rows.forEach(e => {
    try { e.socios = JSON.parse(e.socios || '[]'); } catch { e.socios = []; }
    try { e.encarregados = JSON.parse(e.encarregados || '[]'); } catch { e.encarregados = []; }
  });
  res.json(rows);
});
app.post('/api/empresas', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { nome, codigo_interno, cnpj, socios, encarregados } = req.body;
  const r = dbRun(
    'INSERT INTO empresas (nome,codigo_interno,cnpj,socios,encarregados) VALUES (?,?,?,?,?)',
    [nome, codigo_interno || '', cnpj || '', JSON.stringify(socios || []), JSON.stringify(encarregados || [])]
  );
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/empresas/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { nome, codigo_interno, cnpj, socios, encarregados } = req.body;
  dbRun(
    'UPDATE empresas SET nome=?,codigo_interno=?,cnpj=?,socios=?,encarregados=? WHERE id=?',
    [nome, codigo_interno || '', cnpj || '', JSON.stringify(socios || []), JSON.stringify(encarregados || []), req.params.id]
  );
  res.json({ ok: true });
});
app.delete('/api/empresas/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  dbRun('DELETE FROM filiais_bancos WHERE empresa_id=?', [req.params.id]);
  dbRun('DELETE FROM empresas WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Filiais/Bancos ────────────────────────────────────────────────────────────

app.get('/api/filiais-bancos', async (req, res) => {
  const d = await getDb(); if (!d) return res.json([]);
  const { empresa_id } = req.query;
  const sql = `SELECT fb.*, e.nome as empresa_nome, e.codigo_interno as empresa_codigo FROM filiais_bancos fb JOIN empresas e ON e.id=fb.empresa_id${empresa_id ? ' WHERE fb.empresa_id=?' : ''} ORDER BY e.nome, fb.nome_filial`;
  res.json(empresa_id ? dbAll(sql, [empresa_id]) : dbAll(sql));
});
app.post('/api/filiais-bancos', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { empresa_id, nome_filial, banco, codigo_banco, codigo_interno } = req.body;
  const r = dbRun(
    'INSERT INTO filiais_bancos (empresa_id,nome_filial,banco,codigo_banco,codigo_interno) VALUES (?,?,?,?,?)',
    [empresa_id, nome_filial, banco || '', codigo_banco || '', codigo_interno || '']
  );
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/filiais-bancos/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { empresa_id, nome_filial, banco, codigo_banco, codigo_interno } = req.body;
  dbRun(
    'UPDATE filiais_bancos SET empresa_id=?,nome_filial=?,banco=?,codigo_banco=?,codigo_interno=? WHERE id=?',
    [empresa_id, nome_filial, banco || '', codigo_banco || '', codigo_interno || '', req.params.id]
  );
  res.json({ ok: true });
});
app.delete('/api/filiais-bancos/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  dbRun('DELETE FROM extrato WHERE filial_banco_id=?', [req.params.id]);
  dbRun('DELETE FROM filiais_bancos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Parâmetros ────────────────────────────────────────────────────────────────

app.get('/api/parametros', async (req, res) => {
  const d = await getDb(); if (!d) return res.json([]);
  const { filial_banco_id, empresa_id } = req.query;
  let sql = `SELECT p.*, a.cor_hex, a.descricao as agrupamento_desc FROM parametros p LEFT JOIN agrupamentos a ON a.id=p.agrupamento_id`;
  let params = [];
  if (empresa_id) {
    sql += ' WHERE (p.empresa_id=? OR p.empresa_id IS NULL)';
    params.push(empresa_id);
  } else if (filial_banco_id) {
    // legado: resolve empresa_id da filial e filtra por ela
    const fil = dbGet('SELECT empresa_id FROM filiais_bancos WHERE id=?', [filial_banco_id]);
    if (fil) { sql += ' WHERE (p.empresa_id=? OR p.empresa_id IS NULL)'; params.push(fil.empresa_id); }
  }
  sql += ' ORDER BY p.prioridade DESC, p.palavra_chave';
  res.json(params.length ? dbAll(sql, params) : dbAll(sql));
});
app.post('/api/parametros', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { empresa_id, palavra_chave, categoria, tipo, prioridade, agrupamento_id, lancamento_contabil } = req.body;
  const r = dbRun('INSERT INTO parametros (empresa_id,palavra_chave,categoria,tipo,prioridade,agrupamento_id,lancamento_contabil) VALUES (?,?,?,?,?,?,?)', [empresa_id || null, palavra_chave, categoria, tipo || '-', prioridade || 1, agrupamento_id || null, lancamento_contabil || '']);
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/parametros/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { empresa_id, palavra_chave, categoria, tipo, prioridade, agrupamento_id, lancamento_contabil, ativo } = req.body;
  dbRun('UPDATE parametros SET empresa_id=?,palavra_chave=?,categoria=?,tipo=?,prioridade=?,agrupamento_id=?,lancamento_contabil=?,ativo=? WHERE id=?', [empresa_id || null, palavra_chave, categoria, tipo, prioridade, agrupamento_id || null, lancamento_contabil, ativo ?? 1, req.params.id]);
  res.json({ ok: true });
});
app.delete('/api/parametros/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  dbRun('DELETE FROM parametros WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ── Extrato ───────────────────────────────────────────────────────────────────

app.get('/api/extrato', async (req, res) => {
  const d = await getDb(); if (!d) return res.json([]);
  const { filial_banco_id, mes, ano, situacao, categoria, tipo_transacao } = req.query;
  if (!filial_banco_id) return res.status(400).json({ error: 'filial_banco_id obrigatório' });
  let sql = 'SELECT e.*, (SELECT COUNT(*) FROM anexos a WHERE a.extrato_id = e.id) as anexos_count FROM extrato e WHERE e.filial_banco_id=?';
  const params = [filial_banco_id];
  if (mes)            { sql += ' AND e.mes=?';              params.push(Number(mes)); }
  if (ano)            { sql += ' AND e.ano=?';              params.push(Number(ano)); }
  if (situacao)       { sql += ' AND e.situacao=?';         params.push(situacao); }
  if (categoria)      { sql += ' AND e.categoria_exibida=?'; params.push(categoria); }
  if (tipo_transacao) { sql += ' AND e.tipo_transacao=?';   params.push(tipo_transacao); }
  sql += ' ORDER BY e.data, e.id';
  res.json(dbAll(sql, params));
});

app.post('/api/extrato/importar', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { filial_banco_id, linhas } = req.body;
  if (!filial_banco_id || !Array.isArray(linhas)) return res.status(400).json({ error: 'Dados inválidos' });

  const filialRow2 = dbGet('SELECT empresa_id FROM filiais_bancos WHERE id=?', [filial_banco_id]);
  const empId2 = filialRow2 ? filialRow2.empresa_id : null;
  const parametros = dbAll(`SELECT p.*, a.cor_hex FROM parametros p LEFT JOIN agrupamentos a ON a.id=p.agrupamento_id WHERE (p.empresa_id=? OR p.empresa_id IS NULL) AND p.ativo=1`, [empId2]);

  const agora = new Date().toISOString();
  let importadas = 0, identificadas = 0;

  _db.run('BEGIN');
  try {
    for (const linha of linhas) {
      const { data, historico, valor, tipo_transacao } = linha;
      const match = matchLinha(historico, tipo_transacao, parametros);
      const d = new Date(data);
      const mes = d.getMonth() + 1;
      const ano = d.getFullYear();
      _db.run(
        `INSERT INTO extrato (filial_banco_id,data,historico,valor,tipo_transacao,parametro_id,lancamento_exibido,categoria_exibida,agrupamento_id,cor_hex,situacao,mes,ano,importado_em)
         VALUES (?,?,?,?,?,?,?,?,?,?,'pendente',?,?,?)`,
        [filial_banco_id, data, historico, valor, tipo_transacao,
         match ? match.id : null,
         match ? formatLancamentos(match.lancamento_contabil) : null,
         match ? match.categoria : null,
         match ? match.agrupamento_id : null,
         match ? match.cor_hex : null,
         mes, ano, agora]
      );
      importadas++;
      if (match) identificadas++;
    }
    _db.run('COMMIT');
    saveDb();
    res.json({ importadas, identificadas });
  } catch (e) {
    _db.run('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/extrato/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { situacao, documento, pendencia, historico } = req.body;
  const campos = [], vals = [];
  if (situacao  !== undefined) { campos.push('situacao=?');  vals.push(situacao); }
  if (documento !== undefined) { campos.push('documento=?'); vals.push(documento); }
  if (pendencia !== undefined) { campos.push('pendencia=?'); vals.push(pendencia); }
  if (historico !== undefined) { campos.push('historico=?'); vals.push(historico); }
  if (!campos.length) return res.status(400).json({ error: 'Nenhum campo' });
  vals.push(req.params.id);
  dbRun(`UPDATE extrato SET ${campos.join(',')} WHERE id=?`, vals);
  res.json({ ok: true });
});

app.delete('/api/extrato', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { filial_banco_id, mes, ano } = req.query;
  if (!filial_banco_id) return res.status(400).json({ error: 'filial_banco_id obrigatório' });
  let sql = 'DELETE FROM extrato WHERE filial_banco_id=?';
  const params = [filial_banco_id];
  if (mes) { sql += ' AND mes=?'; params.push(Number(mes)); }
  if (ano) { sql += ' AND ano=?'; params.push(Number(ano)); }
  const r = dbRun(sql, params);
  res.json({ removidas: r.changes });
});

// ── Logos de Banco ────────────────────────────────────────────────────────────

app.get('/api/bancos/logo/:codigo', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(404).end();
  const banco = dbGet('SELECT logo_path FROM bancos WHERE codigo=?', [req.params.codigo]);
  if (!banco?.logo_path || !fs.existsSync(banco.logo_path)) return res.status(404).end();
  const ext = path.extname(banco.logo_path).toLowerCase();
  const mimes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
  res.setHeader('Content-Type', mimes[ext] || 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(fs.readFileSync(banco.logo_path));
});

app.post('/api/bancos/logo/:codigo', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { data_base64, mime } = req.body;
  if (!data_base64) return res.status(400).json({ error: 'Dados inválidos' });

  const logosDir = path.join(USER_DATA, 'logos');
  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

  const extMap = { 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };
  const ext = extMap[mime] || '.jpg';
  const filename = `banco_${req.params.codigo.replace(/[^a-z0-9]/gi, '_')}${ext}`;
  const logoPath = path.join(logosDir, filename);

  const banco = dbGet('SELECT logo_path FROM bancos WHERE codigo=?', [req.params.codigo]);
  if (banco?.logo_path && fs.existsSync(banco.logo_path)) {
    try { fs.unlinkSync(banco.logo_path); } catch {}
  }

  fs.writeFileSync(logoPath, Buffer.from(data_base64, 'base64'));
  dbRun('UPDATE bancos SET logo_path=? WHERE codigo=?', [logoPath, req.params.codigo]);
  res.json({ ok: true });
});

// ── Anexos ────────────────────────────────────────────────────────────────────

app.get('/api/anexos', async (req, res) => {
  const d = await getDb(); if (!d) return res.json([]);
  const { extrato_id } = req.query;
  if (!extrato_id) return res.status(400).json({ error: 'extrato_id obrigatório' });
  res.json(dbAll('SELECT id, extrato_id, nome, mime, criado_em FROM anexos WHERE extrato_id=?', [extrato_id]));
});

app.post('/api/anexos', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { extrato_id, nome, data_base64, mime } = req.body;
  if (!extrato_id || !data_base64) return res.status(400).json({ error: 'Dados inválidos' });

  const anexosDir = path.join(USER_DATA, 'anexos');
  if (!fs.existsSync(anexosDir)) fs.mkdirSync(anexosDir, { recursive: true });

  const ext = (nome.split('.').pop() || 'bin').toLowerCase();
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const caminho = path.join(anexosDir, filename);
  fs.writeFileSync(caminho, Buffer.from(data_base64, 'base64'));

  const agora = new Date().toISOString();
  const r = dbRun('INSERT INTO anexos (extrato_id, nome, caminho, mime, criado_em) VALUES (?,?,?,?,?)',
    [extrato_id, nome, caminho, mime || 'application/octet-stream', agora]);
  res.json({ id: r.lastInsertRowid });
});

app.get('/api/anexos/:id/view', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).end();
  const anexo = dbGet('SELECT * FROM anexos WHERE id=?', [req.params.id]);
  if (!anexo || !fs.existsSync(anexo.caminho)) return res.status(404).end();
  res.setHeader('Content-Type', anexo.mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(anexo.nome)}"`);
  res.send(fs.readFileSync(anexo.caminho));
});

app.delete('/api/anexos/:id', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const anexo = dbGet('SELECT * FROM anexos WHERE id=?', [req.params.id]);
  if (anexo) {
    try { if (fs.existsSync(anexo.caminho)) fs.unlinkSync(anexo.caminho); } catch {}
    dbRun('DELETE FROM anexos WHERE id=?', [req.params.id]);
  }
  res.json({ ok: true });
});

// ── Indicadores ───────────────────────────────────────────────────────────────

app.get('/api/indicadores', async (req, res) => {
  const d = await getDb(); if (!d) return res.json({});
  const { filial_banco_id } = req.query;
  if (!filial_banco_id) return res.status(400).json({ error: 'filial_banco_id obrigatório' });

  const total = dbGet(`SELECT COUNT(*) as total, SUM(CASE WHEN situacao='conciliado' THEN 1 ELSE 0 END) as conciliados FROM extrato WHERE filial_banco_id=?`, [filial_banco_id]);
  const mensal = dbAll(`SELECT mes, ano, COUNT(*) as total, SUM(CASE WHEN situacao='conciliado' THEN 1 ELSE 0 END) as conciliados FROM extrato WHERE filial_banco_id=? GROUP BY ano, mes ORDER BY ano, mes`, [filial_banco_id]);
  const categorias = dbAll(`SELECT DISTINCT categoria_exibida FROM extrato WHERE filial_banco_id=? AND categoria_exibida IS NOT NULL ORDER BY categoria_exibida`, [filial_banco_id]).map(r => r.categoria_exibida);

  res.json({ total, mensal, categorias });
});

// ── Reaplicar matching ────────────────────────────────────────────────────────

app.post('/api/extrato/reaplicar-matching', async (req, res) => {
  const d = await getDb(); if (!d) return res.status(503).json({ error: 'DB não configurado' });
  const { filial_banco_id } = req.body;
  if (!filial_banco_id) return res.status(400).json({ error: 'filial_banco_id obrigatório' });

  const filialRow3 = dbGet('SELECT empresa_id FROM filiais_bancos WHERE id=?', [filial_banco_id]);
  const empId3 = filialRow3 ? filialRow3.empresa_id : null;
  const parametros = dbAll(`SELECT p.*, a.cor_hex FROM parametros p LEFT JOIN agrupamentos a ON a.id=p.agrupamento_id WHERE (p.empresa_id=? OR p.empresa_id IS NULL) AND p.ativo=1`, [empId3]);
  const linhas = dbAll('SELECT id, historico, tipo_transacao FROM extrato WHERE filial_banco_id=?', [filial_banco_id]);

  _db.run('BEGIN');
  for (const linha of linhas) {
    const match = matchLinha(linha.historico, linha.tipo_transacao, parametros);
    _db.run('UPDATE extrato SET parametro_id=?,lancamento_exibido=?,categoria_exibida=?,agrupamento_id=?,cor_hex=? WHERE id=?',
      [match?.id ?? null, match ? formatLancamentos(match.lancamento_contabil) : null, match?.categoria ?? null, match?.agrupamento_id ?? null, match?.cor_hex ?? null, linha.id]);
  }
  _db.run('COMMIT');
  saveDb();
  res.json({ atualizadas: linhas.length });
});

app.listen(PORT, '127.0.0.1', () => console.log(`PowerMeet server na porta ${PORT}`));
