export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Wallet errors
  WALLET_CREATION_ERROR = 'WALLET_CREATION_ERROR',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  // Bot errors
  BOT_ALREADY_RUNNING = 'BOT_ALREADY_RUNNING',
  BOT_NOT_RUNNING = 'BOT_NOT_RUNNING',
  
  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  APPROVAL_FAILED = 'APPROVAL_FAILED',
  
  // Token errors
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  TOKEN_NOT_ON_EXCHANGE = 'TOKEN_NOT_ON_EXCHANGE',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR'
}

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  errorCode?: ErrorCode;
  errorMessage?: string;
}
