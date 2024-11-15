document.addEventListener('DOMContentLoaded', () => {
    // Get tab elements
    const openSeaTab = document.querySelector('[data-tab="opensea-activity"]');
    const wwmmTab = document.querySelector('[data-tab="wwmm-activity"]');
    
    // Get content containers
    const openSeaContainer = document.getElementById('opensea-activity-container');
    const wwmmContainer = document.getElementById('wwmm-activity-container');

    // Initialize WWMM Activity page
    const wwmmActivityPage = new WWMMActivityPage();

    // Tab switching logic
    wwmmTab.addEventListener('click', () => {
        // Update active tab styling
        openSeaTab.classList.remove('active');
        wwmmTab.classList.add('active');

        // Show/hide containers
        openSeaContainer.style.display = 'none';
        wwmmContainer.style.display = 'block';

        // Load WWMM activity if not already loaded
        wwmmActivityPage.init();
    });

    openSeaTab.addEventListener('click', () => {
        // Update active tab styling
        wwmmTab.classList.remove('active');
        openSeaTab.classList.add('active');

        // Show/hide containers
        wwmmContainer.style.display = 'none';
        openSeaContainer.style.display = 'block';
    });
});

class WWMMActivityPage {
    constructor() {
        this.activity = [];
        this.currentPage = 1;
        this.nextPageKey = null;
        this.isLoading = false;
        this.filters = {
            zoningType: 'All Zoning Types',
            neighborhood: 'All Neighborhoods'
        };
        this.filterOptions = {
            zoningType: ['All Zoning Types', 'Residential', 'Commercial', 'Industrial', 'Mixed Use', 'Legendary'],
            neighborhood: ['All Neighborhoods', 'North Star', 'Little Meow', 'Flashing Lights', 'Tranquility Gardens', 'District Zero']
        };
        this.zoningIcons = {
            'Legendary': '💎',
            'Mixed Use': '🏆',
            'Residential': '🏠',
            'Commercial': '🏢',
            'Industrial': '🏭'
        };
    }

    async init() {
        try {
            await this.loadActivity();
            if (this.nextPageKey) {
                this.setupScrollListener();
            }
            this.setupFilterListeners();
        } catch (error) {
            console.error('Error initializing WWMM activity page:', error);
            document.getElementById('wwmm-activity-container').innerHTML = 
                '<div class="error-message">Failed to load WWMM activity. Please try again later.</div>';
        }
    }

