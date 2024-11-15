import { metadataService } from './services/metadataService.js';
import { resolveEns } from './resolveENS.js'; 

const OPENSEA_API_URL = "https://api.opensea.io/api/v2";
const COLLECTION_SLUG = "wilder-land-the-island";

if (!process.env.OPENSEA_API_KEY) {
    throw new Error('OPENSEA_API_KEY is not defined in environment variables');
}

class ActivityAPI {
    static async getRecentSales(limit = 50, pageKey = null) {
        try {
            await metadataService.initialize();
            
            console.log('Fetching OpenSea events...');
            
            // Construct URL with parameters - fixed pagination handling
            let url = `${OPENSEA_API_URL}/events/collection/${COLLECTION_SLUG}?limit=${limit}&event_type=sale`;
            if (pageKey && pageKey !== '1') { // Don't add next parameter for first page
                url += `&cursor=${encodeURIComponent(pageKey)}`;
            }
            
            console.log('Requesting URL:', url);

            // Fetch events from OpenSea
            const response = await fetch(url, {
                headers: {
                    'x-api-key': process.env.OPENSEA_API_KEY,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`OpenSea API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Check if data has the correct structure
            if (!data || !Array.isArray(data.asset_events)) {
                console.error('Unexpected API response structure:', data);
                return {
                    sales: [],
                    pageKey: null
                };
            }

            console.log('Events received:', data.asset_events.length);

            // Process each sale event
            const sales = await Promise.all(data.asset_events.map(async event => {
                try {
                    if (!event.nft || !event.nft.identifier) return null;
    
                    const metadata = await metadataService.getMetadataForToken(event.nft.identifier);
                    if (!metadata) return null;
    
                    // Resolve ENS names using your existing resolver
                    const [fromEns, toEns] = await Promise.all([
                        event.seller ? resolveEns(event.seller) : null,
                        event.buyer ? resolveEns(event.buyer) : null
                    ]);

                    const isWETH = event.payment?.symbol === 'WETH' || 
                                 event.payment?.token_address === '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    
                    return {
                        tokenId: event.nft.identifier,
                        name: event.nft.name,
                        price: event.payment?.quantity || '0',
                        priceToken: isWETH ? 'WETH' : 'ETH',
                        timestamp: event.event_timestamp * 1000,
                        from: event.seller || 'Unknown',
                        fromEns,
                        to: event.buyer || 'Unknown',
                        toEns,
                        txHash: event.transaction || '',
                        platform: 'OpenSea',
                        image: metadata.image?.replace('ar://', 'https://arweave.net/'),
                        neighborhood: metadata.neighborhood,
                        zoningType: metadata.zoningType,
                        traits: metadata.attributes
                    };
                } catch (error) {
                    console.error(`Error processing event for token ${event.nft?.identifier}:`, error);
                    return null;
                }
            }));
            const validSales = sales.filter(sale => sale !== null);
            console.log('Total valid sales found:', validSales.length);

            return {
                sales: validSales,
                pageKey: data.next
            };

        } catch (error) {
            console.error("Error fetching OpenSea events:", error);
            throw error;
        }
    }
}

export { ActivityAPI };