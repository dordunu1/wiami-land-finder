import fs from 'fs/promises';
import path from 'path';

class MetadataService {
    constructor() {
        this.metadata = null;
        this.metadataByTokenId = new Map();
        this.metadataByTag = new Map();
    }

    async initialize() {
        try {
            const metadataPath = path.join(process.cwd(), 'data', 'metadata.json');
            const data = await fs.readFile(metadataPath, 'utf8');
            const jsonData = JSON.parse(data);
            this.metadata = jsonData.nfts;
            
            this.metadata.forEach(nft => {
                try {
                    const tag = nft.tag?.toString();
                    const tokenId = nft.tokenID?.toString();
                    const metadata = nft.metadata;
                    
                    if (!metadata || !metadata.attributes) {
                        console.warn(`Missing metadata or attributes for tag ${tag}`);
                        return;
                    }

                    const attributes = metadata.attributes;
                    const neighborhood = attributes.find(attr => 
                        attr.trait_type === 'Neighborhood'
                    )?.value || 'Unknown';
                    
                    const zoningType = attributes.find(attr => 
                        attr.trait_type === 'Zoning Type'
                    )?.value || 'Unknown';
                    
                    const metadataObj = {
                        name: metadata.name,
                        neighborhood,
                        zoningType,
                        attributes: metadata.attributes,
                        image: metadata.image || '',
                        animation_url: metadata.animation_url || ''
                    };

                    // Store by both tag and tokenId
                    if (tag) this.metadataByTag.set(tag, metadataObj);
                    if (tokenId) this.metadataByTokenId.set(tokenId, metadataObj);
                } catch (error) {
                    console.error(`Error processing NFT metadata:`, error, nft);
                }
            });
            
            console.log('Metadata initialized with', this.metadataByTokenId.size, 'tokenID entries and', 
                        this.metadataByTag.size, 'tag entries');
        } catch (error) {
            console.error('Error loading metadata:', error);
            throw error;
        }
    }

    getMetadataForToken(tokenId) {
        if (!tokenId) return null;
        
        // Try to get metadata by tokenId
        const metadata = this.metadataByTokenId.get(tokenId.toString());
        if (metadata) {
            console.log('Found metadata for token', tokenId, ':', metadata);
            return metadata;
        }

        // If not found by tokenId, try to find by tag
        const tag = this.findMatchingTag(tokenId);
        if (tag) {
            const tagMetadata = this.metadataByTag.get(tag);
            console.log('Found metadata by tag', tag, ':', tagMetadata);
            return tagMetadata;
        }

        console.warn(`No metadata found for token ${tokenId}`);
        return null;
    }

    findMatchingTag(tokenId) {
        // Convert tokenId to string and try to match with tags
        const tokenIdStr = tokenId.toString();
        for (const [tag] of this.metadataByTag) {
            if (tokenIdStr.includes(tag) || tag.includes(tokenIdStr)) {
                return tag;
            }
        }
        return null;
    }
}

export const metadataService = new MetadataService();