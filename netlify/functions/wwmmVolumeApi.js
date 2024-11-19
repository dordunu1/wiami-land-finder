import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from 'ethers';

const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);
const WILD_TOKEN = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";
const LAND_CONTRACT = "0xd396ca541F501f5D303166C509e2045848df356b";
const WWMM_SALES = "0xb233e3602BB06AA2c2dB0982BBaf33c2b15184C9";
const WWMM_SALES_V2 = "0x5ebc127fae83ed5bdd91fc6a5f5767E259dF5642";

class WWMMVolumeAPI {
    static async getTransactionWithRetry(hash, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const [txReceipt, tx] = await Promise.all([
                    alchemy.core.getTransactionReceipt(hash),
                    alchemy.core.getTransaction(hash)
                ]);
                return [txReceipt, tx];
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }

    static async getWildPrice() {
        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=0x2a3bFF78B79A009976EeA096a51A948a3dC00e34&vs_currencies=usd'
            );
            const data = await response.json();
            return data['0x2a3bff78b79a009976eea096a51a948a3dc00e34'].usd;
        } catch (error) {
            console.warn('Failed to fetch WILD price:', error);
            return null;
        }
    }

    static async getVolumeStats() {
        try {
            const now = Math.floor(Date.now() / 1000);
            const oneDayAgo = now - 24 * 60 * 60;
            const sevenDaysAgo = now - 7 * 24 * 60 * 60;

            const params = {
                fromBlock: "0x0",
                contractAddresses: [LAND_CONTRACT],
                category: ["erc721"],
                withMetadata: true,
                maxCount: "0xC8", // Increased to 200 transfers
                order: "desc"
            };

            let allTransfers = [];
            let pageKey = null;
            
            // Fetch multiple pages of transfers if needed
            do {
                if (pageKey) params.pageKey = pageKey;
                const response = await alchemy.core.getAssetTransfers(params);
                allTransfers = [...allTransfers, ...response.transfers];
                pageKey = response.pageKey;
                
                // Break if we have enough recent transfers
                if (allTransfers.length > 0) {
                    const oldestTransfer = allTransfers[allTransfers.length - 1];
                    const timestamp = Math.floor(new Date(oldestTransfer.metadata.blockTimestamp).getTime() / 1000);
                    if (timestamp < sevenDaysAgo) break;
                }
                
                if (pageKey) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } while (pageKey);

            console.log('Found total NFT transfers:', allTransfers.length);

            const volumes = {
                oneDay: { volume: BigInt(0), count: 0 },
                sevenDay: { volume: BigInt(0), count: 0 },
                allTime: { volume: BigInt(0), count: 0 }
            };

            const processedTxs = new Set();

            // Process transfers in batches of 10
            const batchSize = 10;
            for (let i = 0; i < allTransfers.length; i += batchSize) {
                const batch = allTransfers.slice(i, i + batchSize);
                
                const batchPromises = batch.map(async (transfer) => {
                    if (processedTxs.has(transfer.hash)) return null;
                    processedTxs.add(transfer.hash);

                    try {
                        const [txReceipt, tx] = await this.getTransactionWithRetry(transfer.hash);

                        const isWWMMTx = txReceipt.to?.toLowerCase() === WWMM_SALES.toLowerCase() || 
                                       txReceipt.to?.toLowerCase() === WWMM_SALES_V2.toLowerCase();
                        if (!isWWMMTx) return null;

                        const block = await alchemy.core.getBlock(tx.blockNumber);
                        const timestamp = block.timestamp;

                        const wildTransfers = txReceipt.logs.filter(log => 
                            log.address.toLowerCase() === WILD_TOKEN.toLowerCase() &&
                            log.topics[0] === ethers.id("Transfer(address,address,uint256)")
                        );

                        let wildValue = BigInt(0);
                        for (const wildLog of wildTransfers) {
                            wildValue += BigInt(wildLog.data);
                        }

                        if (wildValue > 0) {
                            return {
                                timestamp,
                                value: wildValue
                            };
                        }
                        return null;
                    } catch (error) {
                        console.warn(`Warning: Failed to process transfer ${transfer.hash}:`, error.message);
                        return null;
                    }
                });

                const results = await Promise.all(batchPromises);
                const validSales = results.filter(result => result !== null);

                for (const sale of validSales) {
                    volumes.allTime.volume += sale.value;
                    volumes.allTime.count++;

                    if (sale.timestamp >= sevenDaysAgo) {
                        volumes.sevenDay.volume += sale.value;
                        volumes.sevenDay.count++;

                        if (sale.timestamp >= oneDayAgo) {
                            volumes.oneDay.volume += sale.value;
                            volumes.oneDay.count++;
                        }
                    }
                }

                // Add small delay between batches
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Fetch WILD price first
            const wildPrice = await this.getWildPrice();
            
            return {
                oneDay: {
                    volume: ethers.formatEther(volumes.oneDay.volume.toString()),
                    volumeUSD: wildPrice ? (Number(ethers.formatEther(volumes.oneDay.volume.toString())) * wildPrice).toFixed(2) : null,
                    count: volumes.oneDay.count
                },
                sevenDay: {
                    volume: ethers.formatEther(volumes.sevenDay.volume.toString()),
                    volumeUSD: wildPrice ? (Number(ethers.formatEther(volumes.sevenDay.volume.toString())) * wildPrice).toFixed(2) : null,
                    count: volumes.sevenDay.count
                },
                allTime: {
                    volume: ethers.formatEther(volumes.allTime.volume.toString()),
                    volumeUSD: wildPrice ? (Number(ethers.formatEther(volumes.allTime.volume.toString())) * wildPrice).toFixed(2) : null,
                    count: volumes.allTime.count
                },
                wildPrice: wildPrice
            };
        } catch (error) {
            console.error("Error fetching volume stats:", error);
            return {
                oneDay: { volume: "0", volumeUSD: null, count: 0 },
                sevenDay: { volume: "0", volumeUSD: null, count: 0 },
                allTime: { volume: "0", volumeUSD: null, count: 0 },
                wildPrice: null
            };
        }
    }
}

export { WWMMVolumeAPI };