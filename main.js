/**
 * main.js — Processo Principal Electron
 */

'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const os     = require('os');

/* ── Segredo embutido (ofuscado) ── */
function _gs() {
  const _d = '6uLy+PTi4PXi4+j49PL34vX49OLk9eLz6PiVl5WS';
  const _k = 0xA7;
  return Buffer.from(_d, 'base64').map(b => b ^ _k).toString();
}
const SHARED_SECRET = _gs();

const LICENSE_FILE  = path.join(app.getPath('userData'), 'license.dat');

function getMachineId() {
  try {
    const { machineIdSync } = require('node-machine-id');
    return machineIdSync({ original: true });
  } catch (_) {
    const raw = [os.hostname(), os.platform(), os.arch(),
      (os.cpus()[0] || {}).model || 'cpu', os.totalmem()].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}

function generateExpectedKey(machineId) {
  return crypto.createHash('sha256')
    .update(machineId + SHARED_SECRET)
    .digest('hex').toUpperCase();
}

function isLicensed() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return false;
    const saved    = fs.readFileSync(LICENSE_FILE, 'utf-8').trim().toUpperCase();
    const expected = generateExpectedKey(getMachineId());
    return saved === expected;
  } catch { return false; }
}

function saveLicense(key) {
  fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
  fs.writeFileSync(LICENSE_FILE, key.trim().toUpperCase(), 'utf-8');
}

let mainWindow;

function createWindow() {
  const machineId = getMachineId();
  const licensed  = isLicensed();

  console.log('\n' + '='.repeat(60));
  console.log('  MACHINE ID  :', machineId);
  console.log('  LICENCIADO  :', licensed);
  console.log('  LICENSE_FILE:', LICENSE_FILE);
  console.log('='.repeat(60) + '\n');

  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 800, minHeight: 600,
    title: 'Sistema de Pedidos',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Assim que a página terminar de carregar, injeta o machineId e status
  // diretamente no DOM — sem depender de IPC assíncrono no renderer
  mainWindow.webContents.on('did-finish-load', () => {
    const mid  = getMachineId();
    const lic  = isLicensed();

    // Escapa aspas para evitar quebra de string JS
    const midSafe = mid.replace(/'/g, "\\'");

    const script = `
      (function() {
        window._machineId = '${midSafe}';
        var el = document.getElementById('lic-machine-id');
        if (el) el.textContent = '${midSafe}';

        if (${lic}) {
          var overlay = document.getElementById('license-overlay');
          if (overlay) overlay.classList.add('hidden');
        }

        console.log('[main→renderer] machineId injetado:', '${midSafe}');
        console.log('[main→renderer] licensed:', ${lic});
      })();
    `;

    mainWindow.webContents.executeJavaScript(script).catch(err => {
      console.error('[did-finish-load] executeJavaScript erro:', err);
    });
  });

  // DevTools — remova antes de distribuir
  //mainWindow.webContents.openDevTools();//

  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC: ativação (ainda usado pelo botão do overlay)
ipcMain.handle('license:activate', (_event, key) => {
  try {
    const machineId = getMachineId();
    const expected  = generateExpectedKey(machineId);
    console.log('[IPC] activate → recebido :', key.trim().toUpperCase().slice(0,16) + '...');
    console.log('[IPC] activate → esperado :', expected.slice(0,16) + '...');

    if (key.trim().toUpperCase() === expected) {
      saveLicense(key);
      console.log('[IPC] Licença salva em:', LICENSE_FILE);
      return { success: true };
    }
    return { success: false, error: 'Chave inválida para esta máquina.' };
  } catch (err) {
    console.error('[IPC] activate ERRO:', err);
    return { success: false, error: 'Erro interno: ' + err.message };
  }
});

// IPC: status (mantido como fallback)
ipcMain.handle('license:status', () => {
  return { licensed: isLicensed(), machineId: getMachineId() };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});