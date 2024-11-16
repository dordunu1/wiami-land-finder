const plotData = require('./data/metadata.json');

export const handler = async (event) => {
    const { tokenId, plotName } = event.queryStringParameters;
    
    try {
        let nft;
        
        if (tokenId) {
            nft = plotData.nfts.find(nft => nft.tokenID === tokenId);
        } else if (plotName) {
            nft = plotData.nfts.find(nft => nft.metadata.name === plotName);
        }
        
        if (!nft) {
            return {
                statusCode: 404,
                body: JSON.stringify({ 
                    error: `Metadata not found for ${tokenId ? `token ${tokenId}` : `plot ${plotName}`}` 
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(nft.metadata)
        };
    } catch (error) {
        console.error('Metadata fetch error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch NFT metadata' })
        };
    }
};