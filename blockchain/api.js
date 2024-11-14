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

// Add metadata cache
const metadataCache = new Map();

// Add these constants at the top
const WETH_CONTRACT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const OPENSEA_SEAPORT = "0x00000000006c3852cbEf3e08E8dF289169EdE581";

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
    static async getCollectionTransfers(limit = 30, walletAddress) {
        try {
            console.log('Fetching transfers with limit:', limit);
            
            // Get both incoming and outgoing transfers
            const [fromTransfers, toTransfers] = await Promise.all([
                alchemy.core.send("alchemy_getAssetTransfers", [{
                    fromBlock: "0x0",
                    toBlock: "latest",
                    contractAddresses: [WIAMI_CONTRACT_ADDRESS],
                    category: ["erc721"],
                    fromAddress: walletAddress,
                    withMetadata: true,
                    maxCount: "0x1E", // Hex for 30
                    order: "desc"
                }]),
                alchemy.core.send("alchemy_getAssetTransfers", [{
                    fromBlock: "0x0",
                    toBlock: "latest",
                    contractAddresses: [WIAMI_CONTRACT_ADDRESS],
                    category: ["erc721"],
                    toAddress: walletAddress,
                    withMetadata: true,
                    maxCount: "0x1E", // Hex for 30
                    order: "desc"
                }])
            ]);

            // Combine and sort transfers
            const allTransfers = [
                ...(fromTransfers?.transfers || []),
                ...(toTransfers?.transfers || [])
            ].sort((a, b) => 
                new Date(b.metadata.blockTimestamp) - new Date(a.metadata.blockTimestamp)
            ).slice(0, limit);

            // Process in parallel with controlled concurrency
            const enhancedTransfers = await Promise.all(
                allTransfers.map(async transfer => {
                    try {
                        const [txReceipt, metadata] = await Promise.all([
                            alchemy.core.getTransactionReceipt(transfer.hash),
                            metadataCache.get(transfer.erc721TokenId) || 
                            this.getNFTMetadata(transfer.erc721TokenId)
                        ]);

                        if (!metadataCache.has(transfer.erc721TokenId)) {
                            metadataCache.set(transfer.erc721TokenId, metadata);
                        }

                        const saleInfo = await this.getSaleInfo(transfer.hash, txReceipt, walletAddress);
                        const tokenId = this.formatTokenId(transfer.erc721TokenId);

                        return {
                            tokenId,
                            tokenName: metadata?.name || `Plot #${tokenId}`,
                            neighborhood: metadata?.raw?.metadata?.attributes?.find(attr => 
                                attr.trait_type === 'Neighborhood')?.value,
                            zone: metadata?.raw?.metadata?.attributes?.find(attr => 
                                attr.trait_type === 'Zone' || 
                                attr.trait_type === 'Zoning Type')?.value,
                            openSeaLink: `https://opensea.io/assets/ethereum/${WIAMI_CONTRACT_ADDRESS}/${tokenId}`,
                            transactionType: saleInfo.type,
                            value: saleInfo.value,
                            icon: saleInfo.icon,
                            fromAddress: transfer.from,
                            toAddress: transfer.to,
                            txHash: transfer.hash,
                            etherscanLink: `https://etherscan.io/tx/${transfer.hash}`,
                            timestamp: transfer.metadata.blockTimestamp,
                            timeAgo: this.formatTimeAgo(transfer.metadata.blockTimestamp)
                        };
                    } catch (error) {
                        console.error(`Error processing transfer:`, error);
                        return null;
                    }
                })
            );

            return enhancedTransfers.filter(Boolean);

        } catch (error) {
            console.error("Error fetching collection transfers:", error);
            return [];
        }
    }

    // New helper method to get sale information
    static async getSaleInfo(txHash, txReceipt, searchedAddress) {
        try {
            searchedAddress = searchedAddress.toLowerCase();
            
            // Add marketplace contract addresses
            const SEAPORT_ADDRESSES = [
                "0x00000000006c3852cbEf3e08E8dF289169EdE581".toLowerCase(), // Seaport 1.1
                "0x00000000000006c7676171937C990c3976D7C140".toLowerCase(), // Seaport 1.2
                "0x0000000000000aD24e80fd803C6ac37206a45f15".toLowerCase(), // Seaport 1.3
                "0x00000000000001ad428e4906aE43D8F9852d0dD6".toLowerCase(), // Seaport 1.4
                "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC".toLowerCase(), // Seaport 1.5
                "0x0000000000000068F116a894984e2DB1123eB395".toLowerCase()  // Seaport 1.6
            ];

            const RESERVOIR_ADDRESSES = [
                "0xC2c862322E9c97D6244a3506655DA95F05246Fd8".toLowerCase(), // Reservoir V6.0.1
                "0x178A86D36D89c7FDeBeA90b739605da7B131ff6A".toLowerCase(), // Reservoir Router
                "0xb233e3602BB06AA2c2dB0982BBaf33c2b15184C9".toLowerCase()  // Reservoir Exchange
            ];
            
            const NATIVE_ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

            // First find the NFT transfer to determine direction
            const nftTransferLog = txReceipt.logs.find(log => 
                log.address.toLowerCase() === WIAMI_CONTRACT_ADDRESS.toLowerCase() &&
                log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
            );

            if (!nftTransferLog) {
                return { type: 'transfer', value: null, icon: '↔️' };
            }

            const nftFrom = `0x${nftTransferLog.topics[1].slice(26)}`.toLowerCase();
            const nftTo = `0x${nftTransferLog.topics[2].slice(26)}`.toLowerCase();
            
            // Check if this is a marketplace transaction
            const isMarketplaceTx = SEAPORT_ADDRESSES.includes(txReceipt.to?.toLowerCase()) || 
                                   RESERVOIR_ADDRESSES.includes(txReceipt.to?.toLowerCase());

            if (isMarketplaceTx) {
                // Look for both WETH and native ETH transfers
                const transferEvents = txReceipt.logs.filter(log => 
                    log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                    (log.address.toLowerCase() === WETH_CONTRACT.toLowerCase())
                );

                // Get transaction for native ETH value
                const tx = await alchemy.core.getTransaction(txHash);
                const ethValue = tx?.value ? BigInt(tx.value) : BigInt(0);

                let totalValue = ethValue;
                
                // Add any WETH transfers
                for (const event of transferEvents) {
                    if (event.address.toLowerCase() === WETH_CONTRACT.toLowerCase()) {
                        totalValue += BigInt(event.data);
                    }
                }

                if (totalValue > 0) {
                    const formattedValue = ethers.formatEther(totalValue.toString());
                    const currency = ethValue > 0 ? 'ETH' : 'WETH';

                    if (nftTo === searchedAddress) {
                        return {
                            type: 'bought',
                            value: `${formattedValue} ${currency}`,
                            icon: '🛍️'
                        };
                    } else if (nftFrom === searchedAddress) {
                        return {
                            type: 'sale',
                            value: `${formattedValue} ${currency}`,
                            icon: '🏷️'
                        };
                    }
                }
            }

            // If no sale value found, it's a transfer
            return { 
                type: 'transfer', 
                value: null,
                icon: '↔️'
            };

        } catch (error) {
            console.error('Error getting sale info:', error);
            return { 
                type: 'transfer', 
                value: null,
                icon: '↔️'
            };
        }
    }
}

export default BlockchainAPI;