/**
 * preload.js — Ponte segura entre o processo principal (Node) e o renderer (browser)
 *
 * Expõe APENAS o que o renderer precisa, sem vazar APIs do Node.
 * contextIsolation: true garante que window.electronAPI seja a única
 * superfície de comunicação.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Consulta o status da licença
   * @returns {Promise<{ licensed: boolean, machineId: string }>}
   */
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),

  /**
   * Tenta ativar o software com uma chave
   * @param {string} key
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
});
