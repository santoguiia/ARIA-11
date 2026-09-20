const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o frontend React no ambiente desktop Windows
contextBridge.exposeInMainWorld('electronAPI', {
  saveAuditLog: (data) => ipcRenderer.invoke('save-audit-log', data),
  saveReportTxt: (text) => ipcRenderer.invoke('save-report-txt', text),
  isDesktop: true
});
