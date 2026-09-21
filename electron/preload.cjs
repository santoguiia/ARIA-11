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

  // Módulo de Licenciamento SaaS Local-First
  license: {
    getStatus: () => ipcRenderer.invoke('license:get-status'),
    getMachineId: () => ipcRenderer.invoke('license:get-machine-id'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    heartbeat: () => ipcRenderer.invoke('license:heartbeat')
  },

  // Módulo de LLM Local Embutida (Qwen2.5-1.5B via node-llama-cpp)
  llm: {
    generateJustification: (params) => ipcRenderer.invoke('llm:generate-justification', params),
    draftMinuta: (params) => ipcRenderer.invoke('llm:draft-minuta', params),
    getStatus: () => ipcRenderer.invoke('llm:get-status'),
    unload: () => ipcRenderer.invoke('llm:unload')
  }
});
