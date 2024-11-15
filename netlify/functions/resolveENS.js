import { Alchemy, Network } from "alchemy-sdk";

// Utility function for internal use
export const resolveEns = async (address) => {
    if (!address) return null;
    
    try {
        const config = {
            apiKey: process.env.ALCHEMY_API_KEY,
            network: Network.ETH_MAINNET
        };
        const alchemy = new Alchemy(config);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ENS lookup timeout')), 5000);
        });

        // Race between the ENS lookup and timeout
        const ensName = await Promise.race([
            alchemy.core.lookupAddress(address),
            timeoutPromise
        ]);

        return ensName || null;
    } catch (error) {
        // Silently fail and return null for any ENS errors
        console.log(`ENS resolution skipped for ${address}`);
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