    async loadActivity() {
        // First check - if we're at the end, don't even try
        if (this.isLoading || (!this.nextPageKey && this.currentPage > 1)) {
            if (!this.nextPageKey) {
                this.removeScrollListener();
                // Ensure we have the end message
                const container = document.getElementById('wwmm-activity-container');
                if (container && !container.querySelector('.end-of-results')) {
                    container.insertAdjacentHTML('beforeend', 
                        '<div class="end-of-results">End of activity results</div>');
                }
            }
            return;
        }
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const response = await fetch(`/.netlify/functions/wwmmActivity?limit=25${this.nextPageKey ? `&pageKey=${this.nextPageKey}` : ''}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            // If we get an empty response or no pageKey, we're at the end
            if (!data.activities || data.activities.length === 0 || !data.pageKey) {
                this.nextPageKey = null;
                this.removeScrollListener();
                const container = document.getElementById('wwmm-activity-container');
                if (container && !container.querySelector('.end-of-results')) {
                    container.insertAdjacentHTML('beforeend', 
                        '<div class="end-of-results">End of activity results</div>');
                }
                return;
            }
            
            // Only add new unique activities
            const newActivities = data.activities.filter(newActivity => 
                !this.activity.some(existingActivity => 
                    existingActivity.transactionHash === newActivity.transactionHash
                )
            );
            
            if (newActivities.length > 0) {
                this.activity = [...this.activity, ...newActivities];
                this.nextPageKey = data.pageKey;
                this.currentPage++;
                this.renderActivity();
            } else {
                // If we got no new activities, we're probably at the end
                this.nextPageKey = null;
                this.removeScrollListener();
                const container = document.getElementById('wwmm-activity-container');
                if (container && !container.querySelector('.end-of-results')) {
                    container.insertAdjacentHTML('beforeend', 
                        '<div class="end-of-results">End of activity results</div>');
                }
            }
        } catch (error) {
            console.error('Error loading WWMM activity:', error);
            // Only show error to user if it's not an ENS resolution error
            if (!error.message.includes('ENS')) {
                this.showError('Failed to load WWMM activity. Please try again later.');
            }
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    renderActivity() {
        const container = document.getElementById('wwmm-activity-container');
        if (!container) return;

        // Add filter controls at the top
        const filterControls = `
            <div class="activity-filters">
                <select data-filter="zoningType" class="filter-select">
                    ${this.filterOptions.zoningType.map(type => 
                        `<option value="${type}">${type}</option>`
                    ).join('')}
                </select>
                <select data-filter="neighborhood" class="filter-select">
                    ${this.filterOptions.neighborhood.map(hood => 
                        `<option value="${hood}">${hood}</option>`
                    ).join('')}
                </select>
            </div>
        `;

        // Add the filters before the activity items
        if (!container.querySelector('.activity-filters')) {
            container.insertAdjacentHTML('afterbegin', filterControls);
            this.setupFilterListeners(); // Re-setup listeners for new elements
        }

        if (!this.activity || this.activity.length === 0) {
            container.innerHTML = '<div class="no-activity">No WWMM activity found</div>';
            return;
        }
    
        const formatAddress = (address, ensName) => {
            try {
                if (ensName) return ensName;
                return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown';
            } catch (error) {
                return 'Unknown';
            }
        };
    
        const activityHtml = this.activity.map(item => `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="property-image">
                        <img src="${this.convertArweaveUrl(item.image)}" 
                             alt="${item.tokenName || 'Land Plot'}"
                             onerror="this.style.display='none'"
                        />
                    </div>
    
                    <div class="property-details">
                        <div class="token-info">
                            <a href="https://opensea.io/assets/ethereum/${item.tokenId}" 
                               target="_blank" 
                               class="token-name">
                                ${this.zoningIcons[item.zoningType] || ''} ${item.tokenName}
                            </a>
                            <div class="tags">
                                <span class="neighborhood-tag">${item.neighborhood}</span>
                                <span class="zoning-tag ${item.zoningType.toLowerCase().replace(' ', '-')}">
                                    ${item.zoningType}
                                </span>
                            </div>
                        </div>
                        ${this.renderTraits(item.metadata?.attributes)}
                    </div>
    
                    <div class="transaction-details">
                        <div class="price-info">
                            <div class="currency-display wild-sale">
                                <span class="value">${this.formatPrice(item.value)}</span>
                                <span class="symbol">${item.currency}</span>
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
                                    ${formatAddress(item.from, item.fromEns)}
                                </a>
                            </div>
                            <div class="to-address">
                                <span class="label">To:</span>
                                <a href="https://etherscan.io/address/${item.to}" 
                                   target="_blank" 
                                   class="address" 
                                   title="${item.to}">
                                    ${formatAddress(item.to, item.toEns)}
                                </a>
                            </div>
                        </div>
    
                        <div class="platform-links">
                            <a href="${item.etherscanLink}" 
                               target="_blank" 
                               class="etherscan">
                                View Transaction
                            </a>
                            <a href="https://market.wilderworld.com/collections/0xd396ca541f501f5d303166c509e2045848df356b/networks/mainnet?tab=activity" 
                               target="_blank" 
                               class="wwmm">
                                View on WWMM
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    
        container.innerHTML = activityHtml;
    }

    showLoading() {
        const loader = document.getElementById('wwmm-loader');
        if (loader) loader.style.display = 'block';
    }

    hideLoading() {
        const loader = document.getElementById('wwmm-loader');
        if (loader) loader.style.display = 'none';
    }

    showError(message) {
        const container = document.getElementById('wwmm-activity-container');
        if (container) {
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }

    formatPrice(price) {
        return Number(price).toFixed(2);
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    renderTraits(traits) {
        if (!traits || !Array.isArray(traits)) return '';
        
        const relevantTraitTypes = [
            'Plot Size',
            'Building Size',
            'Distance To Ocean',
            'Distance To Bay'
        ];
        
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
        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => this.applyFilters());
        });
    }

