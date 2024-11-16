import { OpenSeaListings } from './openSeaListings.js';

export class ListingsPage {
    constructor() {
        this.openseaListings = new OpenSeaListings();
    }
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    new ListingsPage();
});