import { ethers } from 'ethers';
import * as bip39 from 'bip39';

class WalletManager {
  async createWalletFromSeed(recoveryPhrase: string): Promise<{
    privateKey: string;
    address: string;
  }> {
    try {
      // Kiểm tra tính hợp lệ của recovery phrase
      if (!bip39.validateMnemonic(recoveryPhrase)) {
        throw new Error('Recovery phrase không hợp lệ');
      }

      // Tạo seed từ recovery phrase
      const seedBuffer = await bip39.mnemonicToSeed(recoveryPhrase);
      const seed = new Uint8Array(seedBuffer);

      // Tạo HD Wallet từ seed
      const hdNode = ethers.HDNodeWallet.fromSeed(seed);

      // Lấy private key từ path mặc định của BSC
      const wallet = hdNode.derivePath("m/44'/60'/0'/0/0");

      return {
        privateKey: wallet.privateKey,
        address: wallet.address
      };
    } catch (error) {
      console.error('Lỗi khi tạo ví:', error);
      throw error;
    }
  }

  async createWalletFromPrivateKey(
    privateKey: string
  ): Promise<{ privateKey: string; address: string }> {
    try {
      // Tạo ví từ private key
      const wallet = new ethers.Wallet(privateKey);

      return {
        privateKey: wallet.privateKey,
        address: wallet.address
      };
    } catch (error) {
      console.error('Lỗi khi tạo ví:', error);
      throw error;
    }
  }
}

export default WalletManager;
