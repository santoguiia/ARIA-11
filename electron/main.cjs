const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * ARIA Desktop - Shell Electron para Windows 10/11 (x64)
 * Projeto PoC REF-11 / INE5448 - UFSC
 */

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ARIA - Assistente de Pré-Lavratura e Quality Gate para Atos de Óbito',
    backgroundColor: '#020617',
    icon: path.join(__dirname, 'icon.ico'),
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers para persistência local em SQLite / JSON e exportação de relatórios
ipcMain.handle('save-audit-log', async (event, logData) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Trilha de Auditoria ARIA',
    defaultPath: `ARIA_Auditoria_${Date.now()}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(logData, null, 2), 'utf-8');
    return { success: true, path: filePath };
  }
  return { success: false };
});

ipcMain.handle('save-report-txt', async (event, textContent) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Laudo Técnico de Quality Gate',
    defaultPath: `ARIA_Laudo_Conformidade_${Date.now()}.txt`,
    filters: [{ name: 'Text Documents', extensions: ['txt'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, textContent, 'utf-8');
    return { success: true, path: filePath };
  }
  return { success: false };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