    applyFilters() {
        const selectedZoning = document.querySelector('[data-filter="zoningType"]')?.value || 'All Zoning Types';
        const selectedNeighborhood = document.querySelector('[data-filter="neighborhood"]')?.value || 'All Neighborhoods';

        const filteredActivity = this.activity.filter(item => {
            const zoningMatch = selectedZoning === 'All Zoning Types' || 
                               item.zoningType === selectedZoning;
            
            const neighborhoodMatch = selectedNeighborhood === 'All Neighborhoods' || 
                                     item.neighborhood === selectedNeighborhood;

            return zoningMatch && neighborhoodMatch;
        });

        this.renderFilteredActivity(filteredActivity);
    }

    renderFilteredActivity(filteredItems) {
        const container = document.getElementById('wwmm-activity-container');
        if (!container) return;

        if (filteredItems.length === 0) {
            // Keep the filters but show no results message
            const filtersHtml = container.querySelector('.activity-filters')?.outerHTML || '';
            container.innerHTML = filtersHtml + '<div class="no-activity">No matching WWMM activity found</div>';
            return;
        }

        // Update the activity display with filtered items
        const activityHtml = filteredItems.map(item => `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="property-image">
                        <img src="${this.convertArweaveUrl(item.image)}" 
                             alt="${item.tokenName || 'Land Plot'}"
                             onerror="this.style.display='none'"
                        />
                    </div>
    
                    <div class="property-details">
                        <div class="token-info">
                            <a href="https://opensea.io/assets/ethereum/${item.tokenId}" 
                               target="_blank" 
                               class="token-name">
                                ${this.zoningIcons[item.zoningType] || ''} ${item.tokenName}
                            </a>
                            <div class="tags">
                                <span class="neighborhood-tag">${item.neighborhood}</span>
                                <span class="zoning-tag ${item.zoningType.toLowerCase().replace(' ', '-')}">
                                    ${item.zoningType}
                                </span>
                            </div>
                        </div>
                        ${this.renderTraits(item.metadata?.attributes)}
                    </div>
    
                    <div class="transaction-details">
                        <div class="price-info">
                            <div class="currency-display wild-sale">
                                <span class="value">${this.formatPrice(item.value)}</span>
                                <span class="symbol">${item.currency}</span>
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
                                    ${this.formatAddress(item.from, item.fromEns)}
                                </a>
                            </div>
                            <div class="to-address">
                                <span class="label">To:</span>
                                <a href="https://etherscan.io/address/${item.to}" 
                                   target="_blank" 
                                   class="address" 
                                   title="${item.to}">
                                    ${this.formatAddress(item.to, item.toEns)}
                                </a>
                            </div>
                        </div>
    
                        <div class="platform-links">
                            <a href="${item.etherscanLink}" 
                               target="_blank" 
                               class="etherscan">
                                View Transaction
                            </a>
                            <a href="https://market.wilderworld.com/collections/0xd396ca541f501f5d303166c509e2045848df356b/networks/mainnet?tab=activity" 
                               target="_blank" 
                               class="wwmm">
                                View on WWMM
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Keep the filters and update the content
        const filtersHtml = container.querySelector('.activity-filters')?.outerHTML || '';
        container.innerHTML = filtersHtml + activityHtml;
        this.setupFilterListeners(); // Re-setup listeners after updating content
    }

    convertArweaveUrl(imageUrl) {
        if (!imageUrl) return '';
        if (imageUrl.startsWith('ar://')) {
            const arweaveId = imageUrl.replace('ar://', '');
            return `https://arweave.net/${arweaveId}`;
        }
        return imageUrl;
    }

    setupScrollListener() {
        if (this.scrollListener) {
            this.removeScrollListener();
        }
        
        this.scrollListener = async () => {
            // More conservative scroll trigger
            const scrollPosition = window.innerHeight + window.scrollY;
            const threshold = document.body.offsetHeight - 300; // Reduced from 500
            
            if (this.nextPageKey && !this.isLoading && scrollPosition >= threshold) {
                await this.loadActivity();
            }
        };
        
        window.addEventListener('scroll', this.scrollListener);
    }

    removeScrollListener() {
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
    }
}