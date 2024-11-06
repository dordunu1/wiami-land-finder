// Constants for colors and basic icons
const ZONE_COLORS = {
    'RESIDENTIAL': '#0066FF',
    'COMMERCIAL': '#00FF00',
    'INDUSTRIAL': '#FFD700',
    'MIXED USE': '#FF4500',
    'LEGENDARY': '#9933CC'
};

const RANK_ICON = '⭐';
const NEIGHBORHOOD_ICON = '📍';

// Function to get zoning icon
function getZoningIcon(zoning) {
    switch(zoning.toUpperCase()) {
        case 'LEGENDARY': return '💎';
        case 'MIXED USE': return '🏆';
        case 'RESIDENTIAL': return '🏠';
        case 'COMMERCIAL': return '🏢';
        case 'INDUSTRIAL': return '🏭';
        default: return '';
    }
}

// Add new constants for pagination
const PARCELS_PER_PAGE = 4444;
let currentPage = 0;
let allParcelsData = [];
let filteredParcels = [];
let isLoading = false;

// Add these filter category definitions
const FILTER_OPTIONS = {
    'All': ['All'],
    'Zoning': ['Legendary', 'Mixed Use', 'Residential', 'Commercial', 'Industrial'],
    'Plot Size': ['Giga', 'Nano', 'Micro'],
    'Building Size': ['Megatall', 'Lowrise'],
    'Distance to Ocean': ['Close', 'Medium', 'Far'],
    'Distance to Bay': ['Close', 'Medium', 'Far']
};

// Add this to track active filters
let activeFilters = new Map(); // category -> Set of values

// Add this to track dropdown state
let isFilterOpen = false;

async function loadParcelData() {
    try {
        const response = await fetch('./data/parcels.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        allParcelsData = XLSX.utils.sheet_to_json(firstSheet, {
            raw: true,
            header: ['RANK', 'NAME', 'NEIGHBORHOOD', 'ZONING', 'PLOT_SIZE', 'BUILDING_SIZE', 
                    'DISTANCE_TO_OCEAN', 'DISTANCE_TO_BAY', 'MAX_FLOORS', 'MIN_FLOORS', 
                    'PLOT_AREA', 'MIN_BUILDING_HEIGHT', 'MAX_BUILDING_HEIGHT', 
                    'DISTANCE_TO_OCEAN_M', 'DISTANCE_TO_BAY_M'],
            range: 1
        });
        
        filteredParcels = [...allParcelsData];
        return loadMoreParcels(true);
    } catch (error) {
        console.error('Error loading parcel data:', error);
        throw new Error('Failed to load parcel data');
    }
}

// Add this function at the top of your file, after the constants
function setupTypewriter() {
    const content = `Wiami Urban Planning Plot Search

Core Features:
• Search plots by ID
• Multi-Filter System
• Real-time filtering
• Dynamic loading (20 plots/page)
• Color-coded zoning types

Filter Categories:
• Zoning: Legendary, Mixed Use, Residential, Commercial, Industrial
• Plot & Building Sizes
• Ocean & Bay Distance`; 

    const typewriterDiv = document.createElement('div');
    typewriterDiv.className = 'typewriter';
    const typewriterContainer = document.createElement('div');
    typewriterContainer.className = 'typewriter-container';
    document.querySelector('.content-wrapper').prepend(typewriterContainer);
    typewriterContainer.appendChild(typewriterDiv);

    let i = 0;
    const speed = 30;

    function typeWriter() {
        if (i < content.length) {
            const char = content.charAt(i);
            if (char === '\n') {
                typewriterDiv.innerHTML += '<br>';
            } else {
                typewriterDiv.innerHTML += char;
            }
            i++;
            setTimeout(typeWriter, speed);
        }
    }

    typeWriter();
}

function loadMoreParcels(reset = false) {
    if (isLoading) return;
    isLoading = true;

    try {
        if (reset) {
            currentPage = 0;
            document.getElementById('parcelDetails').innerHTML = '';
        }

        const start = currentPage * PARCELS_PER_PAGE;
        const end = start + PARCELS_PER_PAGE;
        const parcelsToShow = filteredParcels.slice(start, end);

        if (parcelsToShow.length > 0) {
            displayParcelDetails(parcelsToShow, !reset);
            currentPage++;
        }
    } finally {
        isLoading = false;
    }
}

