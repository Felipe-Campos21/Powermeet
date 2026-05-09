let _setupPath = '';

async function setupChooseFolder() {
  const folder = await window.electron.chooseDbFolder();
  if (!folder) return;
  _setupPath = folder;
  document.getElementById('setup-db-path').value = folder;
  document.getElementById('setup-confirm').disabled = false;
}

async function setupConfirm() {
  if (!_setupPath) return;
  const r = await api.post('/api/config', { dbPath: _setupPath });
  if (r.ok) {
    document.getElementById('setup-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    App._setupNav();
    toast('Banco de dados configurado! Bem-vindo ao PowerMeet.', 'success');
    await App.navigate('conciliacao');
  } else {
    toast('Erro ao configurar: ' + r.error, 'error');
  }
}
