class AnalyticsProcessor {
    // Process holdings data
    static processHoldings(nfts) {
        const holdings = {
            totalNFTs: nfts.totalCount,
            nftList: nfts.ownedNfts,
            holdingsByZone: {},
            holdingsByNeighborhood: {}
        };

        // Process each NFT
        nfts.ownedNfts.forEach(nft => {
            try {
                // Access metadata from raw.metadata instead of rawMetadata
                const metadata = nft.raw?.metadata;
                
                console.log("Processing NFT:", {
                    tokenId: nft.tokenId,
                    title: nft.title,
                    metadata: metadata
                });

                // Check if metadata exists and has attributes
                if (metadata && Array.isArray(metadata.attributes)) {
                    const attributes = metadata.attributes;
                    
                    // Count by zone
                    const zoneAttr = attributes.find(attr => 
                        attr.trait_type?.toLowerCase() === "zoning" || 
                        attr.trait_type?.toLowerCase() === "zoning type"
                    );
                    if (zoneAttr?.value) {
                        const zone = zoneAttr.value;
                        holdings.holdingsByZone[zone] = (holdings.holdingsByZone[zone] || 0) + 1;
                    }

                    // Count by neighborhood
                    const neighborhoodAttr = attributes.find(attr => 
                        attr.trait_type?.toLowerCase() === "neighborhood"
                    );
                    if (neighborhoodAttr?.value) {
                        const neighborhood = neighborhoodAttr.value;
                        holdings.holdingsByNeighborhood[neighborhood] = 
                            (holdings.holdingsByNeighborhood[neighborhood] || 0) + 1;
                    }
                } else {
                    console.warn(`No attributes found for NFT ${nft.tokenId}`);
                }
            } catch (error) {
                console.error(`Error processing NFT ${nft.tokenId}:`, error);
            }
        });

        return holdings;
    }

    // Process transfer history
    static processTransferHistory(transfers) {
        if (!transfers || !transfers.transfers) {
            console.warn("No transfers data available");
            return [];
        }

        return transfers.transfers.map(transfer => ({
            tokenId: transfer.tokenId,
            from: transfer.from,
            to: transfer.to,
            timestamp: transfer.metadata?.blockTimestamp,
            transactionHash: transfer.transactionHash
        }));
    }

    // Calculate holding periods
    static calculateHoldingPeriods(transfers) {
        if (!Array.isArray(transfers)) {
            console.warn("Invalid transfers data");
            return {};
        }

        const holdingPeriods = {};
        
        transfers.forEach(transfer => {
            if (!transfer.tokenId) return;

            if (!holdingPeriods[transfer.tokenId]) {
                holdingPeriods[transfer.tokenId] = [];
            }
            
            holdingPeriods[transfer.tokenId].push({
                from: transfer.from,
                to: transfer.to,
                startTime: transfer.timestamp
            });
        });

        return holdingPeriods;
    }
}

export default AnalyticsProcessor;