// Update generateParcelCard to add data-plot-id
function generateParcelCard(parcel) {
    const zoneColor = ZONE_COLORS[parcel.ZONING.toUpperCase()] || '#1E1E1E';
    const parcelData = btoa(JSON.stringify(parcel));
    
    return `
        <div class="parcel-card" data-plot-id="${parcel.NAME}" style="
            background-color: ${zoneColor}99;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
            <div class="card-header">
                <h2>Plot ${parcel.NAME}</h2>
                <div class="card-actions">
                    <div class="zone-icon">${getZoningIcon(parcel.ZONING)}</div>
                    <button class="download-btn" onclick="handleDownload('${parcelData}')">
                        💾
                    </button>
                </div>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">
                    <span class="icon">${RANK_ICON}</span>
                    Rank:
                </span>
                <span class="detail-value">${parcel.RANK}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">
                    <span class="icon">${NEIGHBORHOOD_ICON}</span>
                    Neighborhood:
                </span>
                <span class="detail-value">${parcel.NEIGHBORHOOD}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Zoning:</span>
                <span class="detail-value">${parcel.ZONING}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Plot Size:</span>
                <span class="detail-value">${parcel.PLOT_SIZE}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Building Size:</span>
                <span class="detail-value">${parcel.BUILDING_SIZE}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Distance to Ocean:</span>
                <span class="detail-value">${parcel.DISTANCE_TO_OCEAN}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Distance to Bay:</span>
                <span class="detail-value">${parcel.DISTANCE_TO_BAY}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Floors:</span>
                <span class="detail-value">${parcel.MIN_FLOORS} - ${parcel.MAX_FLOORS}</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Plot Area:</span>
                <span class="detail-value">${parcel.PLOT_AREA} m²</span>
            </div>
            <div class="parcel-detail">
                <span class="detail-label">Building Height:</span>
                <span class="detail-value">${parcel.MIN_BUILDING_HEIGHT} - ${parcel.MAX_BUILDING_HEIGHT} m</span>
            </div>
        </div>
    `;
}

// Add this new function to handle the download
async function handleDownload(encodedData) {
    try {
        const parcel = JSON.parse(atob(encodedData));
        const card = document.querySelector(`[data-plot-id="${parcel.NAME}"]`);
        const downloadBtn = card.querySelector('.download-btn');
        
        // Temporarily hide the download button
        downloadBtn.style.display = 'none';
        
        // Create image from the card
        const canvas = await html2canvas(card, {
            backgroundColor: null,
            scale: 2, // Higher quality
            logging: false,
            useCORS: true
        });
        
        // Show the download button again
        downloadBtn.style.display = '';
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Plot-${parcel.NAME}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 'image/png');
    } catch (error) {
        console.error('Error processing download:', error);
    }
}



function displayParcelDetails(parcels, append = false) {
    const detailsDiv = document.getElementById('parcelDetails');
    
    if (!parcels.length && !append) {
        detailsDiv.innerHTML = '<div class="error-message">No parcels found. Please check the Plot IDs and try again.</div>';
        return;
    }

    const newContent = `
        <div class="results-container">
            ${parcels.map(generateParcelCard).join('')}
        </div>
    `;

    if (append) {
        detailsDiv.insertAdjacentHTML('beforeend', newContent);
    } else {
        detailsDiv.innerHTML = newContent;
    }
}

// Add this function to your code
function downloadParcelCard(parcel) {
    // Prevent the default click behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Create the content for the text file
    const content = `PLOT ${parcel.NAME} DETAILS
------------------------
Rank: ${parcel.RANK}
Neighborhood: ${parcel.NEIGHBORHOOD}
Zoning: ${parcel.ZONING}
Plot Size: ${parcel.PLOT_SIZE}
Building Size: ${parcel.BUILDING_SIZE}
Distance to Ocean: ${parcel.DISTANCE_TO_OCEAN}
Distance to Bay: ${parcel.DISTANCE_TO_BAY}
Floors: ${parcel.MIN_FLOORS} - ${parcel.MAX_FLOORS}
Plot Area: ${parcel.PLOT_AREA} m²
Building Height: ${parcel.MIN_BUILDING_HEIGHT} - ${parcel.MAX_BUILDING_HEIGHT} m
Distance to Ocean (m): ${parcel.DISTANCE_TO_OCEAN_M}
Distance to Bay (m): ${parcel.DISTANCE_TO_BAY_M}`;

    // Create a Blob containing the text
    const blob = new Blob([content], { type: 'text/plain' });
    
    // Create a temporary URL for the Blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = `Plot-${parcel.NAME}-Details.txt`;
    
    // Append link to body, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    window.URL.revokeObjectURL(url);
}

