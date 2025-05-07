import { BrowserWindow, ipcMain } from 'electron';
import WalletManager from '../wallet';
import { Web3 } from 'web3';
import config from '../config';
import { encryptPrivateKey, decryptPrivateKey } from '../../shared/utils/crypto';
import { ErrorCode, StandardResponse } from '../../shared/types/errors';

// ABI cho ERC20 token
const ERC20_ABI = [
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable'
  },
  {
    name: 'swapTokensForExactETH',
    type: 'function',
    inputs: [
      {
        name: 'amountOut',
        type: 'uint256'
      },
      {
        name: 'amountInMax',
        type: 'uint256'
      },
      {
        name: 'path',
        type: 'address[]'
      },
      {
        name: 'to',
        type: 'address'
      },
      {
        name: 'deadline',
        type: 'uint256'
      }
    ],
    outputs: [
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  }
];

// Hằng số cho MAX_UINT256
const MAX_UINT256 =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

// Hàm tiện ích để thêm timeout cho các lời gọi promise
const withTimeout = async (promise, timeoutMs, errorMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage || `Quá thời gian chờ sau ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Hàm kiểm tra lỗi nonce
const isNonceError = (errorMessage: string): boolean => {
  return (
    errorMessage.includes('nonce') ||
    errorMessage.includes('replacement transaction underpriced') ||
    errorMessage.includes('already known') ||
    errorMessage.includes('transaction with same hash was already imported') ||
    errorMessage.includes('known transaction')
  );
};

// Hàm chờ với độ trễ tăng dần
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export function setupWalletHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('create-wallet', async (_, key: string, type: 'recovery' | 'privateKey') => {
    try {
      const walletManager = new WalletManager();
      const wallet =
        type === 'recovery'
          ? await walletManager.createWalletFromSeed(key)
          : await walletManager.createWalletFromPrivateKey(key);

      // Mã hóa private key trước khi trả về
      return {
        success: true,
        data: {
          privateKey: encryptPrivateKey(wallet.privateKey),
          address: wallet.address
        }
      } as StandardResponse;
    } catch (error: any) {
      console.error('Lỗi khi tạo ví:', error);
      return {
        success: false,
        errorCode: ErrorCode.WALLET_CREATION_ERROR,
        errorMessage: error.message || 'Lỗi không xác định khi tạo ví'
      } as StandardResponse;
    }
  });

  // Thêm handlers xử lý cho 'start-bot' và 'stop-bot'
  let botRunning = false;

  ipcMain.handle('start-bot', async () => {
    try {
      if (botRunning) {
        return {
          success: false,
          errorCode: ErrorCode.BOT_ALREADY_RUNNING,
          errorMessage: 'Bot đã đang chạy'
        } as StandardResponse;
      }

      botRunning = true;

      return { success: true } as StandardResponse;
    } catch (error: any) {
      botRunning = false;
      console.error('Lỗi khi bắt đầu bot:', error);
      return {
        success: false,
        errorCode: ErrorCode.UNKNOWN_ERROR,
        errorMessage: error.message || 'Lỗi không xác định khi bắt đầu bot'
      } as StandardResponse;
    }
  });

  ipcMain.handle('stop-bot', async () => {
    try {
      botRunning = false;

      return { success: true } as StandardResponse;
    } catch (error: any) {
      console.error('Lỗi khi dừng bot:', error);
      return {
        success: false,
        errorCode: ErrorCode.UNKNOWN_ERROR,
        errorMessage: error.message || 'Lỗi không xác định khi dừng bot'
      } as StandardResponse;
    }
  });

  // Thêm handler cho 'add-log'
  ipcMain.handle('add-log', async (_, message) => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log', message);
      }
      return { success: true } as StandardResponse;
    } catch (error: any) {
      console.error('Lỗi khi thêm log:', error);
      return {
        success: false,
        errorCode: ErrorCode.UNKNOWN_ERROR,
        errorMessage: error.message || 'Lỗi không xác định khi thêm log'
      } as StandardResponse;
    }
  });

  ipcMain.handle(
    'get-balance',
    async (
      _,
      encryptedPrivateKey: string,
      tokenAddress: string,
      networkType: 'MAINNET' | 'TESTNET'
    ) => {
      try {
        const privateKey = decryptPrivateKey(encryptedPrivateKey);

        // Tạo Web3 instance với timeout
        const web3 = new Web3(config[networkType].BSC_NODE_URL);

        // Thiết lập timeout cho các request
        web3.eth.transactionBlockTimeout = config.WEB3_TIMEOUT;
        web3.eth.transactionPollingTimeout = config.WEB3_TIMEOUT;
        web3.eth.handleRevert = true;

        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
        let bnbBalance = BigInt(0);
        let tokenBalance = BigInt(0);
        try {
          bnbBalance = await withTimeout(
            web3.eth.getBalance(account.address),
            config.WEB3_TIMEOUT,
            'Quá thời gian chờ khi lấy số dư ví'
          );
        } catch (error) {
          console.warn('Lỗi khi lấy số dư BNB:', error);
        }
        try {
          // Lấy số dư token
          tokenBalance = await withTimeout(
            tokenContract.methods.balanceOf(account.address).call(),
            config.WEB3_TIMEOUT,
            'Quá thời gian chờ khi lấy số dư token'
          );
        } catch (error) {
          console.warn('Lỗi khi lấy số dư token:', error);
        }

        return {
          success: true,
          data: {
            bnbBalance: web3.utils.fromWei(bnbBalance, 'ether').toString(),
            tokenBalance: web3.utils.fromWei(tokenBalance, 'ether').toString()
          }
        } as StandardResponse;
      } catch (error: any) {
        console.error('Lỗi khi lấy số dư:', error);
        return {
          success: false,
          errorCode: ErrorCode.NETWORK_ERROR,
          errorMessage: error.message || 'Lỗi không xác định khi lấy số dư'
        } as StandardResponse;
      }
    }
  );

  // Hàm kiểm tra và approve token nếu cần
  async function checkAndApproveToken(
    tokenContract: any,
    ownerAddress: string,
    spenderAddress: string,
    amountIn: string,
    nonce: string
  ) {
    try {
      // Kiểm tra allowance hiện tại
      const currentAllowance = await withTimeout(
        tokenContract.methods.allowance(ownerAddress, spenderAddress).call(),
        config.WEB3_TIMEOUT,
        'Quá thời gian chờ khi kiểm tra allowance'
      );

      // Nếu allowance hiện tại đủ, không cần approve lại
      if (BigInt(currentAllowance) >= BigInt(amountIn)) {
        return { nonce: nonce, success: true, message: 'Allowance đã đủ, không cần approve' };
      }

      // Approve với số lượng tối đa nếu useMaxApprove = true, nếu không thì approve chính xác số lượng
      const approveAmount = MAX_UINT256;

      // Thực hiện approve
      const tx = await withTimeout(
        tokenContract.methods.approve(spenderAddress, approveAmount).send({
          from: ownerAddress,
          nonce: nonce
        }),
        config.WEB3_TIMEOUT,
        'Quá thời gian chờ khi gửi giao dịch approve token'
      );

      // Nếu giao dịch thành công, tăng nonce lên 1
      const nextNonce = (BigInt(nonce) + BigInt(1)).toString();

      return {
        nonce: nextNonce,
        success: true,
        message: 'Approve thành công',
        tx: tx.transactionHash
      };
    } catch (error) {
      // Nếu có lỗi, giữ nguyên nonce vì giao dịch không thành công
      return {
        nonce: nonce,
        success: false,
        message: `Approve thất bại: ${(error as Error).message}`,
        error: error
      };
    }
  }

  // Hàm kiểm tra token có trên PancakeSwap hay không
  async function isPairExistsOnPancakeSwap(
    web3: Web3,
    tokenAddress: string,
    networkType: 'MAINNET' | 'TESTNET'
  ) {
    try {
      // Định nghĩa ABI cho Factory của PancakeSwap
      const FACTORY_ABI = [
        {
          constant: true,
          inputs: [
            { name: 'tokenA', type: 'address' },
            { name: 'tokenB', type: 'address' }
          ],
          name: 'getPair',
          outputs: [{ name: 'pair', type: 'address' }],
          type: 'function'
        }
      ];

      // Tạo contract cho PancakeSwap Factory
      const factory = new web3.eth.Contract(FACTORY_ABI, config[networkType].FACTORY_ADDRESS);

      // Gọi hàm getPair để kiểm tra cặp trading
      const pairAddress = (await withTimeout(
        factory.methods.getPair(tokenAddress, config[networkType].WBNB_ADDRESS).call(),
        config.WEB3_TIMEOUT,
        'Quá thời gian chờ khi kiểm tra cặp token'
      )) as string;

      // Nếu địa chỉ là địa chỉ zero, cặp không tồn tại
      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Lỗi khi kiểm tra cặp token trên PancakeSwap:', error);
      return false;
    }
  }

  // Hàm mua token trên PancakeSwap
  async function buyTokenOnPancakeSwap(
    timer: number,
    account: any,
    web3: Web3,
    tokenAddress: string,
    amount: string,
    slippage: number,
    networkType: 'MAINNET' | 'TESTNET',
    maxRetries: number = 3
  ) {
    let retryCount = 0;
    let newTimer = timer;
    let currentNonce: number;

    // Lấy nonce ban đầu trước vòng lặp
    try {
      currentNonce = await withTimeout(
        web3.eth.getTransactionCount(account.address),
        config.WEB3_TIMEOUT,
        'Quá thời gian chờ khi lấy nonce'
      );
      mainWindow.webContents.send(
        'log',
        `Nonce ban đầu: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
      );
      newTimer = Date.now();
    } catch (error) {
      throw error;
    }

    while (retryCount < maxRetries) {
      try {
        const router = new web3.eth.Contract(
          config[networkType].ROUTER_ABI,
          config[networkType].ROUTER_ADDRESS
        );
        const path = [config[networkType].WBNB_ADDRESS, tokenAddress];

        const amountIn = web3.utils.toWei(amount, 'ether');

        const amounts = await withTimeout(
          router.methods.getAmountsOut(amountIn, path).call(),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy ước tính token'
        );

        if (amounts[1] == 0) throw new Error('Không quy đổi được token');

        const minAmountOut = (BigInt(amounts[1]) * BigInt((100 - slippage) * 10)) / BigInt(1000);

        mainWindow.webContents.send(
          'log',
          `Ước tính: ${web3.utils.fromWei(amountIn, 'ether')} BNB ➡️ ${web3.utils.fromWei(amounts[1], 'ether')} Token (${(Date.now() - newTimer) / 1000} giây)`
        );
        newTimer = Date.now();
        // Deadline: hiện tại + 20 phút
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Kiểm tra lại nonce hiện tại trước khi thực hiện giao dịch
        const latestNonce = await withTimeout(
          web3.eth.getTransactionCount(account.address),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy nonce'
        );

        // Cập nhật nonce nếu nonce mới lớn hơn
        if (latestNonce > currentNonce) {
          currentNonce = latestNonce;
          mainWindow.webContents.send(
            'log',
            `Nonce đã được cập nhật: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        } else {
          mainWindow.webContents.send(
            'log',
            `Nonce hiện tại: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        }
        newTimer = Date.now();

        // Thực hiện swap
        const tx = await withTimeout(
          router.methods.swapExactETHForTokens(minAmountOut, path, account.address, deadline).send({
            from: account.address,
            value: amountIn,
            nonce: currentNonce.toString()
          }),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi gửi giao dịch mua token trên PancakeSwap'
        );

        mainWindow.webContents.send(
          'log',
          `📝 TX Hash: ${tx.transactionHash} (${(Date.now() - newTimer) / 1000} giây)`
        );
        return true;
      } catch (error) {
        // Kiểm tra ngay nếu lỗi là "insufficient funds for gas * price + value"
        const errorMessage = (error as Error).message || '';
        if (
          errorMessage.includes('insufficient funds for gas * price + value') ||
          errorMessage.includes('insufficient funds') ||
          errorMessage.includes('không đủ tiền') ||
          errorMessage.includes('insufficient balance')
        ) {
          mainWindow.webContents.send(
            'log',
            `❌ Phát hiện lỗi không đủ tiền: ${errorMessage}. Bỏ qua các lần thử lại.`
          );
          // Tạo lỗi mới với thông báo rõ ràng hơn
          const newError = new Error('Số dư không đủ để thanh toán phí gas và giá trị giao dịch');
          newError.name = 'InsufficientFundsError';
          throw newError;
        }

        // Kiểm tra nếu là lỗi liên quan đến nonce
        if (isNonceError(errorMessage)) {
          mainWindow.webContents.send(
            'log',
            `⚠️ Phát hiện lỗi nonce: ${errorMessage}. Đang cập nhật nonce...`
          );

          try {
            // Lấy nonce mới từ blockchain
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address, 'pending'),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );

            // Luôn cập nhật nonce khi gặp lỗi nonce
            currentNonce = latestNonce;
            mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        } else {
          // Cập nhật nonce sau mỗi lần thất bại
          try {
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );
            if (latestNonce > currentNonce) {
              currentNonce = latestNonce;
              mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
            }
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        }

        retryCount++;
        if (retryCount >= maxRetries) {
          mainWindow.webContents.send(
            'log',
            `❌ Đã thử ${maxRetries} lần không thành công. Lỗi: ${(error as Error).message}`
          );
          throw error;
        }

        mainWindow.webContents.send(
          'log',
          `Đang thử lại lần ${retryCount}/${maxRetries}. Lỗi trước đó: ${(error as Error).message}`
        );
      }
    }
    return false;
  }

  // Hàm mua token trên Four.meme
  async function buyTokenOnFourMeme(
    timer: number,
    account: any,
    web3: Web3,
    tokenAddress: string,
    amount: string,
    slippage: number,
    networkType: 'MAINNET' | 'TESTNET',
    maxRetries: number = 3
  ) {
    let retryCount = 0;
    let newTimer = timer;
    let currentNonce: number;

    // Lấy nonce ban đầu trước vòng lặp
    try {
      currentNonce = await withTimeout(
        web3.eth.getTransactionCount(account.address),
        config.WEB3_TIMEOUT,
        'Quá thời gian chờ khi lấy nonce'
      );
      mainWindow.webContents.send(
        'log',
        `Nonce ban đầu: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
      );
      newTimer = Date.now();
    } catch (error) {
      throw error;
    }

    while (retryCount < maxRetries) {
      try {
        mainWindow.webContents.send(
          'log',
          `Sử dụng Four.meme để đặt lệnh${retryCount > 0 ? ` (lần thử ${retryCount + 1})` : ''}`
        );
        const amountIn = web3.utils.toWei(amount, 'ether');

        const tokenManagerHelper = new web3.eth.Contract(
          config[networkType].TOKEN_MANAGER_HELPER_ABI,
          config[networkType].TOKEN_MANAGER_HELPER_ADDRESS
        );

        // Lấy thông tin token
        const tokenInfo = await withTimeout(
          tokenManagerHelper.methods.getTokenInfo(tokenAddress).call(),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy thông tin token'
        );

        mainWindow.webContents.send(
          'log',
          `Lấy thông tin token: ${(Date.now() - newTimer) / 1000} giây`
        );
        newTimer = Date.now();

        if (tokenInfo.launchTime == 0) {
          throw new Error('Token không tồn tại trên four.meme');
        }

        // Dùng tryBuy để lấy thông tin mua token
        const buyInfo = await withTimeout(
          tokenManagerHelper.methods.tryBuy(tokenAddress, 0, amountIn).call(),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy thông tin mua token'
        );

        mainWindow.webContents.send(
          'log',
          `Lấy thông tin mua: ${(Date.now() - newTimer) / 1000} giây`
        );
        newTimer = Date.now();

        if (buyInfo.estimatedAmount == 0) {
          throw new Error('Token không tồn tại trên four.meme');
        }

        mainWindow.webContents.send(
          'log',
          `Ước tính: ${web3.utils.fromWei(amountIn, 'ether')} BNB ➡️ ${web3.utils.fromWei(buyInfo.estimatedAmount, 'ether')} Token`
        );

        const expectedAmount =
          (BigInt(buyInfo.estimatedAmount) * BigInt((100 - slippage) * 10)) / BigInt(1000);

        // Kiểm tra lại nonce hiện tại trước khi thực hiện giao dịch
        const latestNonce = await withTimeout(
          web3.eth.getTransactionCount(account.address),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy nonce'
        );

        // Cập nhật nonce nếu nonce mới lớn hơn
        if (latestNonce > currentNonce) {
          currentNonce = latestNonce;
          mainWindow.webContents.send(
            'log',
            `Nonce đã được cập nhật: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        } else {
          mainWindow.webContents.send(
            'log',
            `Nonce hiện tại: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        }
        newTimer = Date.now();

        // Lấy thông tin token để xác định phiên bản TokenManager
        const tokenManagerAddress = tokenInfo.tokenManager;
        const tokenManagerVersion = parseInt(tokenInfo.version);

        let tx;
        if (tokenManagerVersion === 1) {
          // Sử dụng TokenManager V1
          const tokenManager = new web3.eth.Contract(
            config[networkType].TOKEN_MANAGER_V1_ABI,
            tokenManagerAddress
          );

          tx = await withTimeout(
            tokenManager.methods
              .purchaseTokenAMAP(tokenAddress, amountIn, expectedAmount.toString())
              .send({
                from: account.address,
                value: amountIn,

                nonce: currentNonce.toString()
              }),
            config.WEB3_TIMEOUT,
            'Quá thời gian chờ khi gửi giao dịch mua token trên Four.meme'
          );
        } else {
          // Sử dụng TokenManager V2
          const tokenManager = new web3.eth.Contract(
            config[networkType].TOKEN_MANAGER_V2_ABI,
            tokenManagerAddress
          );

          tx = await withTimeout(
            tokenManager.methods
              .buyTokenAMAP(tokenAddress, amountIn, expectedAmount.toString())
              .send({
                from: account.address,
                value: amountIn,
                nonce: currentNonce.toString()
              }),
            config.WEB3_TIMEOUT,
            'Quá thời gian chờ khi gửi giao dịch mua token trên Four.meme'
          );
        }

        mainWindow.webContents.send(
          'log',
          `📝 TX Hash: ${tx.transactionHash} (${(Date.now() - newTimer) / 1000} giây)`
        );
        return true;
      } catch (error) {
        // Kiểm tra ngay nếu lỗi là "insufficient funds for gas * price + value"
        const errorMessage = (error as Error).message || '';
        if (
          errorMessage.includes('insufficient funds for gas * price + value') ||
          errorMessage.includes('insufficient funds') ||
          errorMessage.includes('không đủ tiền') ||
          errorMessage.includes('insufficient balance')
        ) {
          mainWindow.webContents.send(
            'log',
            `❌ Phát hiện lỗi không đủ tiền: ${errorMessage}. Bỏ qua các lần thử lại.`
          );
          // Tạo lỗi mới với thông báo rõ ràng hơn
          const newError = new Error('Số dư không đủ để thanh toán phí gas và giá trị giao dịch');
          newError.name = 'InsufficientFundsError';
          throw newError;
        }

        // Kiểm tra nếu là lỗi liên quan đến nonce
        if (isNonceError(errorMessage)) {
          mainWindow.webContents.send(
            'log',
            `⚠️ Phát hiện lỗi nonce: ${errorMessage}. Đang cập nhật nonce...`
          );

          try {
            // Lấy nonce mới từ blockchain
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address, 'pending'),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );

            // Luôn cập nhật nonce khi gặp lỗi nonce
            currentNonce = latestNonce;
            mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        } else {
          // Cập nhật nonce sau mỗi lần thất bại
          try {
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );
            if (latestNonce > currentNonce) {
              currentNonce = latestNonce;
              mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
            }
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        }

        retryCount++;
        if (retryCount >= maxRetries) {
          mainWindow.webContents.send(
            'log',
            `❌ Đã thử ${maxRetries} lần không thành công. Lỗi: ${(error as Error).message}`
          );
          throw error;
        }

        mainWindow.webContents.send(
          'log',
          `Đang thử lại lần ${retryCount}/${maxRetries}. Lỗi trước đó: ${(error as Error).message}`
        );
      }
    }
    return false;
  }

  // Hàm bán token trên PancakeSwap
  async function sellTokenOnPancakeswap(
    timer: number,
    account: any,
    web3: Web3,
    tokenAddress: string,
    amount: string,
    slippage: number,
    networkType: 'MAINNET' | 'TESTNET',
    maxRetries: number = 3
  ) {
    let retryCount = 0;
    let newTimer = timer;
    let currentNonce: number;

    // Lấy nonce ban đầu trước vòng lặp
    try {
      currentNonce = await withTimeout(
        web3.eth.getTransactionCount(account.address),
        config.WEB3_TIMEOUT,
        'Quá thời gian chờ khi lấy nonce'
      );
      mainWindow.webContents.send(
        'log',
        `Nonce ban đầu: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
      );
      newTimer = Date.now();
    } catch (error) {
      throw error;
    }

    while (retryCount < maxRetries) {
      try {
        // Chuyển đổi số lượng BNB sang wei
        const amountIn = web3.utils.toWei(amount, 'ether');

        const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);

        // Tạo contract cho PancakeSwap Router
        const router = new web3.eth.Contract(
          config[networkType].ROUTER_ABI,
          config[networkType].ROUTER_ADDRESS
        );

        // Tạo path dành cho swap
        const path = [tokenAddress, config[networkType].WBNB_ADDRESS];

        // Lấy ước tính BNB nhận được
        const amountsOut = await withTimeout(
          router.methods.getAmountsOut(amountIn, path).call(),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy ước tính token'
        );
        const expectedBNB = amountsOut[1];

        // Áp dụng slippage
        const minBNB = (BigInt(expectedBNB) * BigInt((100 - slippage) * 10)) / BigInt(1000);

        if (expectedBNB == 0) throw new Error('Token không lên PancakeSwap');
        mainWindow.webContents.send(
          'log',
          `Ước tính: ${web3.utils.fromWei(amountIn, 'ether')} Token ➡️ ${web3.utils.fromWei(expectedBNB, 'ether')} BNB (${(Date.now() - newTimer) / 1000} giây)`
        );
        newTimer = Date.now();

        // Kiểm tra lại nonce hiện tại trước khi thực hiện giao dịch
        const latestNonce = await withTimeout(
          web3.eth.getTransactionCount(account.address),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy nonce'
        );

        // Cập nhật nonce nếu nonce mới lớn hơn
        if (latestNonce > currentNonce) {
          currentNonce = latestNonce;
          mainWindow.webContents.send(
            'log',
            `Nonce đã được cập nhật: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        } else {
          mainWindow.webContents.send(
            'log',
            `Nonce hiện tại: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        }
        newTimer = Date.now();

        // Kiểm tra và approve token nếu cần
        const approveResult = await checkAndApproveToken(
          tokenContract,
          account.address,
          config[networkType].ROUTER_ADDRESS,
          amountIn,
          currentNonce.toString()
        );

        // Cập nhật nonce từ kết quả approve
        if (approveResult.success) {
          currentNonce = parseInt(approveResult.nonce);
        }

        mainWindow.webContents.send(
          'log',
          `${approveResult.message} (${(Date.now() - newTimer) / 1000} giây)`
        );
        newTimer = Date.now();

        // Deadline: hiện tại + 20 phút
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        const tx = await withTimeout(
          router.methods
            .swapExactTokensForETH(amountIn, minBNB.toString(), path, account.address, deadline)
            .send({
              from: account.address,
              nonce: currentNonce.toString()
            }),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi gửi giao dịch bán token trên PancakeSwap'
        );

        mainWindow.webContents.send(
          'log',
          `📝 TX Hash: ${tx.transactionHash} (${(Date.now() - newTimer) / 1000} giây)`
        );
        return true;
      } catch (error) {
        // Kiểm tra ngay nếu lỗi là "insufficient funds for gas * price + value"
        const errorMessage = (error as Error).message || '';
        if (
          errorMessage.includes('insufficient funds for gas * price + value') ||
          errorMessage.includes('insufficient funds') ||
          errorMessage.includes('không đủ tiền') ||
          errorMessage.includes('insufficient balance')
        ) {
          mainWindow.webContents.send(
            'log',
            `❌ Phát hiện lỗi không đủ tiền: ${errorMessage}. Bỏ qua các lần thử lại.`
          );
          // Tạo lỗi mới với thông báo rõ ràng hơn
          const newError = new Error('Số dư không đủ để thanh toán phí gas và giá trị giao dịch');
          newError.name = 'InsufficientFundsError';
          throw newError;
        }

        // Kiểm tra nếu là lỗi liên quan đến nonce
        if (isNonceError(errorMessage)) {
          mainWindow.webContents.send(
            'log',
            `⚠️ Phát hiện lỗi nonce: ${errorMessage}. Đang cập nhật nonce...`
          );

          try {
            // Lấy nonce mới từ blockchain
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address, 'pending'),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );

            // Luôn cập nhật nonce khi gặp lỗi nonce
            currentNonce = latestNonce;
            mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        } else {
          // Cập nhật nonce sau mỗi lần thất bại
          try {
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );
            if (latestNonce > currentNonce) {
              currentNonce = latestNonce;
              mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
            }
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        }

        retryCount++;
        if (retryCount >= maxRetries) {
          mainWindow.webContents.send(
            'log',
            `❌ Đã thử ${maxRetries} lần không thành công. Lỗi: ${(error as Error).message}`
          );
          throw error;
        }

        mainWindow.webContents.send(
          'log',
          `Đang thử lại lần ${retryCount}/${maxRetries}. Lỗi trước đó: ${(error as Error).message}`
        );
      }
    }
    return false;
  }

  // Hàm bán token trên Four.meme
  async function sellTokenOnFourMeme(
    timer: number,
    account: any,
    web3: Web3,
    tokenAddress: string,
    amount: string,
    slippage: number,
    networkType: 'MAINNET' | 'TESTNET',
    maxRetries: number = 3
  ) {
    let retryCount = 0;
    let newTimer = timer;
    let currentNonce: number;

    // Lấy nonce ban đầu trước vòng lặp
    try {
      currentNonce = await withTimeout(
        web3.eth.getTransactionCount(account.address),
        config.WEB3_TIMEOUT,
        'Quá thời gian chờ khi lấy nonce'
      );
      mainWindow.webContents.send(
        'log',
        `Nonce ban đầu: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
      );
      newTimer = Date.now();
    } catch (error) {
      throw error;
    }

    while (retryCount < maxRetries) {
      try {
        mainWindow.webContents.send(
          'log',
          `Sử dụng Four.meme để bán token${retryCount > 0 ? ` (lần thử ${retryCount + 1})` : ''} với số lượng: ${amount}`
        );

        const amountIn = web3.utils.toWei(amount, 'ether');
        const tokenManagerHelper = new web3.eth.Contract(
          config[networkType].TOKEN_MANAGER_HELPER_ABI,
          config[networkType].TOKEN_MANAGER_HELPER_ADDRESS
        );

        // Tạo contract instance cho token
        const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);

        // Lấy thông tin token
        const tokenInfo = await withTimeout(
          tokenManagerHelper.methods.getTokenInfo(tokenAddress).call(),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy thông tin token'
        );

        mainWindow.webContents.send(
          'log',
          `Lấy thông tin token: ${(Date.now() - newTimer) / 1000} giây`
        );
        newTimer = Date.now();

        // Dùng trySell để lấy thông tin bán token
        const sellInfo = await withTimeout(
          tokenManagerHelper.methods.trySell(tokenAddress, amountIn).call(),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy thông tin bán token'
        );

        mainWindow.webContents.send(
          'log',
          `Lấy thông tin bán: ${(Date.now() - newTimer) / 1000} giây`
        );
        newTimer = Date.now();

        mainWindow.webContents.send(
          'log',
          `Ước tính: ${web3.utils.fromWei(amountIn, 'ether')} Token ➡️ ${web3.utils.fromWei(sellInfo.funds, 'ether')} BNB`
        );

        // Xác định phiên bản TokenManager
        const tokenManagerAddress = tokenInfo.tokenManager;
        const tokenManagerVersion = parseInt(tokenInfo.version);

        // Kiểm tra lại nonce hiện tại trước khi thực hiện giao dịch
        const latestNonce = await withTimeout(
          web3.eth.getTransactionCount(account.address),
          config.WEB3_TIMEOUT,
          'Quá thời gian chờ khi lấy nonce'
        );

        // Cập nhật nonce nếu nonce mới lớn hơn
        if (latestNonce > currentNonce) {
          currentNonce = latestNonce;
          mainWindow.webContents.send(
            'log',
            `Nonce đã được cập nhật: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        } else {
          mainWindow.webContents.send(
            'log',
            `Nonce hiện tại: ${currentNonce} (${(Date.now() - newTimer) / 1000} giây)`
          );
        }
        newTimer = Date.now();

        // Kiểm tra và approve token nếu cần
        const approveResult = await checkAndApproveToken(
          tokenContract,
          account.address,
          tokenManagerAddress,
          amountIn,
          currentNonce.toString()
        );

        // Cập nhật nonce từ kết quả approve
        if (approveResult.success) {
          currentNonce = parseInt(approveResult.nonce);
        }

        mainWindow.webContents.send(
          'log',
          `${approveResult.message} (${(Date.now() - newTimer) / 1000} giây)`
        );
        newTimer = Date.now();

        // Tính toán số tiền tối thiểu nhận được sau khi áp dụng slippage
        const minFunds = (BigInt(sellInfo.funds) * BigInt((100 - slippage) * 10)) / BigInt(1000);

        let tx: any;
        if (tokenManagerVersion === 1) {
          // Sử dụng TokenManager V1
          const tokenManager = new web3.eth.Contract(
            config[networkType].TOKEN_MANAGER_V1_ABI,
            tokenManagerAddress
          );

          tx = await withTimeout(
            tokenManager.methods.saleToken(tokenAddress, amountIn).send({
              from: account.address,
              nonce: currentNonce.toString()
            }),
            config.WEB3_TIMEOUT,
            'Quá thời gian chờ khi gửi giao dịch bán token trên Four.meme'
          );
        } else {
          // Sử dụng TokenManager V2
          const tokenManager = new web3.eth.Contract(
            config[networkType].TOKEN_MANAGER_V2_ABI,
            tokenManagerAddress
          );

          // Gọi phương thức sellToken với phiên bản có minFunds

          tx = await withTimeout(
            tokenManager.methods
              .sellToken(
                0,
                tokenAddress,
                amountIn,
                minFunds,
                0,
                '0x0000000000000000000000000000000000000000'
              )
              .send({
                from: account.address,
                nonce: currentNonce.toString()
              }),
            config.WEB3_TIMEOUT,
            'Quá thời gian chờ khi gửi giao dịch bán token trên Four.meme'
          );
        }

        mainWindow.webContents.send(
          'log',
          `📝 TX Hash: ${tx.transactionHash} (${(Date.now() - newTimer) / 1000} giây)`
        );
        return true;
      } catch (error) {
        // Kiểm tra ngay nếu lỗi là "insufficient funds for gas * price + value"
        const errorMessage = (error as Error).message || '';
        if (
          errorMessage.includes('insufficient funds for gas * price + value') ||
          errorMessage.includes('insufficient funds') ||
          errorMessage.includes('không đủ tiền') ||
          errorMessage.includes('insufficient balance')
        ) {
          mainWindow.webContents.send(
            'log',
            `❌ Phát hiện lỗi không đủ tiền: ${errorMessage}. Bỏ qua các lần thử lại.`
          );
          // Tạo lỗi mới với thông báo rõ ràng hơn
          const newError = new Error('Số dư không đủ để thanh toán phí gas và giá trị giao dịch');
          newError.name = 'InsufficientFundsError';
          throw newError;
        }

        // Kiểm tra nếu là lỗi liên quan đến nonce
        if (isNonceError(errorMessage)) {
          mainWindow.webContents.send(
            'log',
            `⚠️ Phát hiện lỗi nonce: ${errorMessage}. Đang cập nhật nonce...`
          );

          try {
            // Lấy nonce mới từ blockchain
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address, 'pending'),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );

            // Luôn cập nhật nonce khi gặp lỗi nonce
            currentNonce = latestNonce;
            mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        } else {
          // Cập nhật nonce sau mỗi lần thất bại
          try {
            const latestNonce = await withTimeout(
              web3.eth.getTransactionCount(account.address),
              config.WEB3_TIMEOUT,
              'Quá thời gian chờ khi lấy nonce mới sau lỗi'
            );
            if (latestNonce > currentNonce) {
              currentNonce = latestNonce;
              mainWindow.webContents.send('log', `Nonce đã được cập nhật sau lỗi: ${currentNonce}`);
            }
          } catch (nonceError) {
            mainWindow.webContents.send(
              'log',
              `Không thể cập nhật nonce sau lỗi: ${(nonceError as Error).message}`
            );
          }
        }

        retryCount++;
        if (retryCount >= maxRetries) {
          mainWindow.webContents.send(
            'log',
            `❌ Đã thử ${maxRetries} lần không thành công. Lỗi: ${(error as Error).message}`
          );
          throw error;
        }

        mainWindow.webContents.send(
          'log',
          `Đang thử lại lần ${retryCount}/${maxRetries}. Lỗi trước đó: ${(error as Error).message}`
        );
      }
    }
    return false;
  }

  // Place buy order - Sử dụng các hàm đã tách
  ipcMain.handle(
    'place-buy-order',
    async (
      _,
      encryptedPrivateKey: string,
      tokenAddress: string,
      amount: string,
      slippage: number,
      networkType: 'MAINNET' | 'TESTNET',
      unit: string = 'value',
      maxRetries: number = 3
    ) => {
      try {
        let timer = Date.now();
        const privateKey = decryptPrivateKey(encryptedPrivateKey);

        // Tạo Web3 instance với timeout
        const web3 = new Web3(config[networkType].BSC_NODE_URL);

        // Thiết lập timeout cho các request
        web3.eth.transactionBlockTimeout = config.WEB3_TIMEOUT;
        web3.eth.transactionPollingTimeout = config.WEB3_TIMEOUT;
        web3.eth.handleRevert = true;

        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        // Kiểm tra số dư BNB trước khi đặt lệnh
        const balance = (
          await withTimeout(
            web3.eth.getBalance(account.address),
            config.WEB3_TIMEOUT,
            'Quá thời gian chờ khi lấy số dư ví'
          )
        ).toString();

        const balanceBNB = web3.utils.fromWei(balance, 'ether');

        mainWindow.webContents.send(
          'log',
          `Số dư ví: ${web3.utils.fromWei(balance, 'ether')} BNB (${(Date.now() - timer) / 1000} giây)`
        );
        timer = Date.now();
        // Xử lý đơn vị (unit)
        let finalAmount = amount;
        if (unit === 'percent') {
          // Tính toán số lượng dựa trên phần trăm của số dư
          finalAmount = formatNumberString(
            web3.utils.fromWei((BigInt(balance) * BigInt(amount)) / BigInt(100), 'ether'),
            9
          );
          mainWindow.webContents.send('log', `Sử dụng ${amount}% số dư: ${finalAmount} BNB`);
        }
        if (parseFloat(finalAmount) === 0) {
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: 'Số BNB mua không hợp lệ'
          } as StandardResponse;
        }

        if (parseFloat(balanceBNB) === 0) {
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: 'Số dư BNB không đủ'
          } as StandardResponse;
        }

        if (parseFloat(balanceBNB) < parseFloat(finalAmount)) {
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: `Số dư không đủ. Cần ít nhất ${finalAmount} BNB để đặt lệnh.`
          } as StandardResponse;
        }

        const isExistOnPancakeSwap = await isPairExistsOnPancakeSwap(
          web3,
          tokenAddress,
          networkType
        );

        let result = false;
        if (isExistOnPancakeSwap) {
          mainWindow.webContents.send(
            'log',
            `Sử dụng PancakeSwap (${(Date.now() - timer) / 1000} giây)`
          );
          timer = Date.now();
          result = await buyTokenOnPancakeSwap(
            timer,
            account,
            web3,
            tokenAddress,
            finalAmount,
            slippage,
            networkType,
            maxRetries
          );
        } else {
          result = await buyTokenOnFourMeme(
            timer,
            account,
            web3,
            tokenAddress,
            finalAmount,
            slippage,
            networkType,
            maxRetries
          );
        }

        return {
          success: result,
          data: { transactionSuccess: result },
          errorCode: result ? undefined : ErrorCode.TRANSACTION_FAILED,
          errorMessage: result ? undefined : 'Giao dịch mua token thất bại'
        } as StandardResponse;
      } catch (error: any) {
        console.error('Lỗi khi đặt lệnh mua:', error);

        // Kiểm tra nếu lỗi là "insufficient funds for gas * price + value"
        const errorMessage = error.message || 'Lỗi không xác định khi đặt lệnh mua';
        if (
          errorMessage.includes('insufficient funds for gas * price + value') ||
          errorMessage.includes('insufficient funds') ||
          errorMessage.includes('không đủ tiền') ||
          errorMessage.includes('insufficient balance') ||
          error.name === 'InsufficientFundsError'
        ) {
          mainWindow.webContents.send(
            'log',
            `Phát hiện lỗi không đủ tiền: ${errorMessage}. Đánh dấu là INVALID_AMOUNT để dừng chu kỳ.`
          );
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: 'Số dư không đủ để thanh toán phí gas và giá trị giao dịch'
          } as StandardResponse;
        }

        return {
          success: false,
          errorCode: ErrorCode.TRANSACTION_FAILED,
          errorMessage: errorMessage
        } as StandardResponse;
      }
    }
  );

  const formatNumberString = (value: string, fixed = 0) => {
    if (value === undefined || value === null) return '0';

    const parts = String(value).split('.');
    const integerPart = parts[0];
    return parts.length > 1 && fixed > 0
      ? `${integerPart}.${parts[1].slice(0, fixed)}`
      : integerPart;
  };

  // Place sell order - Sử dụng các hàm đã tách
  ipcMain.handle(
    'place-sell-order',
    async (
      _,
      encryptedPrivateKey: string,
      tokenAddress: string,
      amount: string,
      slippage: number,
      networkType: 'MAINNET' | 'TESTNET',
      unit: string = 'value',
      maxRetries: number = 3
    ) => {
      try {
        let timer = Date.now();
        const privateKey = decryptPrivateKey(encryptedPrivateKey);

        // Tạo Web3 instance với timeout
        const web3 = new Web3(config[networkType].BSC_NODE_URL);

        // Thiết lập timeout cho các request
        web3.eth.transactionBlockTimeout = config.WEB3_TIMEOUT;
        web3.eth.transactionPollingTimeout = config.WEB3_TIMEOUT;
        web3.eth.handleRevert = true;

        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        // Tạo contract instance cho token
        const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);

        // Kiểm tra số dư token
        const tokenBalance = (await tokenContract.methods
          .balanceOf(account.address)
          .call()) as string;

        mainWindow.webContents.send(
          'log',
          `Số dư: ${web3.utils.fromWei(tokenBalance, 'ether')} token (${(Date.now() - timer) / 1000} giây)`
        );

        timer = Date.now();
        // Xử lý đơn vị (unit)
        let finalAmount = amount;

        if (unit === 'percent') {
          // Tính toán số lượng dựa trên phần trăm của số dư token
          finalAmount = formatNumberString(
            web3.utils.fromWei((BigInt(tokenBalance) * BigInt(amount)) / BigInt(100), 'ether'),
            9
          );

          mainWindow.webContents.send(
            'log',
            `Sử dụng ${amount}% số dư token: ${finalAmount} token`
          );
        }

        if (parseFloat(finalAmount) === 0) {
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: 'Số token bán không hợp lệ'
          } as StandardResponse;
        }

        if (parseFloat(web3.utils.fromWei(tokenBalance, 'ether')) === 0) {
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: 'Số dư token không đủ'
          } as StandardResponse;
        }

        if (BigInt(tokenBalance) < BigInt(web3.utils.toWei(finalAmount, 'ether'))) {
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: `Số dư không đủ. Cần ít nhất ${finalAmount} token`
          } as StandardResponse;
        }

        const isExistOnPancakeSwap = await isPairExistsOnPancakeSwap(
          web3,
          tokenAddress,
          networkType
        );

        let result = false;
        if (isExistOnPancakeSwap) {
          mainWindow.webContents.send(
            'log',
            `Sử dụng PancakeSwap (${(Date.now() - timer) / 1000} giây)`
          );
          timer = Date.now();
          result = await sellTokenOnPancakeswap(
            timer,
            account,
            web3,
            tokenAddress,
            finalAmount,
            slippage,
            networkType,
            maxRetries
          );
        } else {
          result = await sellTokenOnFourMeme(
            timer,
            account,
            web3,
            tokenAddress,
            finalAmount,
            slippage,
            networkType,
            maxRetries
          );
        }

        return {
          success: result,
          data: { transactionSuccess: result },
          errorCode: result ? undefined : ErrorCode.TRANSACTION_FAILED,
          errorMessage: result ? undefined : 'Giao dịch bán token thất bại'
        } as StandardResponse;
      } catch (error: any) {
        console.error('Lỗi khi đặt lệnh bán:', error);

        // Kiểm tra nếu lỗi là "insufficient funds for gas * price + value"
        const errorMessage = error.message || 'Lỗi không xác định khi đặt lệnh bán';
        if (
          errorMessage.includes('insufficient funds for gas * price + value') ||
          errorMessage.includes('insufficient funds') ||
          errorMessage.includes('không đủ tiền') ||
          errorMessage.includes('insufficient balance') ||
          error.name === 'InsufficientFundsError'
        ) {
          mainWindow.webContents.send(
            'log',
            `Phát hiện lỗi không đủ tiền: ${errorMessage}. Đánh dấu là INVALID_AMOUNT để dừng chu kỳ.`
          );
          return {
            success: false,
            errorCode: ErrorCode.INVALID_AMOUNT,
            errorMessage: 'Số dư không đủ để thanh toán phí gas và giá trị giao dịch'
          } as StandardResponse;
        }

        return {
          success: false,
          errorCode: ErrorCode.TRANSACTION_FAILED,
          errorMessage: errorMessage
        } as StandardResponse;
      }
    }
  );
}
