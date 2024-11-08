import BlockchainAPI from '../../blockchain/api.js';

export const handler = async (event) => {
    const address = event.path.split('/').pop();
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    try {
        const nfts = await BlockchainAPI.getAddressHoldings(address);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                nfts: nfts.ownedNfts || [],
                totalCount: nfts.totalCount || 0,
                address: address
            })
        };
    } catch (error) {
        console.error('Function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Unknown error occurred',
                address: address
            })
        };
    }
};