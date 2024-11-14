import { Alchemy, Network } from "alchemy-sdk";

export const handler = async (event) => {
    try {
        const ensName = event.path.split('/').pop();
        
        // Configure Alchemy
        const config = {
            apiKey: process.env.ALCHEMY_API_KEY,
            network: Network.ETH_MAINNET
        };
        const alchemy = new Alchemy(config);

        // Use Alchemy's built-in ENS resolution
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