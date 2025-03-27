// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

try {
  require('electron-reloader')(module, {
    // Specify which directories to watch for changes
    watchRenderer: true,   // Watch renderer process files
    ignore: [
      'node_modules/**', 
      'src/static/assets/**', // Ignore asset files if you have them
    ]
  });
  console.log('Hot reload enabled');
} catch (err) {
  console.error('Error setting up hot reload:', err);
}


let mainWindow;

function createWindow() {
  
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    transparent: true,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '..','main', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true 
    }
  });

  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.loadFile(path.join(__dirname, '..', 'static', 'index.html'));

}



app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle file dialog
ipcMain.handle('dialog:openFile', async () => {
  
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }
      ]
    });
    
    
    if (result.canceled) {
      return null;
    } else {
      return result.filePaths[0];
    }
  } catch (error) {
    console.error('Error opening file dialog:', error);
    return null;
  }
});

// Window control handlers
ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow && mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else if (mainWindow) {
    mainWindow.maximize();
  }
});