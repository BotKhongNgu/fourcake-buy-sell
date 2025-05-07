// Define the standard response type
interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}

interface Window {
  api: {
    createWallet: (
      recoveryPhrase: string
    ) => Promise<StandardResponse<{ privateKey: string; address: string }>>;
    startBot: (accounts: any[], tokenAddress: string) => Promise<StandardResponse>;
    stopBot: () => Promise<StandardResponse>;
    addLog: (message: string) => Promise<StandardResponse>;
    onLog: (callback: (message: string) => void) => () => void;
    onUpdateAccountStatus: (callback: (data: { id: number; status: string }) => void) => () => void;
    checkIpcStatus: () => { available: boolean; message: string };

    // Power management APIs
    startPowerSaveBlocker: () => Promise<{ success: boolean; id: number }>;
    stopPowerSaveBlocker: () => Promise<{ success: boolean }>;
  };
  electron: {
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
    };
  };
}
