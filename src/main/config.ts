const config = {
  // Cấu hình timeout cho Web3 (tính bằng mili giây)
  WEB3_TIMEOUT: 7000, // 7 giây

  MAINNET: {
    BSC_NODE_URL:
      'https://rpc.ankr.com/bsc/2b3732658378f5851d18e1ab08f12456693d71f5451f8941f3c9088f7f081a2a',
    WBNB_ADDRESS: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    ROUTER_ADDRESS: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    FACTORY_ADDRESS: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    TOKEN_MANAGER_HELPER_ADDRESS: '0xF251F83e40a78868FcfA3FA4599Dad6494E46034',
    TOKEN_MANAGER2_ADDRESS: '0x5c952063c7fc8610FFDB798152D69F0B9550762b',
    TOKEN_MANAGER_ADDRESS: '0xEC4549caDcE5DA21Df6E6422d448034B5233bFbC',
    ROUTER_ABI: [
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
        name: 'swapExactTokensForETH',
        type: 'function',
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'path', type: 'address[]' },
          { name: 'to', type: 'address' },
          { name: 'deadline', type: 'uint256' }
        ],
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'nonpayable'
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
        name: 'getAmountsOut',
        type: 'function',
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'path', type: 'address[]' }
        ],
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view'
      },
      {
        name: 'getAmountsIn',
        type: 'function',
        inputs: [
          { name: 'amountOut', type: 'uint256' },
          { name: 'path', type: 'address[]' }
        ],
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view'
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
      }
    ],
    TOKEN_MANAGER_HELPER_ABI: [
      {
        name: 'getTokenInfo',
        type: 'function',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [
          { name: 'version', type: 'uint256' },
          { name: 'tokenManager', type: 'address' },
          { name: 'quote', type: 'address' },
          { name: 'lastPrice', type: 'uint256' },
          { name: 'tradingFeeRate', type: 'uint256' },
          { name: 'minTradingFee', type: 'uint256' },
          { name: 'launchTime', type: 'uint256' },
          { name: 'offers', type: 'uint256' },
          { name: 'maxOffers', type: 'uint256' },
          { name: 'funds', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' },
          { name: 'liquidityAdded', type: 'bool' }
        ],
        stateMutability: 'view'
      },
      {
        name: 'tryBuy',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'funds', type: 'uint256' }
        ],
        outputs: [
          { name: 'tokenManager', type: 'address' },
          { name: 'quote', type: 'address' },
          { name: 'estimatedAmount', type: 'uint256' },
          { name: 'estimatedCost', type: 'uint256' },
          { name: 'estimatedFee', type: 'uint256' },
          { name: 'amountMsgValue', type: 'uint256' },
          { name: 'amountApproval', type: 'uint256' },
          { name: 'amountFunds', type: 'uint256' }
        ],
        stateMutability: 'view'
      },
      {
        name: 'trySell',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [
          { name: 'tokenManager', type: 'address' },
          { name: 'quote', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'fee', type: 'uint256' }
        ],
        stateMutability: 'view'
      }
    ],
    TOKEN_MANAGER_V1_ABI: [
      {
        name: 'purchaseTokenAMAP',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'purchaseToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'saleToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ],
    TOKEN_MANAGER_V2_ABI: [
      {
        name: 'buyTokenAMAP',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'buyTokenAMAP',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'buyToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'buyToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'sellToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      },
      {
        name: 'sellToken',
        type: 'function',
        inputs: [
          { name: 'origin', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minFunds', type: 'uint256' },
          { name: 'feeRate', type: 'uint256' },
          { name: 'feeRecipient', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      },
      {
        name: 'sellToken',
        type: 'function',
        inputs: [
          { name: 'origin', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'from', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minFunds', type: 'uint256' },
          { name: 'feeRate', type: 'uint256' },
          { name: 'feeRecipient', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ]
  },
  TESTNET: {
    BSC_NODE_URL:
      'https://rpc.ankr.com/bsc_testnet_chapel/2b3732658378f5851d18e1ab08f12456693d71f5451f8941f3c9088f7f081a2a',
    WBNB_ADDRESS: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
    ROUTER_ADDRESS: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
    FACTORY_ADDRESS: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
    TOKEN_MANAGER_HELPER_ADDRESS: '0xF251F83e40a78868FcfA3FA4599Dad6494E46034',
    TOKEN_MANAGER2_ADDRESS: '0x5c952063c7fc8610FFDB798152D69F0B9550762b',
    TOKEN_MANAGER_ADDRESS: '0xEC4549caDcE5DA21Df6E6422d448034B5233bFbC',
    ROUTER_ABI: [
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
        name: 'swapExactTokensForETH',
        type: 'function',
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'path', type: 'address[]' },
          { name: 'to', type: 'address' },
          { name: 'deadline', type: 'uint256' }
        ],
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'nonpayable'
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
        name: 'getAmountsOut',
        type: 'function',
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'path', type: 'address[]' }
        ],
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view'
      },
      {
        name: 'getAmountsIn',
        type: 'function',
        inputs: [
          { name: 'amountOut', type: 'uint256' },
          { name: 'path', type: 'address[]' }
        ],
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view'
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
      }
    ],
    TOKEN_MANAGER_HELPER_ABI: [
      {
        name: 'getTokenInfo',
        type: 'function',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [
          { name: 'version', type: 'uint256' },
          { name: 'tokenManager', type: 'address' },
          { name: 'quote', type: 'address' },
          { name: 'lastPrice', type: 'uint256' },
          { name: 'tradingFeeRate', type: 'uint256' },
          { name: 'minTradingFee', type: 'uint256' },
          { name: 'launchTime', type: 'uint256' },
          { name: 'offers', type: 'uint256' },
          { name: 'maxOffers', type: 'uint256' },
          { name: 'funds', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' },
          { name: 'liquidityAdded', type: 'bool' }
        ],
        stateMutability: 'view'
      },
      {
        name: 'tryBuy',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'funds', type: 'uint256' }
        ],
        outputs: [
          { name: 'tokenManager', type: 'address' },
          { name: 'quote', type: 'address' },
          { name: 'estimatedAmount', type: 'uint256' },
          { name: 'estimatedCost', type: 'uint256' },
          { name: 'estimatedFee', type: 'uint256' },
          { name: 'amountMsgValue', type: 'uint256' },
          { name: 'amountApproval', type: 'uint256' },
          { name: 'amountFunds', type: 'uint256' }
        ],
        stateMutability: 'view'
      },
      {
        name: 'trySell',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [
          { name: 'tokenManager', type: 'address' },
          { name: 'quote', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'fee', type: 'uint256' }
        ],
        stateMutability: 'view'
      }
    ],
    TOKEN_MANAGER_V1_ABI: [
      {
        name: 'purchaseTokenAMAP',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'purchaseToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'saleToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ],
    TOKEN_MANAGER_V2_ABI: [
      {
        name: 'buyTokenAMAP',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'buyTokenAMAP',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'funds', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'buyToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'buyToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'maxFunds', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'payable'
      },
      {
        name: 'sellToken',
        type: 'function',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      },
      {
        name: 'sellToken',
        type: 'function',
        inputs: [
          { name: 'origin', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minFunds', type: 'uint256' },
          { name: 'feeRate', type: 'uint256' },
          { name: 'feeRecipient', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      },
      {
        name: 'sellToken',
        type: 'function',
        inputs: [
          { name: 'origin', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'from', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'minFunds', type: 'uint256' },
          { name: 'feeRate', type: 'uint256' },
          { name: 'feeRecipient', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ]
  }
};

export default config;
