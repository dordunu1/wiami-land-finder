// Constants
const ZONE_COLORS = {
    'RESIDENTIAL': '#0066FF',
    'COMMERCIAL': '#00FF00',
    'INDUSTRIAL': '#FFD700',
    'MIXED USE': '#FF4500',
    'LEGENDARY': '#9933CC'
};

const RANK_ICON = '⭐';
const NEIGHBORHOOD_ICON = '📍';
const VIDEO_ICON = '🎥';
const PARCELS_PER_PAGE = 4444;

// Global state
let currentPage = 0;
let allParcelsData = [];
let filteredParcels = [];
let isLoading = false;
let isFilterOpen = false;
let activeFilters = new Map();

// Filter options
const FILTER_OPTIONS = {
    'All': ['All'],
    'Zoning': ['Legendary', 'Mixed Use', 'Residential', 'Commercial', 'Industrial'],
    'Neighborhood': [
        'Flashing Lights',
        'North Star',
        'Nexus',
        'District ZERO',
        'Tranquility Gardens',
        'Space Mind',
        'Haven Heights',
        'Little Meow'
    ],
    'Plot Size': ['Micro', 'Mid', 'Nano', 'Macro', 'Mammoth', 'Giga', 'Mega'],
    'Building Size': ['Megatall', 'Supertall', 'Highrise', 'Tall', 'Lowrise'],
    'Distance to Ocean': ['Close', 'Medium', 'Far'],
    'Distance to Bay': ['Close', 'Medium', 'Far']
};

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

function setupTypewriter() {
    const content = `Wiami Urban Planning
Plot Search

Core Features:
• Official XLSX Rankings Integration
• Search plots by ID
• Multi-Filter System
• Real-time filtering
• Dynamic loading (20 plots/page)
• Color-coded zoning types
• Plot video previews
• Downloadable plot data

Zoning Types:
• Legendary 💎
• Mixed Use 🏆
• Residential 🏠
• Commercial 🏢
• Industrial 🏭

Data Sources:
• Rankings: Official XLSX File
• Media: JSON Metadata
• Plot Details: Merged Data

Instructions:
1. Use the search bar to find specific plots
2. Apply filters to narrow down results
3. Click 🎥 to view plot video
4. Click 💾 to download plot details`;

    const typewriterContainer = document.createElement('div');
    typewriterContainer.className = 'typewriter-container';
    typewriterContainer.innerHTML = `
        <div class="typewriter">
            <button class="typewriter-close"></button>
            <div class="typewriter-content"></div>
        </div>
    `;
    document.body.appendChild(typewriterContainer);

    const typewriterContent = typewriterContainer.querySelector('.typewriter-content');
    let i = 0;

    function typeWriter() {
        if (i < content.length) {
            typewriterContent.textContent += content.charAt(i);
            i++;
            setTimeout(typeWriter, 20);
        }
    }

    typewriterContainer.querySelector('.typewriter-close').addEventListener('click', function() {
        typewriterContainer.classList.add('hidden');
    });

    typeWriter();
}

