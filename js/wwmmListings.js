export class WWMMListings {
    constructor() {
        this.container = document.getElementById('wwmm-listings-container');
        this.loader = document.getElementById('wwmm-listings-loader');
        this.loading = false;
        this.listings = [];
        this.zoningIcons = {
            'Legendary': '💎',
            'Mixed Use': '🏆',
            'Residential': '🏠',
            'Commercial': '🏢',
            'Industrial': '🏭'
        };
        
        this.filters = {
            zoningType: 'All Zoning Types',
            neighborhood: 'All Neighborhoods',
            sortBy: 'Price: Low to High',
            priceMin: '',
            priceMax: ''
        };
        
        this.filterOptions = {
            zoningType: ['All Zoning Types', 'Residential', 'Commercial', 'Industrial', 'Mixed Use', 'Legendary'],
            neighborhood: ['All Neighborhoods', 'North Star', 'Little Meow', 'Flashing Lights', 'Tranquility Gardens', 'District ZERO', 'Space Mind', 'Nexus', 'Haven Heights'],
            sortBy: ['Price: Low to High', 'Price: High to Low', 'Rarity: High to Low', 'Rarity: Low to High']
        };

        this.rarityRankings = null;
        this.init();
    }

    async init() {
        await this.loadRarityRankings();
        this.setupFilters();
        await this.loadListings();
    }

    async loadRarityRankings() {
        try {
            const response = await fetch('/.netlify/functions/getRarityRankings');
            if (!response.ok) throw new Error('Failed to load rarity rankings');
            this.rarityRankings = await response.json();
        } catch (error) {
            console.error('Error loading rarity rankings:', error);
            this.rarityRankings = {};
        }
    }

    getRarityRank(tokenName) {
        return this.rarityRankings?.[tokenName] || null;
    }

    async getTokenMetadata(tokenId) {
        try {
            const response = await fetch(`/.netlify/functions/getTokenMetadata?tokenId=${tokenId}`);
            if (!response.ok) throw new Error('Failed to fetch token metadata');
            return await response.json();
        } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId}:`, error);
            return null;
        }
    }

    setupFilters() {
        const filterContainer = document.getElementById('wwmm-listings-filters');
        if (!filterContainer) {
            console.error('Filter container not found');
            return;
        }

        Object.entries(this.filterOptions).forEach(([filterType, options]) => {
            const select = filterContainer.querySelector(`[data-filter="${filterType}"]`);
            if (select) {
                select.innerHTML = ''; // Clear existing options
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    select.appendChild(optionElement);
                });

                select.addEventListener('change', (e) => {
                    this.filters[filterType] = e.target.value;
                    this.applyFilters();
                });
            }
        });
    }

    async applyFilters() {
        if (!this.listings?.length) return;
        
        let filteredListings = [...this.listings];
        
        // Apply zoning type filter
        if (this.filters.zoningType !== 'All Zoning Types') {
            filteredListings = filteredListings.filter(listing => {
                const zoningType = listing.metadata?.metadata?.attributes?.find(
                    attr => attr.trait_type === 'Zoning Type'
                )?.value;
                return zoningType === this.filters.zoningType;
            });
        }

        // Apply neighborhood filter
        if (this.filters.neighborhood !== 'All Neighborhoods') {
            filteredListings = filteredListings.filter(listing => {
                const neighborhood = this.getNeighborhood(listing.metadata?.metadata?.name);
                return neighborhood === this.filters.neighborhood;
            });
        }

        // Apply price sorting
        filteredListings.sort((a, b) => {
            const priceA = parseFloat(a.price?.amount?.native) || 0;
            const priceB = parseFloat(b.price?.amount?.native) || 0;
            
            if (this.filters.sortBy === 'Price: High to Low') {
                return priceB - priceA;
            }
            return priceA - priceB;
        });

        await this.renderListings(filteredListings);
    }

    getNeighborhood(name) {
        if (!name) return 'Unknown';
        const prefix = name.split('-')[0];
        const neighborhoods = {
            'NS': 'North Star',
            'LM': 'Little Meow',
            'FL': 'Flashing Lights',
            'TG': 'Tranquility Gardens',
            'DZ': 'District ZERO',
            'SM': 'Space Mind',
            'NX': 'Nexus',
            'HH': 'Haven Heights'
        };
        return neighborhoods[prefix] || 'Unknown';
    }

    async renderListings(listings) {
        if (!this.container) return;
        
        if (!listings?.length) {
            this.container.innerHTML = '<div class="no-listings">No listings found matching your criteria</div>';
            return;
        }

        const listingsHTML = await Promise.all(
            listings.map(listing => this.renderListingCard(listing))
        );
        
        this.container.innerHTML = listingsHTML.join('');
    }

    getZoningIcon(attributes) {
        if (!attributes) return '';
        const zoningAttribute = attributes.find(attr => attr.trait_type === 'Zoning Type');
        return this.zoningIcons[zoningAttribute?.value] || '';
    }

    renderTraits(attributes) {
        if (!attributes) return '';
        return attributes
            .filter(attr => ['Plot Size', 'Building Size', 'Distance to Ocean', 'Distance to Bay'].includes(attr.trait_type))
            .map(attr => `
                <div class="trait-tag">
                    <span class="trait-label">${attr.trait_type}:</span>
                    <span class="trait-value">${attr.value}</span>
                </div>
            `).join('');
    }

    async loadListings() {
        if (this.loading) return;
        
        try {
            this.loading = true;
            if (this.loader) this.loader.style.display = 'block';
            
            const response = await fetch(`/.netlify/functions/getWWMMListings`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            this.listings = data.listings || [];
            if (this.listings.length === 0) {
                this.container.innerHTML = '<div class="no-listings">No active WILD listings found</div>';
                return;
            }

            await Promise.all(this.listings.map(async (listing) => {
                const tokenId = listing.criteria?.data?.token?.tokenId || listing.tokenId;
                if (tokenId) {
                    listing.metadata = await this.getTokenMetadata(tokenId);
                }
            }));
            
            await this.applyFilters();
            
        } catch (error) {
            console.error('Error loading WWMM listings:', error);
            this.container.innerHTML = `<div class="error-message">Error loading WWMM listings: ${error.message}</div>`;
        } finally {
            this.loading = false;
            if (this.loader) this.loader.style.display = 'none';
        }
    }

    async renderListingCard(listing) {
        const tokenId = listing.token?.tokenId;
        const priceWild = listing.price?.amount?.native || '0';
        const metadata = listing.metadata;
        const rarityRank = metadata ? this.getRarityRank(metadata.metadata.name) : null;

        const wwmmLink = `https://market.wilderworld.com/assets/${tokenId}`;

        return `
            <div class="listing-card">
                ${metadata ? `
                    <div class="listing-image">
                        <img src="https://arweave.net/${metadata.metadata.image.replace('ar://', '')}" 
                             alt="${metadata.metadata.name}" />
                    </div>
                    <div class="listing-info">
                        <div class="title-price-row">
                            <div class="title-section">
                                <h3 class="listing-title">
                                    <span class="zoning-icon">${this.getZoningIcon(metadata.metadata.attributes)}</span>
                                    ${metadata.metadata.name}
                                </h3>
                                ${rarityRank ? `<div class="rarity-rank">#${rarityRank}</div>` : ''}
                            </div>
                            <div class="price-info">
                                <div class="price">${priceWild} WILD</div>
                            </div>
                        </div>
                        <div class="traits">
                            ${this.renderTraits(metadata.metadata.attributes)}
                        </div>
                        <a href="${wwmmLink}" target="_blank" class="buy-button">
                            Buy on WWMM
                        </a>
                    </div>
                ` : `
                    <div class="listing-info">
                        <div class="token-id">Token ID: ${tokenId || 'N/A'}</div>
                        <div class="price">${priceWild} WILD</div>
                        <a href="${wwmmLink}" target="_blank" class="buy-button">
                            Buy on WWMM
                        </a>
                    </div>
                `}
            </div>
        `;
    }
}