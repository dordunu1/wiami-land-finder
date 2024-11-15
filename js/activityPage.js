class ActivityPage {
    constructor() {
        this.activity = [];
        this.currentPage = 1;
        this.nextPageKey = null;
        this.isLoading = false;
        this.filters = {
            zoningType: 'All Zoning Types',
            neighborhood: 'All Neighborhoods',
            transactionType: 'All Transaction Types'
        };
        this.filterOptions = {
            zoningType: ['All Zoning Types', 'Residential', 'Commercial', 'Industrial', 'Mixed Use', 'Legendary'],
            neighborhood: ['All Neighborhoods', 'North Star', 'Little Meow', 'Flashing Lights', 'Tranquility Gardens', 'District Zero'],
            transactionType: ['All Transaction Types', 'ETH', 'WETH']
        };
        this.zoningIcons = {
            'Legendary': '👾',
            'Mixed Use': '🏆',
            'Residential': '🏠',
            'Commercial': '🏢',
            'Industrial': '🏭'
        };
    }

    async init() {
        try {
            await this.loadActivity();
            this.setupScrollListener = () => {
                window.addEventListener('scroll', async () => {
                    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
                        if (!this.isLoading && this.nextPageKey) {
                            await this.loadActivity();
                        }
                    }
                });
            };
            this.setupScrollListener();
            this.setupFilterListeners();
        } catch (error) {
            console.error('Error initializing activity page:', error);
            document.getElementById('opensea-activity-container').innerHTML = 
                '<div class="error-message">Failed to load activity. Please try again later.</div>';
        }
    }

    async loadActivity() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const response = await fetch('/.netlify/functions/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pageKey: this.nextPageKey || this.currentPage.toString()
                })
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to load activity');
            
            this.activity = this.currentPage === 1 ? data.events : [...this.activity, ...data.events];
            this.nextPageKey = data.nextPage;
            this.currentPage++;
            
            this.renderActivity();
        } catch (error) {
            console.error('Error loading activity:', error);
            this.showError('Failed to load activity. Please try again later.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    renderActivity() {
        const container = document.getElementById('opensea-activity-container');
        if (!container) return;
    
        if (!this.activity || this.activity.length === 0) {
            container.innerHTML = '<div class="no-activity">No activity found</div>';
            return;
        }
    
        const activityHtml = this.activity.map(item => `
            <div class="activity-item">
                <div class="activity-content">
                    <!-- Property Image -->
                    <div class="property-image">
                        <img src="${item.image}" 
                             alt="${item.name || 'Land Plot'}"
                             onerror="this.style.display='none'"
                        />
                    </div>
    
                    <!-- Property Details -->
                    <div class="property-details">
                        <div class="token-info">
                            <a href="https://opensea.io/assets/ethereum/0xd396ca541f501f5d303166c509e2045848df356b/${item.tokenId}" 
                               target="_blank" 
                               class="token-name">
                                ${this.zoningIcons[item.zoningType] || ''} ${item.name}
                            </a>
                            <div class="tags">
                                <span class="neighborhood-tag">${item.neighborhood}</span>
                                <span class="zoning-tag ${item.zoningType.toLowerCase().replace(' ', '-')}">
                                    ${item.zoningType}
                                </span>
                            </div>
                        </div>
                        ${this.renderTraits(item.traits)}
                    </div>
    
                    <!-- Transaction Details -->
                    <div class="transaction-details">
                        <div class="price-info">
                            <div class="currency-display ${item.priceToken === 'WETH' ? 'weth-sale' : 'eth-sale'}">
                                <span class="value">${this.formatPrice(item.price)}</span>
                                <span class="symbol">${item.priceToken}</span>
                            </div>
                            <span class="timestamp">${this.formatTimestamp(item.timestamp)}</span>
                        </div>
                        <div class="wallet-info">
                            <div class="from-address">
                                <span class="label">From:</span>
                                <a href="https://etherscan.io/address/${item.from}" 
                                   target="_blank" 
                                   class="address" 
                                   title="${item.from}">
                                    ${item.fromEns || this.formatAddress(item.from)}
                                </a>
                            </div>
                            <div class="to-address">
                                <span class="label">To:</span>
                                <a href="https://etherscan.io/address/${item.to}" 
                                   target="_blank" 
                                   class="address" 
                                   title="${item.to}">
                                    ${item.toEns || this.formatAddress(item.to)}
                                </a>
                            </div>
                        </div>
    
                        <div class="platform-links">
                            <a href="https://etherscan.io/tx/${item.txHash}" 
                               target="_blank" 
                               class="etherscan">
                                View Transaction
                            </a>
                            <a href="https://opensea.io/assets/ethereum/0xd396ca541f501f5d303166c509e2045848df356b/${item.tokenId}" 
                               target="_blank" 
                               class="opensea">
                                View on OpenSea
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    
        container.innerHTML = activityHtml;
    }

    showLoading() {
        const loader = document.getElementById('opensea-loader');
        if (loader) loader.style.display = 'block';
    }

    hideLoading() {
        const loader = document.getElementById('opensea-loader');
        if (loader) loader.style.display = 'none';
    }

    showError(message) {
        const container = document.getElementById('opensea-activity-container');
        if (container) {
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }

    // Helper methods
    formatPrice(price) {
        return (Number(price) / 1e18).toFixed(4);
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    getZoningType(name) {
        const prefix = name.split('-')[0];
        const zoningTypes = {
            'NS': 'North Star',
            'LM': 'Little Meow',
            'FL': 'Flashing Lights',
            'TG': 'Tranquility Gardens',
            'DZ': 'District Zero'
        };
        return zoningTypes[prefix] || 'Unknown';
    }

    renderTraits(traits) {
        if (!traits || !Array.isArray(traits)) return '';
        
        // Define the traits we want to show
        const relevantTraitTypes = [
            'Plot Size',
            'Building Size',
            'Distance To Ocean',
            'Distance To Bay'
        ];
        
        // Filter only the traits we want to display
        const displayTraits = traits.filter(trait => 
            relevantTraitTypes.includes(trait.trait_type)
        );
        
        return `
            <div class="traits-container">
                ${displayTraits.map(trait => `
                    <div class="trait-tag">
                        <span class="trait-label">${trait.trait_type}:</span>
                        <span class="trait-value">${trait.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatAddress(address) {
        if (!address) return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    setupFilterListeners() {
        // Setup zoning type filter
        const zoningSelect = document.querySelector('[data-filter="zoningType"]');
        if (zoningSelect) {
            zoningSelect.innerHTML = this.filterOptions.zoningType
                .map(type => `<option value="${type}">${type}</option>`)
                .join('');
            zoningSelect.addEventListener('change', () => this.applyFilters());
        }

        // Setup neighborhood filter
        const neighborhoodSelect = document.querySelector('[data-filter="neighborhood"]');
        if (neighborhoodSelect) {
            neighborhoodSelect.innerHTML = this.filterOptions.neighborhood
                .map(hood => `<option value="${hood}">${hood}</option>`)
                .join('');
            neighborhoodSelect.addEventListener('change', () => this.applyFilters());
        }

        // Setup transaction type filter
        const transactionSelect = document.querySelector('[data-filter="transactionType"]');
        if (transactionSelect) {
            transactionSelect.innerHTML = this.filterOptions.transactionType
                .map(type => `<option value="${type}">${type}</option>`)
                .join('');
            transactionSelect.addEventListener('change', () => this.applyFilters());
        }
    }

    applyFilters() {
        const selectedZoning = document.querySelector('[data-filter="zoningType"]').value;
        const selectedNeighborhood = document.querySelector('[data-filter="neighborhood"]').value;
        const selectedTransaction = document.querySelector('[data-filter="transactionType"]').value;

        const filteredActivity = this.activity.filter(item => {
            const zoningMatch = selectedZoning === 'All Zoning Types' || item.zoningType === selectedZoning;
            const neighborhoodMatch = selectedNeighborhood === 'All Neighborhoods' || item.neighborhood === selectedNeighborhood;
            const transactionMatch = selectedTransaction === 'All Transaction Types' || 
                                   (selectedTransaction === item.priceToken);

            return zoningMatch && neighborhoodMatch && transactionMatch;
        });

        this.renderFilteredActivity(filteredActivity);
    }

    renderFilteredActivity(filteredItems) {
        const container = document.getElementById('opensea-activity-container');
        if (!container) return;

        if (filteredItems.length === 0) {
            container.innerHTML = '<div class="no-activity">No matching activity found</div>';
            return;
        }

        // Use the existing renderActivity logic but with filtered items
        const activityHtml = filteredItems.map(item => `
            <div class="activity-item">
                <div class="activity-content">
                    <!-- Property Image -->
                    <div class="property-image">
                        <img src="${item.image}" 
                             alt="${item.name || 'Land Plot'}"
                             onerror="this.style.display='none'"
                        />
                    </div>
    
                    <!-- Property Details -->
                    <div class="property-details">
                        <div class="token-info">
                            <a href="https://opensea.io/assets/ethereum/0xd396ca541f501f5d303166c509e2045848df356b/${item.tokenId}" 
                               target="_blank" 
                               class="token-name">
                                ${this.zoningIcons[item.zoningType] || ''} ${item.name}
                            </a>
                            <div class="tags">
                                <span class="neighborhood-tag">${item.neighborhood}</span>
                                <span class="zoning-tag ${item.zoningType.toLowerCase().replace(' ', '-')}">
                                    ${item.zoningType}
                                </span>
                            </div>
                        </div>
                        ${this.renderTraits(item.traits)}
                    </div>
    
                    <!-- Transaction Details -->
                    <div class="transaction-details">
                        <div class="price-info">
                            <div class="currency-display ${item.priceToken === 'WETH' ? 'weth-sale' : 'eth-sale'}">
                                <span class="value">${this.formatPrice(item.price)}</span>
                                <span class="symbol">${item.priceToken}</span>
                            </div>
                            <span class="timestamp">${this.formatTimestamp(item.timestamp)}</span>
                        </div>
                        <div class="wallet-info">
                            <div class="from-address">
                                <span class="label">From:</span>
                                <a href="https://etherscan.io/address/${item.from}" 
                                   target="_blank" 
                                   class="address" 
                                   title="${item.from}">
                                    ${item.fromEns || this.formatAddress(item.from)}
                                </a>
                            </div>
                            <div class="to-address">
                                <span class="label">To:</span>
                                <a href="https://etherscan.io/address/${item.to}" 
                                   target="_blank" 
                                   class="address" 
                                   title="${item.to}">
                                    ${item.toEns || this.formatAddress(item.to)}
                                </a>
                            </div>
                        </div>
    
                        <div class="platform-links">
                            <a href="https://etherscan.io/tx/${item.txHash}" 
                               target="_blank" 
                               class="etherscan">
                                View Transaction
                            </a>
                            <a href="https://opensea.io/assets/ethereum/0xd396ca541f501f5d303166c509e2045848df356b/${item.tokenId}" 
                               target="_blank" 
                               class="opensea">
                                View on OpenSea
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    
        container.innerHTML = activityHtml;
    }
}



// Initialize the activity page
const activityPage = new ActivityPage();
activityPage.init();