async function loadParcelData() {
    try {
        // Load both data sources
        const [jsonResponse, xlsxResponse] = await Promise.all([
            fetch('./data/metadata.json'),
            fetch('./data/parcels.xlsx')
        ]);

        if (!jsonResponse.ok) {
            throw new Error(`HTTP error loading JSON! status: ${jsonResponse.status}`);
        }

        // Parse JSON data
        const jsonData = await jsonResponse.json();
        console.log('JSON Data first entry:', jsonData.nfts[0]); // Debug log

        // Parse XLSX data
        const xlsxBuffer = await xlsxResponse.arrayBuffer();
        const workbook = XLSX.read(xlsxBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log('XLSX Range:', range); // Debug log

        // Convert XLSX to JSON starting from row 3
        const rankings = XLSX.utils.sheet_to_json(worksheet, {
            range: 2,  // Start from row 3
            header: ['Rank', 'Name', 'Neighborhood', 'Zoning Type', 'Plot Size', 'Building Size', 
                    'Distance to Ocean', 'Distance to Bay', 'Max # of Floors', 'Min # of Floors', 
                    'Plot Area (m²)', 'Min Building Height (m)', 'Max Building Height (m)', 
                    'Distance to Ocean (m)', 'Distance to Bay (m)']
        });

        console.log('First XLSX entry:', rankings[0]); // Debug log

        // Create video URL map from JSON
        const videoMap = new Map();
        jsonData.nfts.forEach(nft => {
            if (nft.metadata && nft.metadata.name) {
                videoMap.set(nft.metadata.name, {
                    video: nft.metadata.animation_url,
                    image: nft.metadata.image
                });
            }
        });

        console.log('Video Map size:', videoMap.size); // Debug log
        console.log('First few video map entries:', 
            Array.from(videoMap.entries()).slice(0, 3)); // Debug log

        // Merge data
        allParcelsData = rankings
            .map(ranking => {
                const plotName = ranking.Name;
                const mediaData = videoMap.get(plotName);

                if (!mediaData) {
                    console.warn(`No media data found for plot: ${plotName}`);
                    return null;
                }

                return {
                    NAME: plotName,
                    RANK: ranking.Rank,
                    NEIGHBORHOOD: ranking.Neighborhood,
                    ZONING: ranking['Zoning Type'],
                    PLOT_SIZE: ranking['Plot Size'],
                    BUILDING_SIZE: ranking['Building Size'],
                    DISTANCE_TO_OCEAN: ranking['Distance to Ocean'],
                    DISTANCE_TO_BAY: ranking['Distance to Bay'],
                    MAX_FLOORS: ranking['Max # of Floors'],
                    MIN_FLOORS: ranking['Min # of Floors'],
                    PLOT_AREA: ranking['Plot Area (m²)'],
                    MIN_BUILDING_HEIGHT: ranking['Min Building Height (m)'],
                    MAX_BUILDING_HEIGHT: ranking['Max Building Height (m)'],
                    DISTANCE_TO_OCEAN_M: ranking['Distance to Ocean (m)'],
                    DISTANCE_TO_BAY_M: ranking['Distance to Bay (m)'],
                    VIDEO_URL: mediaData.video,
                    IMAGE_URL: mediaData.image
                };
            })
            .filter(Boolean);

        console.log('First few merged records:', allParcelsData.slice(0, 3));
        
        if (allParcelsData.length === 0) {
            throw new Error('No data after merging XLSX and JSON');
        }

        filteredParcels = [...allParcelsData];
        return loadMoreParcels(true);

    } catch (error) {
        console.error('Error in loadParcelData:', error);
        showError(`Failed to load parcel data: ${error.message}`);
        throw error;
    }
}
function generateParcelCard(parcel) {
    const zoneColor = ZONE_COLORS[parcel.ZONING.toUpperCase()] || '#1E1E1E';
    const parcelData = btoa(JSON.stringify(parcel));
    const imageUrl = parcel.IMAGE_URL ? parcel.IMAGE_URL.replace('ar://', 'https://arweave.net/') : '';
    
    return `
        <div class="parcel-card" data-plot-id="${parcel.NAME}" style="background-color: ${zoneColor}99">
            ${imageUrl ? `
            <div class="hologram-overlay">
                <img src="${imageUrl}" 
                     class="hologram-image" 
                     alt="Plot ${parcel.NAME}"
                     onerror="this.style.display='none'"
                     loading="lazy">
                <div class="hologram-glitch"></div>
            </div>
            ` : ''}
            <div class="card-content">
                <div class="card-header">
                    <h2>Plot ${parcel.NAME}</h2>
                    <div class="card-actions">
                        <div class="zone-icon">${getZoningIcon(parcel.ZONING)}</div>
                        ${parcel.VIDEO_URL ? 
                            `<a href="${parcel.VIDEO_URL}" target="_blank" class="video-btn" title="Watch Plot Video">
                                ${VIDEO_ICON}
                            </a>` : ''}
                        <button class="download-btn" onclick="handleDownload('${parcelData}')">💾</button>
                    </div>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">
                        <span class="icon">${RANK_ICON}</span>Rank
                    </span>
                    <span class="detail-value">${parcel.RANK}</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">
                        <span class="icon">${NEIGHBORHOOD_ICON}</span>Neighborhood
                    </span>
                    <span class="detail-value">${parcel.NEIGHBORHOOD}</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Zoning</span>
                    <span class="detail-value">${parcel.ZONING}</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Plot Size</span>
                    <span class="detail-value">${parcel.PLOT_SIZE}</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Building Size</span>
                    <span class="detail-value">${parcel.BUILDING_SIZE}</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Floors</span>
                    <span class="detail-value">${parcel.MIN_FLOORS} - ${parcel.MAX_FLOORS}</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Plot Area</span>
                    <span class="detail-value">${parcel.PLOT_AREA} m²</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Building Height</span>
                    <span class="detail-value">${parcel.MIN_BUILDING_HEIGHT} - ${parcel.MAX_BUILDING_HEIGHT} m</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Distance to Ocean</span>
                    <span class="detail-value">${parcel.DISTANCE_TO_OCEAN} (${parcel.DISTANCE_TO_OCEAN_M}m)</span>
                </div>
                <div class="parcel-detail">
                    <span class="detail-label">Distance to Bay</span>
                    <span class="detail-value">${parcel.DISTANCE_TO_BAY} (${parcel.DISTANCE_TO_BAY_M}m)</span>
                </div>
            </div>
        </div>
    `;
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

function displayParcelDetails(parcels, append = false) {
    const container = document.getElementById('parcelDetails');
    const content = parcels.map(parcel => generateParcelCard(parcel)).join('');
    
    if (append) {
        container.innerHTML += content;
    } else {
        container.innerHTML = content;
    }
}

function handleDownload(parcelData) {
    const parcel = JSON.parse(atob(parcelData));
    const content = Object.entries(parcel)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Plot-${parcel.NAME}-Details.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                .filter(([category]) => category !== 'All')
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

    setupFilterEventListeners();
}

function setupFilterEventListeners() {
    const filterContainer = document.getElementById('filterType');
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

    filterContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const option = e.target.closest('.filter-option');
            const category = option.dataset.category;
            const value = option.dataset.value;
            handleFilter(category, value || 'All', e.target.checked);
        }
    });
}

function handleFilter(category, value, isChecked) {
    if (value === 'All') {
        activeFilters.clear();
        document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
            if (cb.value !== 'All') {
                cb.checked = false;
            }
        });
    } else {
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

    applyFilters();
}

function applyFilters() {
    if (activeFilters.size === 0) {
        filteredParcels = [...allParcelsData];
    } else {
        filteredParcels = allParcelsData.filter(parcel => {
            return Array.from(activeFilters.entries()).every(([category, values]) => {
                switch(category) {
                    case 'Zoning':
                        return values.has(parcel.ZONING);
                    case 'Neighborhood':
                        return values.has(parcel.NEIGHBORHOOD);
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

    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    document.getElementById('parcelDetails').appendChild(sentinel);
    observer.observe(sentinel);
}

function showError(message) {
    const detailsDiv = document.getElementById('parcelDetails');
    detailsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

async function initialize() {
    try {
        setupTypewriter();
        await loadParcelData();
        setupInfiniteScroll();
        populateFilterDropdown();

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

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application');
    }
}

// Start the application
initialize();