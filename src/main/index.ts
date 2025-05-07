import { app, shell, BrowserWindow, ipcMain, powerSaveBlocker } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { createWindow } from './windows';
import { setupWalletHandlers } from './ipcHandlers/wallet.handler';

// Variable to store the power save blocker ID
let powerSaveBlockerId: number = -1;

// Add IPC handlers for power management
ipcMain.handle('start-power-save-blocker', () => {
  if (powerSaveBlockerId === -1) {
    // Prevent app suspension and display sleep
    powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  }
  return { success: true, id: powerSaveBlockerId };
});

ipcMain.handle('stop-power-save-blocker', () => {
  if (powerSaveBlockerId !== -1) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = -1;
  }
  return { success: true };
});

app.whenReady().then(() => {
  const mainWindow = createWindow();
  electronApp.setAppUserModelId('com.electron.2in1');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC handlers
  setupWalletHandlers(mainWindow);

  // Create a keep-alive interval to prevent the app from being suspended
  const keepAliveInterval = setInterval(() => {
    if (!mainWindow.isDestroyed()) {
      console.log('Keep-alive ping');
    } else {
      clearInterval(keepAliveInterval);
    }
  }, 30000); // 30 seconds

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Stop power save blocker when all windows are closed
  if (powerSaveBlockerId !== -1) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = -1;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
