const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow; // Déclaration globale

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1728,
    height: 969,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();
};

// Gestion du changement de page via IPC
ipcMain.on('navigate-to', (event, page) => {
  if (mainWindow) {
    mainWindow.loadFile(`src/${page}.html`);
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
