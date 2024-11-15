import { Alchemy, Network } from "alchemy-sdk";

// Utility function for internal use
export const resolveEns = async (address) => {
    try {
        const config = {
            apiKey: process.env.ALCHEMY_API_KEY,
            network: Network.ETH_MAINNET
        };
        const alchemy = new Alchemy(config);

        // Get ENS name for the address
        const ensName = await alchemy.core.lookupAddress(address);
        return ensName || null;
    } catch (error) {
        console.error('Error resolving ENS:', error);
        return null;
    }
};

// Netlify serverless function handler
export const handler = async (event) => {
    try {
        const ensName = event.path.split('/').pop();
        
        const config = {
            apiKey: process.env.ALCHEMY_API_KEY,
            network: Network.ETH_MAINNET
        };
        const alchemy = new Alchemy(config);

        const address = await alchemy.core.resolveName(ensName);
        
        if (!address) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ENS name not found'
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                address: address,
                ensName: ensName
            })
        };
    } catch (error) {
        console.error('ENS resolution error:', error);
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message || 'Failed to resolve ENS name'
            })
        };
    }
};