import Filters from '/js/filters.js';

class ActivityPage {
    constructor() {
        this.activity = [];
        this.isLoading = false;
        this.nextPageKey = null;
        this.currentPage = 1;
        this.filterHistory = [];
        this.init();
    }

    async init() {
        await this.setupFilters();
        await this.loadActivity();
    }

    setupFilters() {
        Filters.initializeFilters();

        Filters.setupFilterListeners(async (filters) => {
            console.log('Filters changed:', filters);
            this.filterHistory.push({
                filters: Filters.getCurrentFilters(),
                page: this.currentPage,
                pageKey: this.nextPageKey
            });
            
            this.currentPage = 1;
            this.nextPageKey = null;
            await this.loadActivity(true);
        });
    }

    showLoading() {
        this.isLoading = true;
        const container = document.getElementById('activity-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <div>Loading activity...</div>
                </div>
            `;
        }
    }

    hideLoading() {
        this.isLoading = false;
    }

    async loadActivity(resetPage = false, attemptCount = 0) {
        try {
            const MAX_ATTEMPTS = 3;

            if (resetPage) {
                this.currentPage = 1;
                this.nextPageKey = null;
            }

            this.showLoading();
            
            const filters = Filters.getCurrentFilters();
            console.log('Current filters:', filters);

            const requestData = {
                pageKey: this.nextPageKey,
                filters: {
                    zoning: filters.zoning !== 'All' ? filters.zoning : undefined,
                    neighborhood: filters.neighborhood !== 'All' ? filters.neighborhood : undefined,
                    transactionType: filters.transactionType !== 'All' ? filters.transactionType : undefined
                }
            };

            console.log('Sending request with filters:', requestData);
            
            const response = await fetch('/.netlify/functions/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to load activity');
            }

            let filteredActivity = data.activity;
            if (filters.zoning !== 'All' || filters.neighborhood !== 'All' || filters.transactionType !== 'All') {
                filteredActivity = Filters.filterTransactions(data.activity, filters);
                
                if (filteredActivity.length === 0 && data.nextPageKey && attemptCount < MAX_ATTEMPTS) {
                    this.nextPageKey = data.nextPageKey;
                    this.currentPage++;
                    return this.loadActivity(false, attemptCount + 1);
                }

                if (filteredActivity.length === 0) {
                    const container = document.getElementById('activity-container');
                    if (container) {
                        container.innerHTML = `
                            <div class="no-activity">
                                <p>No more sales found matching the selected filters.</p>
                                ${this.filterHistory.length > 0 ? 
                                    `<button class="prev-btn">← Back to Previous Filter</button>` 
                                    : ''}
                            </div>
                        `;
                        
                        const prevBtn = container.querySelector('.prev-btn');
                        if (prevBtn) {
                            prevBtn.addEventListener('click', async () => {
                                if (this.filterHistory.length > 0) {
                                    const previousState = this.filterHistory.pop();
                                    Object.entries(previousState.filters).forEach(([key, value]) => {
                                        const element = document.getElementById(`${key}-filter`);
                                        if (element) element.value = value;
                                    });
                                    this.currentPage = previousState.page;
                                    this.nextPageKey = previousState.pageKey;
                                    await this.loadActivity(false);
                                }
                            });
                        }
                    }
                    return;
                }
            }

            this.activity = filteredActivity;
            this.nextPageKey = data.nextPageKey;
            this.renderActivity();

        } catch (error) {
            console.error('Error loading activity:', error);
            const container = document.getElementById('activity-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        Failed to load activity. Please try again later.
                        ${this.filterHistory.length > 0 ? 
                            `<button class="prev-btn">← Back to Previous Filter</button>` 
                            : ''}
                    </div>
                `;

                const prevBtn = container.querySelector('.prev-btn');
                if (prevBtn) {
                    prevBtn.addEventListener('click', async () => {
                        if (this.filterHistory.length > 0) {
                            const previousState = this.filterHistory.pop();
                            Object.entries(previousState.filters).forEach(([key, value]) => {
                                const element = document.getElementById(`${key}-filter`);
                                if (element) element.value = value;
                            });
                            this.currentPage = previousState.page;
                            this.nextPageKey = previousState.pageKey;
                            await this.loadActivity(false);
                        }
                    });
                }
            }
        } finally {
            this.hideLoading();
        }
    }

    renderActivity() {
        const zoningIcons = {
            'Legendary': '👾',
            'Mixed Use': '🏆',
            'Residential': '🏠',
            'Commercial': '🏢',
            'Industrial': '🏭'
        };

        const activityHTML = this.activity.map(item => {
            const arweaveId = item.metadata?.image?.replace('ar://', '');
            const imageUrl = arweaveId ? `https://arweave.net/${arweaveId}` : '';
            
            const getAttribute = (traitType) => {
                return item.metadata?.attributes?.find(attr => attr.trait_type === traitType)?.value || 'N/A';
            };

            console.log('Item:', {
                value: item.value,
                currency: item.currency,
                marketplace: item.marketplace,
                raw: item // full object for reference
            });

            return `
                <div class="activity-item">
                    <div class="token-info">
                        <a href="${item.openSeaLink}" target="_blank" class="token-name">
                            ${zoningIcons[item.zoningType] || '🏗️'} ${item.tokenName}
                        </a>
                        <div class="property-type">
                            <span class="zoning-tag ${item.zoningType.toLowerCase().replace(' ', '-')}">${item.zoningType}</span>
                            <span class="neighborhood-tag">${getAttribute('Neighborhood')}</span>
                        </div>
                    </div>

                    <div class="activity-content">
                        <div class="property-details">
                            <div class="plot-details">
                                <div class="detail-row">
                                    <span class="detail-label">Plot Size:</span>
                                    <span class="detail-value">${getAttribute('Plot Size')}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Plot Area:</span>
                                    <span class="detail-value">${getAttribute('Plot Area (M²)')} m²</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Floors:</span>
                                    <span class="detail-value">${getAttribute('Min # Of Floors')} - ${getAttribute('Max # Of Floors')}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Distance to Bay:</span>
                                    <span class="detail-value">${getAttribute('Distance To Bay')}</span>
                                </div>
                            </div>

                            <div class="building-details">
                                <div class="detail-row">
                                    <span class="detail-label">Building Size:</span>
                                    <span class="detail-value">${getAttribute('Building Size')}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Building Height:</span>
                                    <span class="detail-value">${getAttribute('Min Building Height (M)')}m - ${getAttribute('Max Building Height (M)')}m</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Distance to Ocean:</span>
                                    <span class="detail-value">${getAttribute('Distance To Ocean')}</span>
                                </div>
                            </div>
                        </div>

                        <div class="transaction-details">
                            <div class="price-info">
                                <span class="${item.currency === 'ETH' ? 'eth-sale' : 'weth-sale'}">
                                    ${item.value} ${item.currency}
                                </span>
                                <span class="marketplace ${item.marketplace.toLowerCase()}">${item.marketplace}</span>
                            </div>
                            <span class="timestamp">${new Date(item.timestamp).toLocaleString()}</span>
                            
                            <div class="wallet-info">
                                <div class="from-address">
                                    <span class="label">From:</span>
                                    <a href="https://etherscan.io/address/${item.from}" target="_blank" class="address">
                                        ${item.fromENS || `${item.from.slice(0,6)}...${item.from.slice(-4)}`}
                                    </a>
                                </div>
                                <div class="to-address">
                                    <span class="label">To:</span>
                                    <a href="https://etherscan.io/address/${item.to}" target="_blank" class="address">
                                        ${item.toENS || `${item.to.slice(0,6)}...${item.to.slice(-4)}`}
                                    </a>
                                </div>
                            </div>

                            <div class="links">
                                <a href="${item.etherscanLink}" target="_blank">Etherscan</a>
                                <a href="${item.openSeaLink}" target="_blank">OpenSea</a>
                            </div>
                        </div>

                        <div class="property-image">
                            ${imageUrl ? `<img src="${imageUrl}" alt="${item.tokenName}" loading="lazy">` 
                                     : '<div class="no-image">No Image Available</div>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const container = document.getElementById('activity-container');
        if (!container) return;

        if (!this.activity || this.activity.length === 0) {
            container.innerHTML = `
                <div class="no-activity">
                    No activity found
                </div>
            `;
            return;
        }

        container.innerHTML = `
            ${activityHTML}
            <div class="pagination">
                ${this.currentPage > 1 ? `<button class="prev-btn">Previous</button>` : ''}
                <span class="page-number">Page ${this.currentPage}</span>
                ${this.nextPageKey ? `<button class="next-btn">Next</button>` : ''}
            </div>
        `;

        const prevBtn = container.querySelector('.prev-btn');
        const nextBtn = container.querySelector('.next-btn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadActivity();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.nextPageKey) {
                    this.currentPage++;
                    this.loadActivity();
                }
            });
        }
    }

    async loadTokenMetadata(tokenId) {
        try {
            const metadata = await this.getTokenMetadata(tokenId);
            if (metadata && metadata.attributes) {
                const neighborhoodTag = document.querySelector(`[data-token-id="${tokenId}"] .neighborhood-tag`);
                if (neighborhoodTag) {
                    const neighborhood = metadata.attributes.find(attr => attr.trait_type === 'Neighborhood');
                    neighborhoodTag.textContent = neighborhood ? neighborhood.value : 'Unknown Neighborhood';
                }
            }
        } catch (error) {
            console.error(`Error loading metadata for token ${tokenId}:`, error);
        }
    }
}

new ActivityPage();