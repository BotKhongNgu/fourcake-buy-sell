export interface Log {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  message: string;
}

export interface Settings {
  tokenAddress: string;
  waitFrom: number;
  waitTo: number;
}

export interface Account {
  id: number;
  privateKey: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  balance: number;
  address: string;
  isActive: number;
  type: 'buy' | 'sell';
  status: 'placing' | 'pending' | 'failed';
  amount: number;
  waitFrom: number;
  waitTo: number;
  bnbBalance: number;
  tokenBalance: number;
  tokenAddress: string;
  sortOrder: number;
}

export interface StartBotParams {
  accounts: Account[];
  tokenAddress: string;
  waitFrom: number;
  waitTo: number;
}
