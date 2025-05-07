import Dexie, { Table } from 'dexie';

export interface Account {
  id: number;
  privateKey: string;
  createdAt: Date;
  updatedAt: Date;
  address: string;
  isActive: number;
  type: string;
  status: 'placing' | 'pending' | 'failed';
  amountIn: number;
  unit: 'percent' | 'value';
  bnbBalance: number;
  tokenBalance: number;
  tokenAddress: string;
  sortOrder: number;
  name: string;
  cycle: number;
  currentCycle: number;
}

export interface Log {
  id?: number;
  createdAt: Date;
  updatedAt: Date;
  message: string;
}

export interface Setting {
  key: string;
  value: any;
}

export class MySubClassedDexie extends Dexie {
  accounts!: Table<Account>;
  logs!: Table<Log>;
  settings!: Table<Setting>;

  constructor() {
    super('2in1-bot');
    this.version(1).stores({
      accounts: '++id, address, type, amountIn, status, isActive, sortOrder, name',
      logs: '++id, createdAt',
      settings: 'key'
    });
  }
}

export const db = new MySubClassedDexie();
