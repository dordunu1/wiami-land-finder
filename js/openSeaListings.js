export class OpenSeaListings {
    constructor() {
        this.container = document.getElementById('opensea-listings-container');
        this.loader = document.getElementById('opensea-listings-loader');
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
        this.loadRarityRankings();

        this.setupFilters();
        this.loadListings();
    }

    setupFilters() {
        const filterContainer = document.getElementById('opensea-listings-filters');
        if (!filterContainer) return;

        filterContainer.innerHTML = `
            <div class="filters-section">
                <div class="filter-group">
                    <select data-filter="zoningType" class="filter-select">
                        ${this.filterOptions.zoningType.map(option => 
                            `<option value="${option}">${option}</option>`
                        ).join('')}
                    </select>
                    <select data-filter="neighborhood" class="filter-select">
                        ${this.filterOptions.neighborhood.map(option => 
                            `<option value="${option}">${option}</option>`
                        ).join('')}
                    </select>
                    <select data-filter="sortBy" class="filter-select">
                        ${this.filterOptions.sortBy.map(option => 
                            `<option value="${option}">${option}</option>`
                        ).join('')}
                    </select>
                    <div class="price-range-inputs">
                        <input type="number" 
                               data-filter="priceMin" 
                               placeholder="Min ETH" 
                               class="price-input"
                               min="0"
                               step="0.01">
                        <input type="number" 
                               data-filter="priceMax" 
                               placeholder="Max ETH" 
                               class="price-input"
                               min="0"
                               step="0.01">
                    </div>
                </div>
            </div>
        `;

        filterContainer.querySelectorAll('.filter-select, .price-input').forEach(input => {
            const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(eventType, (e) => {
                this.filters[e.target.dataset.filter] = e.target.value;
                this.applyFilters();
            });
        });
    }

    async applyFilters() {
        if (!this.listings.length) return;

        console.log('Applying filters:', this.filters);
        let filteredListings = [...this.listings];

        if (this.filters.zoningType !== 'All Zoning Types') {
            filteredListings = this.filterByZoning(filteredListings);
        }

        if (this.filters.neighborhood !== 'All Neighborhoods') {
            filteredListings = this.filterByNeighborhood(filteredListings);
        }

        filteredListings = this.filterByPriceRange(filteredListings);
        
        console.log('Before sorting:', filteredListings.map(l => ({
            name: l.metadata?.metadata?.name,
            rank: this.getRarityRank(l.metadata?.metadata?.name)
        })));
        
        filteredListings = this.sortListings(filteredListings);
        
        console.log('After sorting:', filteredListings.map(l => ({
            name: l.metadata?.metadata?.name,
            rank: this.getRarityRank(l.metadata?.metadata?.name)
        })));

        await this.renderListings(filteredListings);
    }

    filterByPriceRange(listings) {
        return listings.filter(listing => {
            const priceEth = parseFloat(this.convertWeiToEth(listing.price?.current?.value || '0'));
            const minPrice = this.filters.priceMin ? parseFloat(this.filters.priceMin) : 0;
            const maxPrice = this.filters.priceMax ? parseFloat(this.filters.priceMax) : Infinity;
            
            return priceEth >= minPrice && priceEth <= maxPrice;
        });
    }

    filterByZoning(listings) {
        return listings.filter(listing => {
            const metadata = listing.metadata;
            if (!metadata) return false;
            const zoningType = metadata.metadata.attributes.find(attr => 
                attr.trait_type === 'Zoning Type'
            )?.value;
            return zoningType === this.filters.zoningType;
        });
    }

    filterByNeighborhood(listings) {
        return listings.filter(listing => {
            const metadata = listing.metadata;
            if (!metadata) return false;
            const neighborhood = metadata.metadata.attributes.find(attr => 
                attr.trait_type === 'Neighborhood'
            )?.value;
            return neighborhood === this.filters.neighborhood;
        });
    }

    sortListings(listings) {
        return [...listings].sort((a, b) => {
            switch (this.filters.sortBy) {
                case 'Price: High to Low': {
                    const priceA = BigInt(a.price?.current?.value || '0');
                    const priceB = BigInt(b.price?.current?.value || '0');
                    return priceB < priceA ? -1 : priceB > priceA ? 1 : 0;
                }
                
                case 'Price: Low to High': {
                    const priceA = BigInt(a.price?.current?.value || '0');
                    const priceB = BigInt(b.price?.current?.value || '0');
                    return priceA < priceB ? -1 : priceA > priceB ? 1 : 0;
                }
                
                case 'Rarity: High to Low': {
                    const rankA = this.getRarityRank(a.metadata?.metadata?.name) || Infinity;
                    const rankB = this.getRarityRank(b.metadata?.metadata?.name) || Infinity;
                    return rankA - rankB;
                }
                
                case 'Rarity: Low to High': {
                    const rankA = this.getRarityRank(a.metadata?.metadata?.name) || 0;
                    const rankB = this.getRarityRank(b.metadata?.metadata?.name) || 0;
                    return rankB - rankA;
                }
                
                default:
                    return 0;
            }
        });
    }

    convertWeiToEth(weiValue) {
        return (parseFloat(weiValue) / 1e18).toFixed(2);
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
        if (!date) {
            console.log('No date provided to formatExpirationDate');
            return 'N/A';
        }
        
        console.log('Formatting date:', date);
        
        let expirationDate;
        try {
            // Handle Unix timestamp (in seconds)
            if (typeof date === 'number' || /^\d+$/.test(date)) {
                expirationDate = new Date(parseInt(date) * 1000);
            } else {
                // Handle ISO string or other date formats
                expirationDate = new Date(date);
            }
            
            if (isNaN(expirationDate.getTime())) {
                console.log('Invalid date:', date);
                return 'N/A';
            }
            
            const now = new Date();
            
            // Check if already expired
            if (expirationDate <= now) {
                return 'Expired';
            }
            
            const diffTime = expirationDate - now;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
            
            if (diffDays > 0) {
                return `${diffDays}d ${diffHours}h`;
            } else if (diffHours > 0) {
                return `${diffHours}h ${diffMinutes}m`;
            } else {
                return `${diffMinutes}m`;
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'N/A';
        }
    }

    async renderListingCard(listing) {
        // Add detailed logging
        console.log('Full listing data:', JSON.stringify(listing, null, 2));
        
        const tokenId = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
        const priceWei = listing.price?.current?.value || '0';
        const priceEth = this.convertWeiToEth(priceWei);
        const currency = listing.price?.current?.currency?.symbol || 'ETH';
        const metadata = listing.metadata;
        
        // Try different possible paths for expiration time
        const expirationDate = listing.protocol_data?.parameters?.endTime || 
                              listing.protocol_data?.parameters?.end || 
                              listing.expiration_time ||
                              listing.end_time;
                              
        console.log('Expiration date found:', expirationDate);
        
        const formattedExpiration = this.formatExpirationDate(expirationDate);
        const rarityRank = metadata ? this.getRarityRank(metadata.metadata.name) : null;

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
                            <div class="title-section">
                                <h3 class="listing-title">
                                    <span class="zoning-icon">${this.getZoningIcon(metadata.metadata.attributes)}</span>
                                    ${metadata.metadata.name}
                                </h3>
                                ${rarityRank ? `<div class="rarity-rank">#${rarityRank}</div>` : ''}
                            </div>
                            <div class="price-info">
                                <div class="price">${priceEth} ${currency}</div>
                                <div class="expiration">Expires ${formattedExpiration}</div>
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
        const listingsHTML = await Promise.all(
            listings.map(listing => this.renderListingCard(listing))
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
            if (data.error) throw new Error(data.error);
            
            this.listings = data.listings || [];
            if (this.listings.length === 0) {
                this.container.innerHTML = '<div class="no-listings">No active listings found</div>';
                return;
            }

            await Promise.all(this.listings.map(async (listing) => {
                const tokenId = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
                if (tokenId) {
                    listing.metadata = await this.getTokenMetadata(tokenId);
                }
            }));
            
            await this.applyFilters();
            
        } catch (error) {
            console.error('Error loading listings:', error);
            this.container.innerHTML = `<div class="error-message">Error loading listings: ${error.message}</div>`;
        } finally {
            this.loading = false;
            if (this.loader) this.loader.style.display = 'none';
        }
    }

    async loadRarityRankings() {
        try {
            if (this.rarityRankings) return; // Already loaded
            
            console.log('Loading rarity rankings...');
            const response = await fetch('/.netlify/functions/getRarityRanking');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const rankings = await response.json();
            
            if (!rankings || typeof rankings !== 'object') {
                throw new Error('Invalid rankings data received');
            }
            
            console.log(`Loaded ${Object.keys(rankings).length} rankings`);
            this.rarityRankings = rankings;
            
            // Force a re-render if we have listings
            if (this.listings.length > 0) {
                await this.applyFilters();
            }
        } catch (error) {
            console.error('Error loading rarity rankings:', error);
            this.rarityRankings = null;
        }
    }

    getRarityRank(plotName) {
        if (!plotName || !this.rarityRankings) return null;
        
        // Try exact match first
        let rank = this.rarityRankings[plotName];
        if (rank) return rank;
        
        // Try without any spaces
        rank = this.rarityRankings[plotName.replace(/\s+/g, '')];
        if (rank) return rank;
        
        // Try uppercase
        rank = this.rarityRankings[plotName.toUpperCase()];
        if (rank) return rank;
        
        console.log(`No rank found for: ${plotName}`);
        return null;
    }
}