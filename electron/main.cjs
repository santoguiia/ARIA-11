const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { LocalLLMEngine } = require('./llmEngine.cjs');
const { LicenseManager } = require('./licenseManager.cjs');

/**
 * ARIA Desktop - Shell Electron para Windows 10/11 (x64)
 * Projeto PoC REF-11 / INE5448 - UFSC
 * Suporte nativo a LLM Local Qwen2.5-1.5B e Licenciamento SaaS Local-First
 */

let mainWindow;
let llmEngine;
let licenseManager;

/**
 * Constrói o Menu de Aplicação Nativo do Windows.
 * Com 'autoHideMenuBar: true', o Windows mantém o menu oculto por padrão
 * e exibe a barra nativa do sistema operacional ao pressionar a tecla ALT.
 */
function buildApplicationMenu(win) {
  const isMac = process.platform === 'darwin';

  const template = [
    {
      label: '&Arquivo',
      submenu: [
        {
          label: 'Novo Assento / Reiniciar Caso',
          accelerator: 'CmdOrCtrl+N',
          click: () => win && win.webContents.send('menu-action', 'reset-scenario')
        },
        { type: 'separator' },
        {
          label: 'Cenários de Teste (PoC)',
          submenu: [
            {
              label: 'Caso 1: Óbito Consistente e Fluido (Carlos Eduardo)',
              click: () => win && win.webContents.send('menu-action', 'select-scenario', 'CASO_1_NORMAL')
            },
            {
              label: 'Caso 2: Divergência Crítica de Identidade (Mariana Alves)',
              click: () => win && win.webContents.send('menu-action', 'select-scenario', 'CASO_2_DIVERGENCIA_CRITICA')
            },
            {
              label: 'Caso 3: Divergência Cadastral e Cronológica (Sebastião)',
              click: () => win && win.webContents.send('menu-action', 'select-scenario', 'CASO_3_DIVERGENCIA_LEVE')
            },
            {
              label: 'Caso 4: Registro Extemporâneo e Causa Violenta (Juliana)',
              click: () => win && win.webContents.send('menu-action', 'select-scenario', 'CASO_4_EXTEMPORANEO_VIOLENTA')
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Exportar Laudo Oficial CNJ (.pdf)...',
          accelerator: 'CmdOrCtrl+P',
          click: () => win && win.webContents.send('menu-action', 'open-cnj-report')
        },
        {
          label: 'Exportar Trilha de Auditoria SHA-256 (.json)...',
          accelerator: 'CmdOrCtrl+S',
          click: () => win && win.webContents.send('menu-action', 'export-audit-json')
        },
        {
          label: 'Exportar Laudo Técnico (.txt)...',
          click: () => win && win.webContents.send('menu-action', 'export-report-txt')
        },
        { type: 'separator' },
        {
          label: 'Bloquear Estação de Trabalho',
          accelerator: 'CmdOrCtrl+L',
          click: () => win && win.webContents.send('menu-action', 'logout')
        },
        {
          label: 'Sair do ARIA Desktop',
          accelerator: isMac ? 'Cmd+Q' : 'Alt+F4',
          role: 'quit'
        }
      ]
    },
    {
      label: '&Quality Gate',
      submenu: [
        {
          label: 'Reavaliar Regras Determinísticas',
          accelerator: 'F5',
          click: () => win && win.webContents.send('menu-action', 'trigger-reevaluate')
        },
        { type: 'separator' },
        {
          label: 'Visualizar Minuta do Assento de Óbito',
          accelerator: 'CmdOrCtrl+M',
          click: () => win && win.webContents.send('menu-action', 'open-certificate')
        },
        {
          label: 'Inspecionar Evidências OCR da D.O.',
          accelerator: 'CmdOrCtrl+O',
          click: () => win && win.webContents.send('menu-action', 'open-ocr')
        }
      ]
    },
    {
      label: '&Segurança',
      submenu: [
        {
          label: 'Barramentos Federados & mTLS ICP-Brasil...',
          accelerator: 'CmdOrCtrl+T',
          click: () => win && win.webContents.send('menu-action', 'open-mtls')
        },
        {
          label: 'Trilha de Auditoria Criptográfica...',
          click: () => win && win.webContents.send('menu-action', 'open-audit')
        }
      ]
    },
    {
      label: '&Licença',
      submenu: [
        {
          label: 'Gerenciar Licença SaaS Local-First...',
          accelerator: 'CmdOrCtrl+K',
          click: () => win && win.webContents.send('menu-action', 'open-license')
        }
      ]
    },
    {
      label: '&Exibir',
      submenu: [
        {
          label: 'Alternar Modo Escuro / Claro',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => win && win.webContents.send('menu-action', 'toggle-theme')
        },
        { type: 'separator' },
        { label: 'Recarregar', role: 'reload' },
        { label: 'Forçar Recarregamento', role: 'forceReload' },
        {
          label: 'Alternar Ferramentas do Desenvolvedor',
          accelerator: 'F12',
          role: 'toggleDevTools'
        },
        { type: 'separator' },
        { label: 'Alternar Tela Cheia', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'A&juda',
      submenu: [
        {
          label: 'Guia de Empacotamento Windows (.EXE)...',
          accelerator: 'F2',
          click: () => win && win.webContents.send('menu-action', 'open-packager')
        },
        {
          label: 'Sobre o ARIA Desktop...',
          accelerator: 'F1',
          click: () => win && win.webContents.send('menu-action', 'open-about')
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');
  const windowConfig = {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ARIA - Assistente de Pré-Lavratura e Quality Gate para Atos de Óbito',
    backgroundColor: '#020617',
    frame: true,
    // autoHideMenuBar: true no Windows oculta a barra e a exibe nativamente ao pressionar ALT
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      webSecurity: false // Impede bloqueio de CORS em módulos ES locais sob o protocolo file:// no Windows
    }
  };

  if (fs.existsSync(iconPath)) {
    windowConfig.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowConfig);

  // Configura o Menu de Aplicação nativo do Windows
  const appMenu = buildApplicationMenu(mainWindow);
  Menu.setApplicationMenu(appMenu);

  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  const hasDist = fs.existsSync(distHtmlPath);

  // Estratégia de Execução Local-First Desktop:
  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (hasDist) {
    mainWindow.loadFile(distHtmlPath);
  } else {
    mainWindow.loadURL('http://localhost:3000').catch((err) => {
      console.warn('Dev server http://localhost:3000 não acessível:', err.message);
      const fallbackHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ARIA Desktop - Inicialização</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #020617; color: #f8fafc; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center; }
            h1 { font-size: 22px; color: #38bdf8; margin-bottom: 12px; }
            p { font-size: 14px; color: #94a3b8; max-width: 580px; line-height: 1.6; }
            code { background: #1e293b; padding: 3px 8px; border-radius: 4px; color: #f59e0b; font-family: monospace; font-size: 13px; }
            .btn { margin-top: 24px; padding: 10px 20px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
            .btn:hover { background: #0369a1; }
          </style>
        </head>
        <body>
          <h1>ARIA Desktop - Compilação Local Necessária</h1>
          <p>Os arquivos estáticos de produção não foram localizados em <code>dist/index.html</code> e o servidor de desenvolvimento não está ativo na porta 3000.</p>
          <p>Para executar no Windows, execute no terminal:</p>
          <p><code>npm run build</code> e em seguida <code>npm run electron:dev</code></p>
          <button class="btn" onclick="location.reload()">Tentar Novamente</button>
        </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
    });
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.warn(`ARIA: Falha ao carregar ${validatedURL} [${errorCode}: ${errorDescription}]`);
    if (fs.existsSync(distHtmlPath) && !validatedURL.includes('index.html')) {
      mainWindow.loadFile(distHtmlPath);
    }
  });

  // F12 para DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicialização dos motores principais
app.whenReady().then(() => {
  // 1. Motor de Licenciamento SaaS Local-First
  licenseManager = new LicenseManager(app);
  licenseManager.initStartupValidation();

  // 2. Motor de LLM/VLM Multimodal (Qwen2-VL com mmproj via llama.exe)
  llmEngine = new LocalLLMEngine(app);
  llmEngine.ensureServerRunning().catch((err) => {
    console.warn('[ARIA LLM] Aviso na inicialização do servidor:', err.message);
  });

  createWindow();
});

// ==========================================
// IPC Handlers: Licenciamento SaaS & Feature Flags
// ==========================================

ipcMain.handle('license:get-status', async () => {
  if (!licenseManager) return { isValid: false, tier: 'BASIC' };
  return licenseManager.getStatus();
});

ipcMain.handle('license:get-machine-id', async () => {
  if (!licenseManager) return { deviceHash: 'UNKNOWN', hwidFormatted: 'HWID-UNKNOWN' };
  return {
    deviceHash: licenseManager.deviceHash,
    hwidFormatted: licenseManager.hwidFormatted
  };
});

ipcMain.handle('license:activate', async (event, licenseKey) => {
  if (!licenseManager) return { success: false, message: 'Gerenciador de licenças inativo.' };
  return licenseManager.activateLicenseKey(licenseKey);
});

ipcMain.handle('license:heartbeat', async () => {
  if (!licenseManager) return { success: false };
  return licenseManager.executeHeartbeat();
});

// ==========================================
// IPC Handlers: LLM Local On-Device (Qwen2.5-1.5B)
// ==========================================

ipcMain.handle('llm:generate-justification', async (event, params) => {
  // Verificação estrita de Feature Flag de Licenciamento
  if (!licenseManager || !licenseManager.canUseLocalLLM()) {
    return {
      success: false,
      error: 'UPGRADE_REQUIRED',
      requiredTier: 'PRO_AI',
      message: 'Acesso bloqueado: O Copiloto LLM Local Qwen2.5 requer a licença Pro AI ou superior.'
    };
  }

  if (!llmEngine) {
    return { success: false, message: 'Motor LLM não inicializado.' };
  }

  return await llmEngine.generateJustification(params);
});

ipcMain.handle('llm:draft-minuta', async (event, params) => {
  // Verificação estrita de Feature Flag de Licenciamento
  if (!licenseManager || !licenseManager.canUseLocalLLM()) {
    return {
      success: false,
      error: 'UPGRADE_REQUIRED',
      requiredTier: 'PRO_AI',
      message: 'Acesso bloqueado: A geração de minuta com IA Local requer a licença Pro AI ou superior.'
    };
  }

  if (!llmEngine) {
    return { success: false, message: 'Motor LLM não inicializado.' };
  }

  return await llmEngine.draftMinuta(params);
});

ipcMain.handle('llm:get-status', async () => {
  if (!llmEngine) return { isLoaded: false };
  return llmEngine.getStatus();
});

ipcMain.handle('llm:process-ocr', async (event, params) => {
  if (!llmEngine) {
    return { success: false, message: 'Motor multimodal LLM não inicializado.' };
  }
  try {
    return await llmEngine.processOCR(params);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('llm:unload', async () => {
  if (!llmEngine) return { success: false };
  await llmEngine.shutdown();
  return { success: true };
});

// ==========================================
// IPC Handlers: Barramentos Federados & mTLS
// ==========================================

ipcMain.handle('test-mtls-handshake', async (event, busId) => {
  // Verificação de Feature Flag Enterprise
  if (!licenseManager || !licenseManager.canUseFederatedMtls()) {
    return {
      success: false,
      error: 'UPGRADE_REQUIRED',
      requiredTier: 'ENTERPRISE_MTLS',
      message: 'Acesso bloqueado: A sincronização via mTLS com barramentos federados (CRC/SIRC/ONR) exige a licença Enterprise.'
    };
  }

  return {
    success: true,
    busId,
    timestamp: new Date().toISOString(),
    tlsVersion: 'TLSv1.3 (mTLS Bidirecional)',
    cipher: 'TLS_AES_256_GCM_SHA384',
    clientCert: '1º OFÍCIO DE REGISTRO CIVIL E TABELIONATO (ICP-Brasil A1/A3)',
    caCert: 'AC NOTARIAL v5 / ICP-Brasil',
    handshakeDurationMs: Math.floor(Math.random() * 30) + 25,
    ocspStatus: 'VÁLIDO / NÃO REVOGADO',
    licenseTier: 'ENTERPRISE_MTLS'
  };
});

// ==========================================
// IPC Handlers: Auditoria e Laudo Técnico
// ==========================================

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

ipcMain.handle('get-node-status', async () => {
  const licStatus = licenseManager ? licenseManager.getStatus() : null;
  const llmStatus = llmEngine ? llmEngine.getStatus() : null;

  return {
    isDesktop: true,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    localFirstEngine: 'OPA / Rego Determinístico (Local Edge)',
    localDb: 'SQLite On-Premise Encrypted (AES-256-GCM)',
    ledger: 'SHA-256 Encadeado Local',
    license: licStatus,
    llm: llmStatus
  };
});

app.on('before-quit', () => {
  if (llmEngine) {
    llmEngine.shutdown();
  }
});

app.on('window-all-closed', () => {
  if (llmEngine) {
    llmEngine.shutdown();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
