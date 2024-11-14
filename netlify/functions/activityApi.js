import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from 'ethers';
import { metadataService } from './services/metadataService.js';

// Configure Alchemy SDK
const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

// Contract addresses
const WIAMI_CONTRACT = "0xd396ca541F501F5D303166C509e2045848df356b";
const WETH_CONTRACT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Marketplace contracts
const SEAPORT_ADDRESSES = [
    "0x00000000006c3852cbEf3e08E8dF289169EdE581", // Seaport 1.1
    "0x00000000000006c7676171937C990c3976D7C140", // Seaport 1.2
    "0x0000000000000aD24e80fd803C6ac37206a45f15", // Seaport 1.3
    "0x00000000000001ad428e4906aE43D8F9852d0dD6", // Seaport 1.4
    "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC", // Seaport 1.5
    "0x0000000000000068F116a894984e2DB1123eB395"  // Seaport 1.6
].map(addr => addr.toLowerCase());

const RESERVOIR_ADDRESSES = [
    "0xC2c862322E9c97D6244a3506655DA95F05246Fd8", // Reservoir V6.0.1
    "0x178A86D36D89c7FDeBeA90b739605da7B131ff6A", // Reservoir Router
    "0xb233e3602BB06AA2c2dB0982BBaf33c2b15184C9"  // Reservoir Exchange
].map(addr => addr.toLowerCase());

class ActivityAPI {
    static async getRecentSales(limit = 25, pageKey = null) {
        try {
            await metadataService.initialize();
            
            console.log('Fetching transfers...');
            
            const params = {
                fromBlock: "0x0",
                contractAddresses: [WIAMI_CONTRACT],
                category: ["erc721"],
                withMetadata: true,
                maxCount: "0x32", // Fetch 50 transfers - enough to find ~25 sales
                order: "desc"
            };

            if (pageKey && pageKey !== 'null' && pageKey !== 'undefined') {
                params.pageKey = pageKey;
            }

            const transfers = await alchemy.core.getAssetTransfers(params);
            console.log('Transfers received:', transfers.transfers.length);

            const sales = [];
            const processedTxs = new Set();
            const batchPromises = transfers.transfers.map(async (transfer) => {
                if (processedTxs.has(transfer.hash)) return null;
                processedTxs.add(transfer.hash);

                try {
                    const [txReceipt, tx] = await Promise.all([
                        alchemy.core.getTransactionReceipt(transfer.hash),
                        alchemy.core.getTransaction(transfer.hash)
                    ]);

                    const [fromENS, toENS] = await Promise.all([
                        alchemy.core.lookupAddress(transfer.from),
                        alchemy.core.lookupAddress(transfer.to)
                    ]);

                    const isMarketplaceTx = SEAPORT_ADDRESSES.includes(txReceipt.to?.toLowerCase()) || 
                                          RESERVOIR_ADDRESSES.includes(txReceipt.to?.toLowerCase());

                    if (!isMarketplaceTx) return null;

                    const tokenId = BigInt(transfer.tokenId).toString();
                    const block = await alchemy.core.getBlock(tx.blockNumber);
                    const ethValue = tx?.value ? BigInt(tx.value) : BigInt(0);
                    let totalValue = ethValue;

                    const wethTransfers = txReceipt.logs.filter(log => 
                        log.address.toLowerCase() === WETH_CONTRACT.toLowerCase() &&
                        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
                    );

                    for (const wethLog of wethTransfers) {
                        totalValue += BigInt(wethLog.data);
                    }

                    if (totalValue > 0) {
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
                            value: ethers.formatEther(totalValue.toString()),
                            currency: ethValue > 0 ? 'ETH' : 'WETH',
                            timestamp: block.timestamp * 1000,
                            transactionHash: transfer.hash,
                            type: 'sale',
                            marketplace: SEAPORT_ADDRESSES.includes(txReceipt.to?.toLowerCase()) ? 
                                'OpenSea' : 'Reservoir',
                            etherscanLink: `https://etherscan.io/tx/${transfer.hash}`,
                            openSeaLink: `https://opensea.io/assets/ethereum/${WIAMI_CONTRACT}/${tokenId}`
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error processing transfer ${transfer.hash}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(batchPromises);
            const validSales = results.filter(result => result !== null).slice(0, limit);
            sales.push(...validSales);

            console.log('Total sales found:', sales.length);
            return {
                sales: sales,
                pageKey: transfers.pageKey
            };
        } catch (error) {
            console.error("Error fetching recent sales:", error);
            throw error;
        }
    }
}

export { ActivityAPI };