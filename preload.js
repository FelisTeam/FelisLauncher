const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    loadSettings: () => ipcRenderer.send('load-settings'),
    selectMinecraftDir: () => ipcRenderer.send('select-minecraft-dir'),
    fetchVersions: (minecraftDir) => ipcRenderer.send('fetch-versions', minecraftDir),
    downloadVersion: (data) => ipcRenderer.send('download-version', data),
    launchMinecraft: (data) => ipcRenderer.send('launch-minecraft', data),
    authenticate: (data) => ipcRenderer.send('authenticate', data),
    onSettingsLoaded: (callback) => ipcRenderer.on('settings-loaded', (event, settings) => callback(settings)),
    onMinecraftDirSelected: (callback) => ipcRenderer.on('minecraft-dir-selected', (event, dir) => callback(dir)),
    onVersionsFetched: (callback) => ipcRenderer.on('versions-fetched', (event, data) => callback(data)),
    onRefreshVersions: (callback) => ipcRenderer.on('refresh-versions', (event) => callback()),
    onLaunchStatus: (callback) => ipcRenderer.on('launch-status', (event, message) => callback(message)),
    onAuthSuccess: (callback) => ipcRenderer.on('auth-success', (event, data) => callback(data)),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
    onLaunchProgress: (callback) => ipcRenderer.on('launch-progress', (event, data) => callback(data))
});