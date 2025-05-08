const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const store = new Store();

log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'log.log');
log.info('App starting...');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: store.get('fullscreen', false),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');

  win.on('closed', () => {
    win = null;
  });

  autoUpdater.checkForUpdatesAndNotify();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (win === null) createWindow();
});

autoUpdater.on('update-available', () => {
  log.info('Update available');
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version of FelisLauncher is available. Downloading now...'
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. It will be installed on restart. Restart now?',
    buttons: ['Yes', 'No']
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (error) => {
  log.error('Updater error:', error);
  dialog.showErrorBox('Update Error', 'Failed to check for updates: ' + error.message);
});

ipcMain.handle('minimize', () => {
  win.minimize();
});

ipcMain.handle('close', () => {
  app.quit();
});

ipcMain.handle('toggle-fullscreen', () => {
  const isFullscreen = !win.isFullScreen();
  win.setFullScreen(isFullscreen);
  store.set('fullscreen', isFullscreen);
  return isFullscreen;
});

ipcMain.handle('open-folder', async (event, folder) => {
  const folders = {
    '.minecraft': store.get('minecraftDir', app.getPath('appData') + '/.minecraft'),
    '.FelisLauncher': app.getPath('userData')
  };
  const pathToOpen = folders[folder];
  if (pathToOpen) await shell.openPath(pathToOpen);
});

ipcMain.handle('check-for-update', async () => {
  try {
    const updateCheck = await autoUpdater.checkForUpdates();
    if (!updateCheck.updateInfo) {
      dialog.showMessageBox({
        type: 'info',
        title: 'No Updates',
        message: 'You are using the latest version of FelisLauncher.'
      });
    }
  } catch (error) {
    dialog.showErrorBox('Update Error', 'Failed to check for updates: ' + error.message);
  }
});