function populateFilterDropdown() {
    const filterContainer = document.getElementById('filterType');
    
    filterContainer.innerHTML = `
        <button class="filter-button">Filter</button>
        <div class="filter-menu" style="display: none;">
            <div class="filter-option" data-value="All">
                <label>
                    <input type="checkbox" value="All" checked>
                    All
                </label>
            </div>
            ${Object.entries(FILTER_OPTIONS)
                .filter(([category]) => category !== 'All') // Skip 'All' in iteration
                .map(([category, values]) => `
                    <div class="filter-category">${category}</div>
                    ${values.map(value => `
                        <div class="filter-option" data-category="${category}" data-value="${value}">
                            <label>
                                <input type="checkbox" value="${value}">
                                ${value}
                            </label>
                        </div>
                    `).join('')}
                `).join('')}
        </div>
    `;

    // Rest of your event listeners remain the same
    const filterButton = filterContainer.querySelector('.filter-button');
    const filterMenu = filterContainer.querySelector('.filter-menu');
    
    filterButton.addEventListener('click', (e) => {
        e.stopPropagation();
        isFilterOpen = !isFilterOpen;
        filterMenu.style.display = isFilterOpen ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (!filterContainer.contains(e.target)) {
            isFilterOpen = false;
            filterMenu.style.display = 'none';
        }
    });
}

// Update handleFilter function to handle multiple selections
function handleFilter(category, value, isChecked) {
    if (value === 'All') {
        // Clear all filters if "All" is selected
        activeFilters.clear();
        document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
            if (cb.value !== 'All') {
                cb.checked = false;
            }
        });
    } else {
        // Uncheck "All" when other filters are selected
        document.querySelector('input[value="All"]').checked = false;
        
        if (isChecked) {
            if (!activeFilters.has(category)) {
                activeFilters.set(category, new Set());
            }
            activeFilters.get(category).add(value);
        } else {
            if (activeFilters.has(category)) {
                activeFilters.get(category).delete(value);
                if (activeFilters.get(category).size === 0) {
                    activeFilters.delete(category);
                }
            }
        }
    }

    // Apply all active filters
    if (activeFilters.size === 0) {
        filteredParcels = [...allParcelsData];
    } else {
        filteredParcels = allParcelsData.filter(parcel => {
            return Array.from(activeFilters.entries()).every(([category, values]) => {
                switch(category) {
                    case 'Zoning':
                        return values.has(parcel.ZONING);
                    case 'Plot Size':
                        return values.has(parcel.PLOT_SIZE);
                    case 'Building Size':
                        return values.has(parcel.BUILDING_SIZE);
                    case 'Distance to Ocean':
                        return values.has(parcel.DISTANCE_TO_OCEAN);
                    case 'Distance to Bay':
                        return values.has(parcel.DISTANCE_TO_BAY);
                    default:
                        return true;
                }
            });
        });
    }
    
    loadMoreParcels(true);
}

function setupInfiniteScroll() {
    const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                loadMoreParcels();
            }
        });
    }, options);

    // Create and observe sentinel element
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    document.getElementById('parcelDetails').appendChild(sentinel);
    observer.observe(sentinel);
}

async function initialize() {
    try {
        setupTypewriter();
        await loadParcelData();
        setupInfiniteScroll();
        populateFilterDropdown();

        // Update filter event listeners
        document.getElementById('filterType').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const option = e.target.closest('.filter-option');
                const category = option.dataset.category;
                const value = option.dataset.value;
                handleFilter(category, value || 'All', e.target.checked);
            }
        });

        // Setup search functionality
        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');

        searchButton.addEventListener('click', () => {
            const searchTerms = searchInput.value.trim().toUpperCase().split(/[\s,]+/);
            
            if (!searchTerms[0]) {
                filteredParcels = [...allParcelsData];
            } else {
                filteredParcels = searchTerms
                    .map(term => {
                        const cleanTerm = term.replace(/\s+/g, '-');
                        return allParcelsData.find(p => p && p.NAME && 
                            p.NAME.toString().toUpperCase() === cleanTerm);
                    })
                    .filter(Boolean);
            }
            loadMoreParcels(true);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });

        // Setup filter listeners
        document.querySelectorAll('.legend-item').forEach(item => {
            item.addEventListener('click', () => {
                const zoneType = item.getAttribute('data-zone');
                handleFilter(zoneType);
            });
        });

    } catch (error) {
        showError('Failed to initialize the application. Please try again later.');
        console.error('Initialization error:', error);
    }
}

// Add this helper function to convert hex to RGB
function getColorRGB(hex) {
    // Remove the # if present
    hex = hex.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}

function showError(message) {
    const detailsDiv = document.getElementById('parcelDetails');
    detailsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

// Start the application
initialize();

