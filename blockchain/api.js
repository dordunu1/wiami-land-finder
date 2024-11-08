import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from 'ethers';

// Configure Alchemy SDK
const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

// Contract address for Wiami Land NFTs
const WIAMI_CONTRACT_ADDRESS = "0xd396ca541F501F5D303166C509e2045848df356b";

// Add rate limiting utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class BlockchainAPI {
    // Get all NFTs owned by an address
    static async getAddressHoldings(address) {
        try {
            const nfts = await alchemy.nft.getNftsForOwner(address, {
                contractAddresses: [WIAMI_CONTRACT_ADDRESS]
            });
            return nfts;
        } catch (error) {
            console.error("Error fetching NFTs:", error);
            throw error;
        }
    }

    // Get token transfer history
    static async getTokenTransfers(tokenId) {
        try {
            const tokenIdHex = BigInt(tokenId).toString(16);
            
            const response = await alchemy.core.send("alchemy_getAssetTransfers", [{
                fromBlock: "0x0",
                toBlock: "latest",
                contractAddresses: [WIAMI_CONTRACT_ADDRESS],
                category: ["erc721"],
                excludeZeroValue: true,
                withMetadata: true,
                maxCount: "0x3e8", // Hex for 1000
                order: "desc"
            }]);

            if (!response || !response.transfers) {
                return [];
            }

            const transfers = response.transfers.filter(transfer => 
                transfer.erc721TokenId === tokenIdHex
            );

            return transfers;
        } catch (error) {
            console.error("Error fetching token transfers:", error);
            return [];
        }
    }

    // Get NFT metadata
    static async getNFTMetadata(tokenId) {
        try {
            const response = await alchemy.nft.getNftMetadata(
                WIAMI_CONTRACT_ADDRESS,
                tokenId
            );
            return response;
        } catch (error) {
            console.error("Error fetching metadata:", error);
            throw error;
        }
    }

    // Utility functions
    static async getENSName(address) {
        try {
            const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
            const ensName = await provider.lookupAddress(address);
            return ensName || address;
        } catch {
            return address;
        }
    }

    static formatTokenId(hexTokenId) {
        return BigInt(hexTokenId).toString();
    }

    static formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    // Add utility function for time ago format
    static formatTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }
        return 'just now';
    }

    // Get all transfers for the collection
    static async getCollectionTransfers(limit = 100) {
        try {
            const response = await alchemy.core.send("alchemy_getAssetTransfers", [{
                fromBlock: "0x0",
                toBlock: "latest",
                contractAddresses: [WIAMI_CONTRACT_ADDRESS],
                category: ["erc721"],
                excludeZeroValue: true,
                withMetadata: true,
                maxCount: `0x${limit.toString(16)}`,
                order: "desc"
            }]);

            if (!response || !response.transfers) {
                return [];
            }

            // Process transfers in batches to avoid rate limiting
            const enhancedTransfers = [];
            const batchSize = 5;
            
            for (let i = 0; i < response.transfers.length; i += batchSize) {
                const batch = response.transfers.slice(i, i + batchSize);
                const batchPromises = batch.map(async transfer => {
                    try {
                        const tokenId = this.formatTokenId(transfer.erc721TokenId);
                        let metadata = null;
                        
                        try {
                            metadata = await alchemy.nft.getNftMetadata(
                                WIAMI_CONTRACT_ADDRESS,
                                tokenId
                            );
                        } catch (metadataError) {
                            console.warn(`Failed to fetch metadata for token ${tokenId}:`, metadataError);
                        }

                        // Get name from the correct location
                        const tokenName = metadata?.name || `Wiami #${tokenId.slice(-4)}`;
                        const openSeaLink = `https://opensea.io/assets/ethereum/${WIAMI_CONTRACT_ADDRESS}/${tokenId}`;
                        
                        return {
                            tokenId,
                            tokenName,
                            neighborhood: metadata?.raw?.metadata?.attributes?.find(attr => attr.trait_type === 'Neighborhood')?.value,
                            zone: metadata?.raw?.metadata?.attributes?.find(attr => attr.trait_type === 'Zone')?.value,
                            openSeaLink,
                            value: transfer.value ? `${ethers.formatEther(transfer.value)} ETH` : 'No price data',
                            fromAddress: transfer.from,
                            toAddress: transfer.to,
                            txHash: transfer.hash,
                            etherscanLink: `https://etherscan.io/tx/${transfer.hash}`,
                            timestamp: transfer.metadata.blockTimestamp,
                            formattedTimestamp: this.formatTimestamp(transfer.metadata.blockTimestamp),
                            timeAgo: this.formatTimeAgo(transfer.metadata.blockTimestamp)
                        };
                    } catch (error) {
                        console.error(`Error processing transfer:`, error);
                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                const validResults = batchResults.filter(result => result !== null);
                enhancedTransfers.push(...validResults);

                // Add delay between batches
                if (i + batchSize < response.transfers.length) {
                    await sleep(1000);
                }
            }

            // Sort transfers and add same token indicator
            return enhancedTransfers
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((transfer, i, arr) => ({
                    ...transfer,
                    isSameToken: i > 0 && transfer.tokenId === arr[i-1].tokenId
                }));

        } catch (error) {
            console.error("Error fetching collection transfers:", error);
            return [];
        }
    }
}

export default BlockchainAPI;