export class OpenSeaListings {
    constructor() {
        this.container = document.getElementById('opensea-listings-container');
        this.loader = document.getElementById('opensea-listings-loader');
        this.loading = false;
        this.zoningIcons = {
            'Legendary': '👾',
            'Mixed Use': '🏆',
            'Residential': '🏠',
            'Commercial': '🏢',
            'Industrial': '🏭'
        };
        this.loadListings();
    }

    convertWeiToEth(weiValue) {
        return (parseFloat(weiValue) / 1e18).toFixed(4);
    }

    async getTokenMetadata(tokenId) {
        try {
            const response = await fetch('/.netlify/functions/getTokenMetadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tokenId })
            });
            
            if (!response.ok) throw new Error('Failed to fetch metadata');
            return await response.json();
        } catch (error) {
            console.error('Error fetching metadata for token', tokenId, error);
            return null;
        }
    }

    getZoningIcon(attributes) {
        const zoningType = attributes.find(attr => attr.trait_type === 'Zoning Type')?.value;
        return this.zoningIcons[zoningType] || '';
    }

    formatExpirationDate(date) {
        if (!date) return '';
        
        const month = date.toLocaleString('en-US', { month: 'short' });
        const day = date.getDate();
        const time = date.toLocaleString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        return `${month} ${day}, ${time}`;
    }

    async renderListingCard(listing) {
        console.log('Listing data:', {
            expirationTime: listing.expiration_time,
            rawListing: listing
        });

        const priceWei = listing.price?.current?.value || '0';
        const priceEth = this.convertWeiToEth(priceWei);
        const currency = listing.price?.current?.currency || 'ETH';
        const tokenId = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
        
        const endTimeUnix = listing.protocol_data?.parameters?.endTime;
        const expirationTime = endTimeUnix ? new Date(parseInt(endTimeUnix) * 1000) : null;
        const formattedExpiration = this.formatExpirationDate(expirationTime);

        let metadata = null;
        if (tokenId) {
            metadata = await this.getTokenMetadata(tokenId);
        }

        const openSeaLink = `https://opensea.io/assets/ethereum/0x2c88aa0956bc9813505d73575f653f69ada60923/${tokenId}`;

        return `
            <div class="listing-card">
                ${metadata ? `
                    <div class="listing-image">
                        <img src="https://arweave.net/${metadata.metadata.image.replace('ar://', '')}" 
                             alt="${metadata.metadata.name}" />
                    </div>
                    <div class="listing-info">
                        <div class="title-price-row">
                            <h3 class="listing-title">
                                <span class="zoning-icon">${this.getZoningIcon(metadata.metadata.attributes)}</span>
                                ${metadata.metadata.name}
                            </h3>
                            <div class="price-info">
                                <div class="expiration">Expires ${formattedExpiration}</div>
                                <div class="price">${priceEth} ${currency}</div>
                            </div>
                        </div>
                        <div class="traits">
                            ${metadata.metadata.attributes
                                .filter(attr => !attr.display_type)
                                .map(attr => `
                                    <div class="trait">
                                        <span class="trait-type">${attr.trait_type}</span>
                                        <span class="trait-value">${attr.value}</span>
                                    </div>
                                `).join('')}
                        </div>
                        <a href="${openSeaLink}" target="_blank" class="buy-button">
                            Buy on OpenSea
                        </a>
                    </div>
                ` : `
                    <div class="listing-info">
                        <div class="token-id">Token ID: ${tokenId || 'N/A'}</div>
                        <div class="price">${priceEth} ${currency}</div>
                        <a href="${openSeaLink}" target="_blank" class="buy-button">
                            Buy on OpenSea
                        </a>
                    </div>
                `}
            </div>
        `;
    }

    async renderListings(listings) {
        const sortedListings = [...listings].sort((a, b) => {
            const priceA = BigInt(a.price?.current?.value || '0');
            const priceB = BigInt(b.price?.current?.value || '0');
            return priceA < priceB ? -1 : priceA > priceB ? 1 : 0;
        });

        const listingsHTML = await Promise.all(
            sortedListings.map(listing => this.renderListingCard(listing))
        );
        
        this.container.innerHTML = listingsHTML.join('');
    }

    async loadListings() {
        if (this.loading) return;
        
        try {
            this.loading = true;
            if (this.loader) this.loader.style.display = 'block';
            
            const response = await fetch(`/.netlify/functions/getOpenSeaListings`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            console.log('Raw OpenSea response:', data);

            if (data.error) throw new Error(data.error);
            
            const listings = data.listings || [];
            if (listings.length === 0) {
                this.container.innerHTML = '<div class="no-listings">No active listings found</div>';
                return;
            }
            
            await this.renderListings(listings);
            
        } catch (error) {
            console.error('Error loading listings:', error);
            this.container.innerHTML = `<div class="error-message">Error loading listings: ${error.message}</div>`;
        } finally {
            this.loading = false;
            if (this.loader) this.loader.style.display = 'none';
        }
    }
}