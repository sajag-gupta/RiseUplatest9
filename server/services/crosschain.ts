import { ethers } from 'ethers';

interface BridgeConfig {
  polygonAmoy: {
    bridgeAddress: string;
    chainId: number;
  };
  ethereumSepolia: {
    bridgeAddress: string;
    chainId: number;
  };
}

export class CrossChainService {
  private providers: Record<string, ethers.providers.JsonRpcProvider> = {};
  private signers: Record<string, ethers.Wallet> = {};
  private bridgeContracts: Record<string, ethers.Contract> = {};

  constructor() {
    this.initializeProviders();
    this.initializeBridgeContracts();
  }

  private initializeProviders() {
    // Polygon Amoy
    this.providers.polygonAmoy = new ethers.providers.JsonRpcProvider(
      process.env.AMOY_RPC_URL
    );

    // Ethereum Sepolia
    this.providers.ethereumSepolia = new ethers.providers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL
    );

    // Initialize signers
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }

    this.signers.polygonAmoy = new ethers.Wallet(
      process.env.PRIVATE_KEY,
      this.providers.polygonAmoy
    );

    this.signers.ethereumSepolia = new ethers.Wallet(
      process.env.PRIVATE_KEY,
      this.providers.ethereumSepolia
    );
  }

  private initializeBridgeContracts() {
    const bridgeABI = [
      "function bridgeNFT(address tokenContract, uint256 tokenId, uint256 targetChainId, address recipient) payable",
      "function getBridgeFee(uint256 targetChainId) view returns (uint256)",
      "function getSupportedChains() view returns (uint256[])",
      "function getBridgedNFT(uint256 sourceChainId, address sourceContract, uint256 sourceTokenId) view returns (tuple(uint256 targetChainId, address targetContract, uint256 targetTokenId, address owner, bool completed))"
    ];

    const bridgeConfig: BridgeConfig = {
      polygonAmoy: {
        bridgeAddress: process.env.AMOY_BRIDGE_ADDRESS || "",
        chainId: 80002
      },
      ethereumSepolia: {
        bridgeAddress: process.env.SEPOLIA_BRIDGE_ADDRESS || "",
        chainId: 11155111
      }
    };

    // Initialize bridge contracts
    if (bridgeConfig.polygonAmoy.bridgeAddress) {
      this.bridgeContracts.polygonAmoy = new ethers.Contract(
        bridgeConfig.polygonAmoy.bridgeAddress,
        bridgeABI,
        this.signers.polygonAmoy
      );
    }

    if (bridgeConfig.ethereumSepolia.bridgeAddress) {
      this.bridgeContracts.ethereumSepolia = new ethers.Contract(
        bridgeConfig.ethereumSepolia.bridgeAddress,
        bridgeABI,
        this.signers.ethereumSepolia
      );
    }
  }

  async bridgeNFT(
    sourceChain: string,
    targetChain: string,
    tokenContract: string,
    tokenId: string,
    recipient: string
  ): Promise<any> {
    if (!this.bridgeContracts[sourceChain]) {
      throw new Error(`Bridge contract not initialized for ${sourceChain}`);
    }

    try {
      const targetChainId = this.getChainId(targetChain);
      const bridgeFee = await this.getBridgeFee(sourceChain, targetChainId);

      const tx = await this.bridgeContracts[sourceChain].bridgeNFT(
        tokenContract,
        tokenId,
        targetChainId,
        recipient,
        { value: bridgeFee }
      );

      const receipt = await tx.wait();
      return {
        transactionHash: receipt.transactionHash,
        bridgeFee: ethers.utils.formatEther(bridgeFee),
        sourceChain,
        targetChain,
        tokenId
      };
    } catch (error) {
      console.error('Bridge NFT error:', error);
      throw error;
    }
  }

  async getBridgeFee(sourceChain: string, targetChainId: number): Promise<string> {
    if (!this.bridgeContracts[sourceChain]) {
      throw new Error(`Bridge contract not initialized for ${sourceChain}`);
    }

    try {
      const fee = await this.bridgeContracts[sourceChain].getBridgeFee(targetChainId);
      return ethers.utils.formatEther(fee);
    } catch (error) {
      console.error('Get bridge fee error:', error);
      throw error;
    }
  }

  async getSupportedChains(chain: string): Promise<number[]> {
    if (!this.bridgeContracts[chain]) {
      throw new Error(`Bridge contract not initialized for ${chain}`);
    }

    try {
      const chains = await this.bridgeContracts[chain].getSupportedChains();
      return chains.map((id: any) => Number(id));
    } catch (error) {
      console.error('Get supported chains error:', error);
      throw error;
    }
  }

  async getBridgedNFT(
    sourceChain: string,
    sourceContract: string,
    sourceTokenId: string
  ): Promise<any> {
    if (!this.bridgeContracts[sourceChain]) {
      throw new Error(`Bridge contract not initialized for ${sourceChain}`);
    }

    try {
      const bridgedNFT = await this.bridgeContracts[sourceChain].getBridgedNFT(
        this.getChainId(sourceChain),
        sourceContract,
        sourceTokenId
      );

      return {
        targetChainId: Number(bridgedNFT.targetChainId),
        targetContract: bridgedNFT.targetContract,
        targetTokenId: Number(bridgedNFT.targetTokenId),
        owner: bridgedNFT.owner,
        completed: bridgedNFT.completed
      };
    } catch (error) {
      console.error('Get bridged NFT error:', error);
      throw error;
    }
  }

  async getNetworkStatus(chain: string): Promise<any> {
    try {
      const provider = this.providers[chain];
      if (!provider) {
        throw new Error(`Provider not initialized for ${chain}`);
      }

      const blockNumber = await provider.getBlockNumber();
      const gasPrice = await provider.getGasPrice();

      return {
        chain,
        blockNumber,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        chainId: await provider.getNetwork().then(n => n.chainId)
      };
    } catch (error) {
      console.error('Get network status error:', error);
      throw error;
    }
  }

  getChainId(chainName: string): number {
    const chainIds: Record<string, number> = {
      polygonAmoy: 80002,
      ethereumSepolia: 11155111,
      ethereum: 1,
      polygon: 137
    };

    return chainIds[chainName] || 0;
  }

  async estimateBridgeCost(
    sourceChain: string,
    targetChain: string,
    tokenContract: string,
    tokenId: string
  ): Promise<any> {
    try {
      const targetChainId = this.getChainId(targetChain);
      const bridgeFee = await this.getBridgeFee(sourceChain, targetChainId);

      // Estimate gas cost
      const gasEstimate = await this.bridgeContracts[sourceChain].estimateGas.bridgeNFT(
        tokenContract,
        tokenId,
        targetChainId,
        this.signers[sourceChain].address
      );

      const gasPrice = await this.providers[sourceChain].getGasPrice();
      const gasCost = gasEstimate.mul(gasPrice);

      const totalCost = ethers.BigNumber.from(bridgeFee).add(gasCost);

      return {
        bridgeFee: ethers.utils.formatEther(bridgeFee),
        gasCost: ethers.utils.formatEther(gasCost),
        totalCost: ethers.utils.formatEther(totalCost),
        gasEstimate: gasEstimate.toString()
      };
    } catch (error) {
      console.error('Estimate bridge cost error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const crossChainService = new CrossChainService();
