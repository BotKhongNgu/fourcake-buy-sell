import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { StandardResponse, ErrorCode } from '../shared/types/errors';

// Thêm hàm kiểm tra trạng thái IPC renderer
const checkIpcStatus = () => {
  try {
    // Nếu đoạn mã này chạy thành công, ipcRenderer vẫn ổn
    return { available: true, message: 'IPC renderer khả dụng' };
  } catch (error: any) {
    return {
      available: false,
      message: 'IPC renderer không khả dụng: ' + (error?.message || 'Lỗi không xác định')
    };
  }
};

// Custom APIs for renderer
const api = {
  createWallet: (recoveryPhrase: string): Promise<StandardResponse> => {
    try {
      return ipcRenderer.invoke(
        'create-wallet',
        recoveryPhrase,
        'recovery'
      ) as Promise<StandardResponse>;
    } catch (error: any) {
      console.error('Lỗi khi gọi createWallet:', error);
      return Promise.resolve({
        success: false,
        errorCode: ErrorCode.WALLET_CREATION_ERROR,
        errorMessage: 'Không thể tạo ví: ' + (error?.message || 'Lỗi không xác định')
      } as StandardResponse);
    }
  },

  // Bot APIs
  startBot: (accounts: any[], tokenAddress: string): Promise<StandardResponse> => {
    try {
      return ipcRenderer.invoke('start-bot', accounts, tokenAddress) as Promise<StandardResponse>;
    } catch (error: any) {
      console.error('Lỗi khi gọi startBot:', error);
      return Promise.resolve({
        success: false,
        errorCode: ErrorCode.BOT_NOT_RUNNING,
        errorMessage: 'Không thể bắt đầu bot: ' + (error?.message || 'Lỗi không xác định')
      } as StandardResponse);
    }
  },

  stopBot: (): Promise<StandardResponse> => {
    try {
      return ipcRenderer.invoke('stop-bot') as Promise<StandardResponse>;
    } catch (error: any) {
      console.error('Lỗi khi gọi stopBot:', error);
      return Promise.resolve({
        success: false,
        errorCode: ErrorCode.UNKNOWN_ERROR,
        errorMessage: 'Không thể dừng bot: ' + (error?.message || 'Lỗi không xác định')
      } as StandardResponse);
    }
  },

  addLog: (message: string): Promise<StandardResponse> => {
    try {
      return ipcRenderer.invoke('add-log', message) as Promise<StandardResponse>;
    } catch (error: any) {
      console.error('Lỗi khi gọi addLog:', error);
      return Promise.resolve({
        success: false,
        errorCode: ErrorCode.UNKNOWN_ERROR,
        errorMessage: 'Không thể thêm log: ' + (error?.message || 'Lỗi không xác định')
      } as StandardResponse);
    }
  },

  // Listeners
  onLog: (callback: (message: string) => void) => {
    try {
      const handler = (_: any, message: string) => {
        try {
          callback(message);
        } catch (error) {
          console.error('Lỗi trong callback onLog:', error);
        }
      };

      ipcRenderer.on('log', handler);

      return () => {
        try {
          ipcRenderer.removeListener('log', handler);
        } catch (error) {
          console.error('Lỗi khi hủy đăng ký onLog listener:', error);
        }
      };
    } catch (error) {
      console.error('Lỗi khi đăng ký onLog listener:', error);
      // Trả về một hàm noop để tránh lỗi khi gọi
      return () => {};
    }
  },

  onUpdateAccountStatus: (callback: (data: { id: number; status: string }) => void) => {
    try {
      const handler = (_: any, data: { id: number; status: string }) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Lỗi trong callback onUpdateAccountStatus:', error);
        }
      };

      ipcRenderer.on('update-account-status', handler);

      return () => {
        try {
          ipcRenderer.removeListener('update-account-status', handler);
        } catch (error) {
          console.error('Lỗi khi hủy đăng ký onUpdateAccountStatus listener:', error);
        }
      };
    } catch (error) {
      console.error('Lỗi khi đăng ký onUpdateAccountStatus listener:', error);
      // Trả về một hàm noop để tránh lỗi khi gọi
      return () => {};
    }
  },

  // Power management APIs
  startPowerSaveBlocker: () => ipcRenderer.invoke('start-power-save-blocker'),
  stopPowerSaveBlocker: () => ipcRenderer.invoke('stop-power-save-blocker'),

  // Thêm phương thức kiểm tra trạng thái IPC
  checkIpcStatus
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error('Lỗi khi expose APIs:', error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
