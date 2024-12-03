import { OpenSeaListings } from './openSeaListings.js';
import { WWMMListings } from './wwmmListings.js';

export class ListingsPage {
    constructor() {
        // Initialize listings classes
        this.openseaListings = null;
        this.wwmmListings = null;
        
        // Initialize tab elements
        this.openSeaTab = document.querySelector('[data-tab="opensea-listings"]');
        this.wwmmTab = document.querySelector('[data-tab="wwmm-listings"]');
        this.openSeaContent = document.getElementById('opensea-listings-tab');
        this.wwmmContent = document.getElementById('wwmm-listings-tab');

        if (this.openSeaTab && this.wwmmTab && this.openSeaContent && this.wwmmContent) {
            this.setupTabSwitching();
            this.initializeListings();
        } else {
            console.error('Required tab elements not found');
        }
    }

    initializeListings() {
        // Initialize listings only when needed
        this.openseaListings = new OpenSeaListings();
        
        // Initially hide WWMM content
        this.wwmmContent.style.display = 'none';
    }

    setupTabSwitching() {
        this.openSeaTab.addEventListener('click', () => {
            // Update tab states
            this.openSeaTab.classList.add('active');
            this.wwmmTab.classList.remove('active');
            
            // Update content visibility
            this.openSeaContent.style.display = 'block';
            this.wwmmContent.style.display = 'none';
            
            // Initialize OpenSea listings if needed
            if (!this.openseaListings) {
                this.openseaListings = new OpenSeaListings();
            }
            this.openseaListings.loadListings();
        });

        this.wwmmTab.addEventListener('click', () => {
            // Update tab states
            this.wwmmTab.classList.add('active');
            this.openSeaTab.classList.remove('active');
            
            // Update content visibility
            this.wwmmContent.style.display = 'block';
            this.openSeaContent.style.display = 'none';
            
            // Initialize WWMM listings if needed
            if (!this.wwmmListings) {
                this.wwmmListings = new WWMMListings();
            }
            this.wwmmListings.loadListings();
        });
    }
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    new ListingsPage();
});