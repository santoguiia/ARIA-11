const { contextBridge, ipcRenderer } = require('electron');

/**
 * ARIA Desktop - Preload Bridge
 * Expõe APIs seguras para o frontend React no ambiente desktop Windows
 */
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  saveAuditLog: (data) => ipcRenderer.invoke('save-audit-log', data),
  saveReportTxt: (text) => ipcRenderer.invoke('save-report-txt', text),
  testMtlsHandshake: (busId) => ipcRenderer.invoke('test-mtls-handshake', busId),
  getNodeStatus: () => ipcRenderer.invoke('get-node-status'),

  // Canal de eventos do Menu Nativo do Windows (disparado ao pressionar Alt e clicar nos itens)
  onMenuAction: (callback) => {
    const handler = (_event, action, data) => callback(action, data);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  },

  // Módulo de Licenciamento SaaS Local-First
  license: {
    getStatus: () => ipcRenderer.invoke('license:get-status'),
    getMachineId: () => ipcRenderer.invoke('license:get-machine-id'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    heartbeat: () => ipcRenderer.invoke('license:heartbeat')
  },

  // Módulo de LLM/VLM Local Embutida (Qwen2-VL-2B Multimodal via llama.exe)
  llm: {
    processOCR: (params) => ipcRenderer.invoke('llm:process-ocr', params),
    generateJustification: (params) => ipcRenderer.invoke('llm:generate-justification', params),
    draftMinuta: (params) => ipcRenderer.invoke('llm:draft-minuta', params),
    getStatus: () => ipcRenderer.invoke('llm:get-status'),
    unload: () => ipcRenderer.invoke('llm:unload')
  }
});
