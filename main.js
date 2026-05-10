const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path    = require('path');
const { spawn, execSync } = require('child_process');
const fs      = require('fs');

let mainWindow;
let serverProcess;
const PORT = 5100;

function mataServidorAntigo() {
  try {
    execSync(
      `powershell -WindowStyle Hidden -Command "Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore', windowsHide: true }
    );
  } catch (_) {}
}

function startServer() {
  const serverPath  = path.join(__dirname, 'server', 'server.js');
  const userDataPath = app.getPath('userData');

  // spawn sem abrir nenhuma janela de console
  serverProcess = spawn('node', [serverPath], {
    detached:    true,
    windowsHide: true,
    stdio:       'ignore',
    env: { ...process.env, USER_DATA: userDataPath, PORT: String(PORT) },
  });
  serverProcess.unref();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1440,
    height:   900,
    minWidth: 1100,
    minHeight:700,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    title:           'PowerMeet',
    icon:            path.join(__dirname, 'powermeet.ico'),
    show:            false,
    backgroundColor: '#0a0a14',
    frame:           true,
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });
}

ipcMain.handle('choose-db-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:      'Escolha onde salvar o banco de dados do PowerMeet',
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-port', () => PORT);

app.whenReady().then(() => {
  mataServidorAntigo();
  startServer();
  // Aguarda 2s para o sql.js (WASM) inicializar antes de abrir a janela
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try { process.kill(-serverProcess.pid); } catch (_) {}
  }
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -ano ^| findstr ":${PORT} " ^| findstr "LISTENING"') do taskkill /F /PID %a`,
      { shell: true, stdio: 'ignore', windowsHide: true }
    );
  } catch (_) {}
  app.quit();
});
