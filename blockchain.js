const { Network, Alchemy } = require("alchemy-sdk");

const settings = {
    apiKey: "eFm2JZg30eZjF6Ai0VGhqu4KyUEPkh--",
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);

async function getTokenHoldings(address) {
    try {
        console.log('Fetching holdings for address:', address);
        
        // Basic NFT fetch with free plan options
        const response = await alchemy.nft.getNftsForOwner(address, {
            pageSize: 100,
            // Only use parameters available in free plan
        });

        // Filter for your specific land parcel contract address
        const formattedNfts = response.ownedNfts
            .filter(nft => 
                // Add your land parcel contract address here
                nft.contract.address.toLowerCase() === '0xd396ca541F501f5D303166C509e2045848df356b'.toLowerCase()
            )
            .map(nft => ({
                tokenId: nft.tokenId,
                tokenType: nft.tokenType,
                name: nft.name || 'Unnamed',
                description: nft.description,
                contractAddress: nft.contract.address,
                balance: nft.balance
            }));

        return {
            nfts: formattedNfts,
            totalCount: formattedNfts.length
        };

    } catch (error) {
        console.error('Error fetching token holdings:', error);
        throw error;
    }
}

module.exports = { getTokenHoldings };