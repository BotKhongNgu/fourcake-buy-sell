export interface Log {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  message: string;
}

export interface Settings {
  key: string;
  value: string;
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
