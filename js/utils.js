class Utils {
    // Format ETH values
    static formatEthValue(value) {
        if (!value) return '0 ETH';
        return `${parseFloat(value).toFixed(4)} ETH`;
    }

    // Format wallet addresses
    static formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    // Generate etherscan links
    static getEtherscanLink(type, hash) {
        const baseUrl = 'https://etherscan.io';
        switch(type) {
            case 'transaction':
                return `${baseUrl}/tx/${hash}`;
            case 'address':
                return `${baseUrl}/address/${hash}`;
            default:
                return baseUrl;
        }
    }

    // Format date for display
    static formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Debounce function for search inputs
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Parse URL parameters
    static getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            page: parseInt(params.get('page')) || 1,
            zoning: params.get('zoning') || '',
            neighborhood: params.get('neighborhood') || '',
            transactionType: params.get('type') || ''
        };
    }

    // Update URL with current filters
    static updateUrlParams(filters) {
        const url = new URL(window.location);
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', url);
    }

    // Error handling
    static showError(message, duration = 5000) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.textContent = message;
        document.body.appendChild(errorContainer);

        setTimeout(() => {
            errorContainer.remove();
        }, duration);
    }

    // Loading state management
    static setLoading(isLoading) {
        const loader = document.querySelector('.loading-spinner');
        if (loader) {
            loader.style.display = isLoading ? 'block' : 'none';
        }
    }

    // Validate Ethereum address
    static isValidEthAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
}

export default Utils;