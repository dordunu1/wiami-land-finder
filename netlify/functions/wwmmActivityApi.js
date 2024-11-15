import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from 'ethers';
import { metadataService } from './services/metadataService.js';
import { resolveEns } from './resolveENS.js';

// Configure Alchemy SDK
const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);
// Contract addresses from the requirements
const WILD_TOKEN = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";
const WWMM_SALES = "0xb233e3602BB06AA2c2dB0982BBaf33c2b15184C9";
const WWMM_SALES_V2 = "0x5ebc127fae83ed5bdd91fc6a5f5767E259dF5642";
const LAND_CONTRACT = "0xd396ca541F501f5D303166C509e2045848df356b";

class WWMMActivityAPI {
    static async getRecentActivity(limit = 25, pageKey = null) {
        try {
            await metadataService.initialize();
            
            console.log('Fetching WWMM Land transfers...');
            
            const params = {
                fromBlock: "0x0",
                contractAddresses: [LAND_CONTRACT], // Track Land NFT transfers
                category: ["erc721"],
                withMetadata: true,
                maxCount: "0x32",
                order: "desc"
            };

            if (pageKey && pageKey !== 'null' && pageKey !== 'undefined') {
                params.pageKey = pageKey;
            }

            const transfers = await alchemy.core.getAssetTransfers(params);
            console.log('Transfers received:', transfers.transfers.length);

            const activities = [];
            const processedTxs = new Set();

            const batchPromises = transfers.transfers.map(async (transfer) => {
                if (processedTxs.has(transfer.hash)) return null;
                processedTxs.add(transfer.hash);

                try {
                    const [txReceipt, tx] = await Promise.all([
                        alchemy.core.getTransactionReceipt(transfer.hash),
                        alchemy.core.getTransaction(transfer.hash)
                    ]);

                    // Verify if transaction involves WWMM contract
                    const isWWMMTx = txReceipt.to?.toLowerCase() === WWMM_SALES.toLowerCase() || 
                                     txReceipt.to?.toLowerCase() === WWMM_SALES_V2.toLowerCase();
                    if (!isWWMMTx) return null;

                    const [fromENS, toENS] = await Promise.all([
                        alchemy.core.lookupAddress(transfer.from),
                        alchemy.core.lookupAddress(transfer.to)
                    ]);

                    const tokenId = BigInt(transfer.tokenId).toString();
                    const block = await alchemy.core.getBlock(tx.blockNumber);

                    // Look for WILD token transfers in the transaction
                    const wildTransfers = txReceipt.logs.filter(log => 
                        log.address.toLowerCase() === WILD_TOKEN.toLowerCase() &&
                        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
                    );

                    let wildValue = BigInt(0);
                    for (const wildLog of wildTransfers) {
                        wildValue += BigInt(wildLog.data);
                    }

                    if (wildValue > 0) {
                        const tokenMetadata = await metadataService.getMetadataForToken(tokenId);
                        return {
                            tokenId,
                            tokenName: tokenMetadata?.name || `Plot #${tokenId}`,
                            neighborhood: tokenMetadata?.neighborhood || 'Unknown',
                            zoningType: tokenMetadata?.attributes?.find(
                                attr => attr.trait_type === 'Zoning Type'
                            )?.value || 'Unknown',
                            image: tokenMetadata?.image || '',
                            metadata: tokenMetadata,
                            from: transfer.from,
                            fromENS: fromENS || null,
                            to: transfer.to,
                            toENS: toENS || null,
                            value: ethers.formatEther(wildValue.toString()),
                            currency: 'WILD',
                            timestamp: block.timestamp * 1000,
                            transactionHash: transfer.hash,
                            type: 'wwmm_sale',
                            etherscanLink: `https://etherscan.io/tx/${transfer.hash}`,
                            wwmmlink: 'https://market.wilderworld.com/collections/0xd396ca541f501f5d303166c509e2045848df356b/networks/mainnet?tab=activity'
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error processing transfer ${transfer.hash}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(batchPromises);
            const validActivities = results.filter(result => result !== null).slice(0, limit);
            activities.push(...validActivities);

            console.log('Total WWMM sales found:', activities.length);
            return {
                activities: activities,
                pageKey: transfers.pageKey
            };
        } catch (error) {
            console.error("Error fetching WWMM activity:", error);
            throw error;
        }
    }
}

export { WWMMActivityAPI };
