import { metadataService } from './services/metadataService.js';
import { resolveEns } from './resolveENS.js';
import { ethers } from 'ethers';

const RESERVOIR_API_URL = "https://api.reservoir.tools";
const RESERVOIR_API_KEY = "ac3f642b-6b7a-5ed3-910c-9792832c9a6b";
const WWMM_CONTRACT = "0xd396ca541F501f5D303166C509e2045848df356b";
const WILD_TOKEN = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";
const WWMM_MARKETPLACE = "0x5ebc127fae83ed5bdd91fc6a5f5767E259dF5642";

class WWMMActivityAPI {
    static async getRecentActivity(limit = 25, pageKey = null) {
        try {
            await metadataService.initialize();
            
            console.log('Fetching WWMM WILD sales from Reservoir...');
            
            let url = `${RESERVOIR_API_URL}/sales/v6?contract=${WWMM_CONTRACT}&limit=100&payment=${WILD_TOKEN}`;
            if (pageKey) {
                url += `&continuation=${pageKey}`;
            }

            const response = await fetch(url, {
                headers: {
                    'accept': '*/*',
                    'x-api-key': RESERVOIR_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`Reservoir API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Raw sales received:', data.sales?.length);

            if (!data.sales || data.sales.length === 0) {
                return {
                    activities: [],
                    pageKey: null
                };
            }

            const activities = await Promise.all(data.sales.map(async sale => {
                try {
                    const isWildSale = sale.price?.currency?.contract?.toLowerCase() === WILD_TOKEN.toLowerCase();
                    const isWWMMSale = sale.fillSource?.toLowerCase()?.includes('wilder') || 
                                     sale.orderSource?.toLowerCase()?.includes('wilder');

                    if (!isWildSale || !isWWMMSale) {
                        console.log('Filtered out sale:', {
                            tokenId: sale.token.tokenId,
                            isWildSale,
                            isWWMMSale,
                            source: sale.fillSource || sale.orderSource
                        });
                        return null;
                    }

                    const [fromENS, toENS] = await Promise.all([
                        resolveEns(sale.from),
                        resolveEns(sale.to)
                    ]);

                    const tokenMetadata = await metadataService.getMetadataForToken(sale.token.tokenId);
                    
                    const wildAmount = ethers.formatEther(sale.price.amount.raw);
                    
                    return {
                        tokenId: sale.token.tokenId,
                        tokenName: tokenMetadata?.name || `Plot #${sale.token.tokenId}`,
                        neighborhood: tokenMetadata?.neighborhood || 'Unknown',
                        zoningType: tokenMetadata?.attributes?.find(
                            attr => attr.trait_type === 'Zoning Type'
                        )?.value || 'Unknown',
                        image: tokenMetadata?.image || '',
                        metadata: tokenMetadata,
                        from: sale.from,
                        fromEns: fromENS,
                        to: sale.to,
                        toEns: toENS,
                        value: wildAmount,
                        currency: 'WILD',
                        timestamp: sale.timestamp * 1000,
                        transactionHash: sale.txHash,
                        type: 'wwmm_wild_sale',
                        etherscanLink: `https://etherscan.io/tx/${sale.txHash}`,
                        wwmmlink: `https://market.wilderworld.com/collections/${WWMM_CONTRACT}/networks/mainnet?tab=activity`
                    };
                } catch (error) {
                    console.error(`Error processing WILD sale for token ${sale.token?.tokenId}:`, error);
                    return null;
                }
            }));

            const validActivities = activities.filter(activity => activity !== null);
            console.log('Valid WWMM WILD sales found:', validActivities.length);

            return {
                activities: validActivities,
                pageKey: data.continuation
            };

        } catch (error) {
            console.error("Error fetching WWMM WILD activity:", error);
            throw error;
        }
    }
}

export { WWMMActivityAPI };