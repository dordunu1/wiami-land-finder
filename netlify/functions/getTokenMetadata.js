import path from 'path';

// Import the metadata directly since it's in the same folder
import metadata from './data/metadata.json';

export const handler = async (event) => {
    try {
        const { tokenId } = JSON.parse(event.body || '{}');
        
        if (!tokenId) {
            throw new Error('Token ID is required');
        }

        // Find the matching token in the metadata
        const tokenData = metadata.nfts.find(nft => nft.tokenID === tokenId);

        if (!tokenData) {
            throw new Error(`Metadata not found for token ${tokenId}`);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(tokenData)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};