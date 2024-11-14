import BlockchainAPI from '../../blockchain/api.js';
import AnalyticsProcessor from '../../blockchain/analytics.js';

export const handler = async (event) => {
    const address = event.path.split('/').pop();
    
    try {
        // Get both NFT holdings and transfers in parallel
        const [nfts, transfers] = await Promise.all([
            BlockchainAPI.getAddressHoldings(address),
            BlockchainAPI.getCollectionTransfers(30, address) // Changed from 5 to 30
        ]);
        
        // Process analytics
        const analytics = AnalyticsProcessor.processHoldings(nfts);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                nfts: nfts.ownedNfts || [],
                totalCount: nfts.totalCount || 0,
                address: address,
                analytics: analytics,
                transfers: transfers // This will now include full metadata, neighborhood info, etc.
            })
        };
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message || 'Unknown error occurred',
                address: address
            })
        };
    }
};