# FourCake Buy/Sell Bot

A desktop application built with Electron, React, and TypeScript for automated token trading on four.meme and PancakeSwap platforms.

## Features

- **Multi-Wallet Support**: Manage multiple wallets for trading operations
- **Dual Platform Trading**: Trade tokens on both four.meme and PancakeSwap
- **Token Management**: Support for both TokenManager V1 and V2 protocols
- **Automated Trading**: Set up automated buy/sell operations with customizable parameters
- **Background Processing**: Prevents system sleep during critical operations
- **Local Database**: Securely stores wallet and transaction information locally

## Technology Stack

- **Frontend**: React, TypeScript, Ant Design
- **Backend**: Electron, Node.js
- **Blockchain Interaction**: Web3.js, Ethers.js
- **Database**: Dexie.js (IndexedDB wrapper)
- **Build Tools**: Electron Vite, Electron Builder

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fourcake-buy-sell.git
   cd fourcake-buy-sell
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

### Windows
```bash
npm run build:win
```

### macOS
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

## Usage

1. **Adding Wallets**: Add wallets using private keys or recovery phrases
2. **Setting Token Address**: Enter the token address you want to trade
3. **Configure Trading Parameters**: Set amount, slippage, and timing parameters
4. **Start Trading**: Initiate automated trading with the configured wallets

## Supported Networks

- Binance Smart Chain (BSC)

## Supported Protocols

### four.meme
- TokenManager V1 (tokens created before September 5, 2024)
- TokenManager V2 (tokens created after September 5, 2024)

### PancakeSwap
- Standard DEX trading functionality

## Development

### Project Structure

```
fourcake-buy-sell/
├── src/
│   ├── main/           # Electron main process
│   │   ├── ipcHandlers/  # IPC communication handlers
│   │   └── windows.ts    # Window management
│   ├── preload/        # Preload scripts for secure IPC
│   ├── renderer/       # React frontend
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── services/    # Service modules
│   │   │   └── App.tsx      # Main application component
│   └── shared/         # Shared types and utilities
├── electron.vite.config.ts  # Electron Vite configuration
└── package.json        # Project dependencies and scripts
```

### Scripts

- `npm run dev`: Start the application in development mode
- `npm run build`: Build the application for production
- `npm run lint`: Run ESLint to check code quality
- `npm run typecheck`: Run TypeScript type checking
- `npm run format`: Format code with Prettier

## Security Notes

- Private keys are encrypted before being stored in the local database
- The application does not transmit private keys over the network
- All blockchain interactions happen locally on your machine

## License

[MIT License](LICENSE)

## Disclaimer

This software is provided for educational and informational purposes only. Trading cryptocurrencies involves significant risk. Use this software at your own risk.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request