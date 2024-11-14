import Utils from '/js/utils.js';

class Filters {
    static ZONING_TYPES = [
        'All Zoning Types',
        'Legendary',
        'Mixed Use',
        'Residential',
        'Commercial',
        'Industrial'
    ];

    static NEIGHBORHOODS = [
        'All Neighborhoods',
        'Flashing Lights',
        'North Star',
        'Nexus',
        'District ZERO',
        'Tranquility Gardens',
        'Space Mind',
        'Haven Heights',
        'Little Meow'
    ];

    static TRANSACTION_TYPES = ['All', 'ETH', 'WETH'];

    // Initialize filters in the UI
    static initializeFilters() {
        console.log('Initializing filters...');
        
        // Populate zoning filter
        const zoningFilter = document.getElementById('zoning-filter');
        if (zoningFilter) {
            zoningFilter.innerHTML = ''; // Clear existing options
            this.ZONING_TYPES.forEach(zone => {
                const option = document.createElement('option');
                option.value = zone === 'All Zoning Types' ? 'All' : zone;
                option.textContent = zone;
                zoningFilter.appendChild(option);
            });
        }

        // Populate neighborhood filter
        const neighborhoodFilter = document.getElementById('neighborhood-filter');
        if (neighborhoodFilter) {
            neighborhoodFilter.innerHTML = ''; // Clear existing options
            this.NEIGHBORHOODS.forEach(neighborhood => {
                const option = document.createElement('option');
                option.value = neighborhood === 'All Neighborhoods' ? 'All' : neighborhood;
                option.textContent = neighborhood;
                neighborhoodFilter.appendChild(option);
            });
        }

        // Populate transaction filter
        const transactionFilter = document.getElementById('transaction-filter');
        if (transactionFilter) {
            transactionFilter.innerHTML = ''; // Clear existing options
            this.TRANSACTION_TYPES.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type === 'All' ? 'All Transaction Types' : type;
                transactionFilter.appendChild(option);
            });
        }
    }

    // Apply filters to transaction data
    static filterTransactions(transactions, filters) {
        return transactions.filter(tx => {
            // Zoning filter
            if (filters.zoning && filters.zoning !== 'All' && 
                tx.zoningType.toUpperCase() !== filters.zoning.toUpperCase()) {
                return false;
            }

            // Neighborhood filter
            if (filters.neighborhood && filters.neighborhood !== 'All' && 
                tx.neighborhood !== filters.neighborhood) {
                return false;
            }

            // Transaction type filter
            if (filters.transactionType && filters.transactionType !== 'All' && 
                tx.currency !== filters.transactionType) {
                return false;
            }

            return true;
        });
    }

    // Get current filter values
    static getCurrentFilters() {
        return {
            zoning: document.getElementById('zoning-filter')?.value || 'All',
            neighborhood: document.getElementById('neighborhood-filter')?.value || 'All',
            transactionType: document.getElementById('transaction-filter')?.value || 'All'
        };
    }

    // Setup filter change listeners
    static setupFilterListeners(callback) {
        const filterIds = ['zoning-filter', 'neighborhood-filter', 'transaction-filter'];
        
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    console.log(`Filter changed: ${id}`, element.value);
                    callback(this.getCurrentFilters());
                });
            }
        });
    }
}

export default Filters;