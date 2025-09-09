import type { Express } from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { crossChainService } from "../services/crosschain";
import { storage } from "../storage";

export function setupCrossChainRoutes(app: Express) {
  // Bridge NFT between chains
  app.post("/api/crosschain/bridge", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const {
        sourceChain,
        targetChain,
        tokenContract,
        tokenId,
        recipient
      } = req.body;

      // Validate NFT ownership
      const nft = await storage.getNFT(tokenId);
      if (!nft || nft.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to bridge this NFT" });
      }

      const result = await crossChainService.bridgeNFT(
        sourceChain,
        targetChain,
        tokenContract,
        tokenId,
        recipient || req.user!.id
      );

      res.json(result);
    } catch (error) {
      console.error("Bridge NFT error:", error);
      res.status(500).json({ message: "Failed to bridge NFT" });
    }
  });

  // Get bridge fee estimate
  app.get("/api/crosschain/fee/:sourceChain/:targetChain", async (req, res) => {
    try {
      const { sourceChain, targetChain } = req.params;
      const targetChainId = crossChainService.getChainId ? crossChainService.getChainId(targetChain) : 0;

      const fee = await crossChainService.getBridgeFee(sourceChain, targetChainId);
      res.json({ fee });
    } catch (error) {
      console.error("Get bridge fee error:", error);
      res.status(500).json({ message: "Failed to get bridge fee" });
    }
  });

  // Estimate bridge cost
  app.post("/api/crosschain/estimate", async (req, res) => {
    try {
      const { sourceChain, targetChain, tokenContract, tokenId } = req.body;

      const estimate = await crossChainService.estimateBridgeCost(
        sourceChain,
        targetChain,
        tokenContract,
        tokenId
      );

      res.json(estimate);
    } catch (error) {
      console.error("Estimate bridge cost error:", error);
      res.status(500).json({ message: "Failed to estimate bridge cost" });
    }
  });

  // Get supported chains
  app.get("/api/crosschain/chains/:chain", async (req, res) => {
    try {
      const { chain } = req.params;

      const chains = await crossChainService.getSupportedChains(chain);
      res.json({ supportedChains: chains });
    } catch (error) {
      console.error("Get supported chains error:", error);
      res.status(500).json({ message: "Failed to get supported chains" });
    }
  });

  // Get bridged NFT status
  app.get("/api/crosschain/status/:sourceChain/:sourceContract/:sourceTokenId", async (req, res) => {
    try {
      const { sourceChain, sourceContract, sourceTokenId } = req.params;

      const status = await crossChainService.getBridgedNFT(
        sourceChain,
        sourceContract,
        sourceTokenId
      );

      res.json(status);
    } catch (error) {
      console.error("Get bridged NFT status error:", error);
      res.status(500).json({ message: "Failed to get bridged NFT status" });
    }
  });

  // Get network status
  app.get("/api/crosschain/network/:chain", async (req, res) => {
    try {
      const { chain } = req.params;

      const status = await crossChainService.getNetworkStatus(chain);
      res.json(status);
    } catch (error) {
      console.error("Get network status error:", error);
      res.status(500).json({ message: "Failed to get network status" });
    }
  });

  // Get all available networks
  app.get("/api/crosschain/networks", async (req, res) => {
    try {
      const networks = [
        {
          name: "Polygon Amoy",
          chainId: 80002,
          key: "polygonAmoy",
          rpcUrl: process.env.AMOY_RPC_URL,
          blockExplorer: "https://amoy.polygonscan.com",
          nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18
          }
        },
        {
          name: "Ethereum Sepolia",
          chainId: 11155111,
          key: "ethereumSepolia",
          rpcUrl: process.env.SEPOLIA_RPC_URL,
          blockExplorer: "https://sepolia.etherscan.io",
          nativeCurrency: {
            name: "Sepolia Ether",
            symbol: "ETH",
            decimals: 18
          }
        }
      ];

      res.json({ networks });
    } catch (error) {
      console.error("Get networks error:", error);
      res.status(500).json({ message: "Failed to get networks" });
    }
  });

  // Switch network (client-side helper)
  app.post("/api/crosschain/switch", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { chainId } = req.body;

      // This is mainly for client-side wallet switching
      // The actual network switch happens in the frontend wallet
      res.json({
        message: "Network switch requested",
        chainId,
        success: true
      });
    } catch (error) {
      console.error("Switch network error:", error);
      res.status(500).json({ message: "Failed to switch network" });
    }
  });
}
