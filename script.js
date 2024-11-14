import { createTraitCharts } from '/blockchain/Charts.js';

function getApiUrl(address) {
    // When using Netlify, use the correct path format
    return `/.netlify/functions/analytics/${address}`;
}

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
const PARCELS_PER_PAGE = 1500;

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

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

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
    const content = `# Wiami Urban Planning Plot Search (UNOFFICIAL)
https://unofficialfinder.netlify.app/

Core Features:
• Search by Plot ID, ETH Address, or ENS Name
• Interactive Plot Holograms & Video Previews
• Multi-Filter System with Real-time Updates
• Genesis Land Analytics & Statistics
• Activity Tracking for Land Sales & Transfers
• Holdings Analysis Dashboard

Search Options:
• Plot ID Search
• ETH Address (0x...)
• ENS Domain Names
• Multi-Plot Search

Analytics & Data:
• Genesis Land Distribution
• Real-time Market Activity
• Wallet Holdings Analysis
• Transfer History Tracking
• Zone Distribution Stats
• Plot Size Analytics

Plot Features:
• 🎥 Video Previews
• 💾 Plot Data Export
• ⭐ 3D Hologram View
• 📊 Holdings Dashboard
• 📸 Plot Card Export


Recent Updates:
• ENS Domain Search Support
• Genesis Land Analytics
• Activity Tab for Sales History
• Address Holdings Dashboard
• Transfer History Tracking
• Real-time Market Data

Instructions:
1. Search using:
   - Plot IDs
   - ETH Address
   - ENS Name
2. Explore Analytics:
   - Genesis Land Stats
   - Market Activity
   - Holdings Analysis
3. View Plot Details:
   - Hologram Preview
   - Video 
   - Download Data`;

   // Add this at the top with your other constants
    const analyticsBtn = document.getElementById('analytics-btn');
    const mainAnalyticsContainer = document.getElementById('analytics-container');
    const holdingsAnalyticsContainer = document.getElementById('holdings-analytics-container');

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

const ENS_REGEX = /^[a-zA-Z0-9-]+\.eth$/;

async function resolveAddress(input) {
    try {
        if (ENS_REGEX.test(input)) {
            const response = await fetch(`/.netlify/functions/resolveENS/${input}`);
            const data = await response.json();
            
            if (!data.success || !data.address) {
                throw new Error(data.error || 'Invalid ENS name');
            }
            return data.address;
        }
        return input;
    } catch (error) {
        console.error('ENS resolution error:', error);
        throw new Error(`Failed to resolve ENS name: ${error.message}`);
    }
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

function generateExpandedView(parcel, holdingsData = null) {
    return `
        <div class="expanded-card">
            <div class="expanded-header">
                <h2>${parcel.NAME}</h2>
                <button class="close-expanded">×</button>
            </div>
            <div class="expanded-content">
                <div class="parcel-details">
                    <div class="basic-info">
                        <p>Neighborhood: ${NEIGHBORHOOD_ICON} ${parcel.NEIGHBORHOOD}</p>
                        <p>Zoning: ${getZoningIcon(parcel.ZONING)} ${parcel.ZONING}</p>
                        <p>Plot Size: ${parcel.PLOT_SIZE}</p>
                        <p>Building Size: ${parcel.BUILDING_SIZE}</p>
                    </div>
                    
                    ${holdingsData ? `
                        <div class="blockchain-data">
                            <h3>Blockchain Details</h3>
                            <p>Token ID: ${holdingsData.tokenId}</p>
                            <p>Last Updated: ${new Date(holdingsData.timeLastUpdated).toLocaleDateString()}</p>
                            <p>Balance: ${holdingsData.balance}</p>
                        </div>
                    ` : ''}
                    
                    <div class="chart-container">
                        <!-- Add chart here using Chart.js or similar -->
                    </div>
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
            const parcelDetails = document.getElementById('parcelDetails');
            parcelDetails.innerHTML = '';
            
            // Reset the container styles
            parcelDetails.style.display = 'grid';
            parcelDetails.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
            parcelDetails.style.gap = '20px';
            parcelDetails.style.padding = '20px';
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
    try {
        const parcel = JSON.parse(atob(parcelData));
        const parcelCard = document.querySelector(`.parcel-card[data-plot-id="${parcel.NAME}"]`);
        
        if (!parcelCard) {
            showToast('Error: Could not find parcel card');
            return;
        }

        // Store references to the buttons and text elements
        const videoBtn = parcelCard.querySelector('.video-btn');
        const downloadBtn = parcelCard.querySelector('.download-btn');
        const textElements = parcelCard.querySelectorAll('.detail-label, .detail-value');
        const originalColors = new Map();

        // Store original colors and set text to white
        textElements.forEach(el => {
            originalColors.set(el, el.style.color);
            el.style.color = '#FFFFFF';
        });
        
        // Temporarily hide the buttons
        if (videoBtn) videoBtn.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';

        // First capture the parcel card
        html2canvas(parcelCard, {
            scale: 2,
            logging: false,
            useCORS: true,
            backgroundColor: null
        }).then(async cardCanvas => {
            // Create a new canvas for the combined image
            const finalCanvas = document.createElement('canvas');
            const ctx = finalCanvas.getContext('2d');

            // Load the Arweave image
            const arweaveImage = new Image();
            arweaveImage.crossOrigin = "anonymous";
            arweaveImage.src = parcel.IMAGE_URL.replace('ar://', 'https://arweave.net/');

            arweaveImage.onload = () => {
                // Calculate dimensions to maintain aspect ratio of Arweave image
                const cardHeight = cardCanvas.height;
                const arweaveAspectRatio = arweaveImage.width / arweaveImage.height;
                const arweaveWidth = cardHeight * arweaveAspectRatio;

                // Set the canvas size
                finalCanvas.width = cardCanvas.width + arweaveWidth;
                finalCanvas.height = cardHeight;

                // Draw the parcel card on the left
                ctx.drawImage(cardCanvas, 0, 0);
                
                // Draw the Arweave image on the right, scaled to match card height
                ctx.drawImage(arweaveImage, cardCanvas.width, 0, arweaveWidth, cardHeight);

                // Create a blob from the canvas and download
                finalCanvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `Plot-${parcel.NAME}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);

                    // Restore original colors
                    textElements.forEach(el => {
                        el.style.color = originalColors.get(el);
                    });

                    // Show the buttons again
                    if (videoBtn) videoBtn.style.display = '';
                    if (downloadBtn) downloadBtn.style.display = '';
                }, 'image/png');
            };

            arweaveImage.onerror = () => {
                // Restore everything on error
                textElements.forEach(el => {
                    el.style.color = originalColors.get(el);
                });
                if (videoBtn) videoBtn.style.display = '';
                if (downloadBtn) downloadBtn.style.display = '';
                console.error('Error loading Arweave image');
                showToast('Error creating combined image');
            };
        }).catch(error => {
            // Restore everything on error
            textElements.forEach(el => {
                el.style.color = originalColors.get(el);
            });
            if (videoBtn) videoBtn.style.display = '';
            if (downloadBtn) downloadBtn.style.display = '';
            console.error('Error capturing card:', error);
            showToast('Error downloading image');
        });
    } catch (error) {
        console.error('Error processing download:', error);
        showToast('Error downloading image');
    }
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

// Add these new global variables
let currentNFTPage = null;
let isLoadingNFTs = false;
let currentWalletAddress = null;

async function fetchNFTPage(address, pageKey = null) {
    let url = `https://eth-mainnet.g.alchemy.com/v2/eFm2JZg30eZjF6Ai0VGhqu4KyUEPkh--/getNFTs/?owner=${address}&contractAddresses[]=0xd396ca541F501F5D303166C509e2045848df356b&pageSize=100`;
    if (pageKey) {
        url += `&pageKey=${pageKey}`;
    }
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });
    
    return response.json();
}

async function processNFTPage(nfts) {
    const newParcels = [];
    
    for (const nft of nfts) {
        const nftName = nft.title || nft.metadata?.name;
        if (!nftName) continue;

        const matchingParcels = allParcelsData.filter(parcel => {
            if (!parcel?.NAME) return false;
            const parcelName = parcel.NAME.toString().trim();
            return parcelName === nftName;
        });

        newParcels.push(...matchingParcels);
    }

    return newParcels;
}

function setupInfiniteScroll() {
    const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(async (entries) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting && !isLoading) {
                if (currentWalletAddress && currentNFTPage && !isLoadingNFTs) {
                    // Load more NFTs
                    isLoadingNFTs = true;
                    try {
                        const pageData = await fetchNFTPage(currentWalletAddress, currentNFTPage);
                        if (pageData.ownedNfts && pageData.ownedNfts.length > 0) {
                            const newParcels = await processNFTPage(pageData.ownedNfts);
                            filteredParcels = [...filteredParcels, ...newParcels];
                            currentNFTPage = pageData.pageKey;
                            loadMoreParcels();
                        }
                    } catch (error) {
                        console.error('Error loading more NFTs:', error);
                    } finally {
                        isLoadingNFTs = false;
                    }
                } else {
                    // Regular infinite scroll for non-wallet searches
                    loadMoreParcels();
                }
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

// Add this helper function for showing toast messages
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove toast after animation
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

async function initializeAnalytics() {
    const analyticsBtn = document.getElementById('analytics-btn');
    const analyticsContainer = document.getElementById('analytics-container');
    const searchResults = document.getElementById('parcelDetails');

    if (!analyticsBtn || !analyticsContainer) return;

    analyticsBtn.addEventListener('click', async () => {
        try {
            const parcelDetails = document.getElementById('parcelDetails');
            const searchContainer = document.querySelector('.search-container');
            const zoningLegend = document.querySelector('.zoning-legend');
            const typewriterContainer = document.querySelector('.typewriter-container');
            const foundCount = document.querySelector('.found-count');

            // Toggle visibility
            if (analyticsContainer.style.display === 'none') {
                // Hide other elements
                parcelDetails.style.display = 'none';
                searchContainer.style.display = 'none';
                zoningLegend.style.display = 'none';
                if (typewriterContainer) typewriterContainer.style.display = 'none';
                if (foundCount) foundCount.style.display = 'none';
                searchResults.innerHTML = '';
                analyticsContainer.style.display = 'block';

                // Fetch analytics data
                const response = await fetch('/.netlify/functions/analytics');
                const responseData = await response.json();

                // Check if the response has the expected structure
                if (!responseData || !responseData.data) {
                    throw new Error('Invalid response format');
                }

                // Create chart configs
                const { renderCharts } = await import('/js/renderCharts.js');
                const chartConfigs = createTraitCharts(responseData.data);

                // Display analytics data and chart containers
                analyticsContainer.innerHTML = `
                    <button id="close-analytics" class="close-btn">×</button>
                    <div class="analytics-content">
                        <h2>WIAMI GENESIS LAND PARCELS Analytics</h2>
                        <div class="chart-grid">
                            <div id="neighborhood-chart"></div>
                            <div id="zoning-chart"></div>
                            <div id="plot-size-chart"></div>
                            <div id="building-height-chart"></div>
                            <div id="distance-ocean-chart"></div>
                            <div id="distance-bay-chart"></div>
                           <div id="numerical-traits-chart"></div>
                        </div>
                    </div>
                `;

                // Render the charts
                renderCharts(chartConfigs);

                // Add close button functionality
                document.getElementById('close-analytics').addEventListener('click', () => {
                    overlay.remove();
                    
                    // Clear search results and found count
                    const searchResults = document.getElementById('searchResults');
                    if (searchResults) searchResults.remove();
                    
                    const foundCount = document.querySelector('[class*="found"]');
                    if (foundCount) foundCount.remove();
                    
                    // Reset filtered parcels to show all
                    filteredParcels = [...allParcelsData];
                    loadMoreParcels(true);
                    
                    // Show all UI elements
                    const parcelDetails = document.getElementById('parcelDetails');
                    const searchContainer = document.querySelector('.search-container');
                    const zoningLegend = document.querySelector('.zoning-legend');
                    const typewriterContainer = document.querySelector('.typewriter-container');
                    
                    if (parcelDetails) parcelDetails.style.display = 'block';
                    if (searchContainer) searchContainer.style.display = 'flex';
                    if (zoningLegend) zoningLegend.style.display = 'block';
                    if (typewriterContainer) typewriterContainer.style.display = 'block';
                });

            } else {
                // Hide analytics and show main content
                analyticsContainer.style.display = 'none';
                parcelDetails.style.display = 'block';
                searchContainer.style.display = 'flex';
                zoningLegend.style.display = 'block';
                if (typewriterContainer) typewriterContainer.style.display = 'block';
                if (foundCount) foundCount.style.display = 'block';
            }

        } catch (error) {
            console.error('Error loading analytics:', error);
            analyticsContainer.innerHTML = `
                <div class="error-message">
                    <button id="close-analytics" class="close-btn">×</button>
                    <p>Failed to load analytics. Please try again later.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;

            // Add close button functionality for error state
            document.getElementById('close-analytics').addEventListener('click', () => {
                overlay.remove();
                
                // Clear search results and found count
                const searchResults = document.getElementById('searchResults');
                if (searchResults) searchResults.remove();
                
                const foundCount = document.querySelector('[class*="found"]');
                if (foundCount) foundCount.remove();
                
                // Reset filtered parcels to show all
                filteredParcels = [...allParcelsData];
                loadMoreParcels(true);
                
                // Show all UI elements
                const parcelDetails = document.getElementById('parcelDetails');
                const searchContainer = document.querySelector('.search-container');
                const zoningLegend = document.querySelector('.zoning-legend');
                const typewriterContainer = document.querySelector('.typewriter-container');
                
                if (parcelDetails) parcelDetails.style.display = 'block';
                if (searchContainer) searchContainer.style.display = 'flex';
                if (zoningLegend) zoningLegend.style.display = 'block';
                if (typewriterContainer) typewriterContainer.style.display = 'block';
            });
        }
    });
}

// Add this function at the top level
function toggleAnalyticsButton(show) {
    const analyticsBtn = document.querySelector('.analytics-button');
    if (analyticsBtn) {
        analyticsBtn.style.display = show ? 'block' : 'none';
    }
}

async function initialize() {
    try {
        console.log('Starting initialization...');
        
        // Load parcel data
        await loadParcelData();
        
        // Debug logs
        console.log('All Parcels Data loaded:', allParcelsData.length, 'parcels');
        console.log('Sample parcels:', allParcelsData.slice(0, 3).map(p => ({
            name: p.NAME,
            neighborhood: p.NEIGHBORHOOD,
            zoning: p.ZONING
        })));

        setupTypewriter();
        setupInfiniteScroll();
        populateFilterDropdown();
        initializeAnalytics();

        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');

        searchButton.addEventListener('click', async () => {
            const searchValue = searchInput.value.trim();
            
            // Clear all previous results first
            const existingSearchResults = document.getElementById('searchResults');
            if (existingSearchResults) {
                existingSearchResults.remove();
            }
            
            const detailsDiv = document.getElementById('parcelDetails');
            detailsDiv.innerHTML = ''; // Clear parcel details
            
            // Reset global states
            currentNFTPage = null;
            isLoadingNFTs = false;
            filteredParcels = [];
            
            if (ETH_ADDRESS_REGEX.test(searchValue) || ENS_REGEX.test(searchValue)) {
                const resolvedAddress = await resolveAddress(searchValue);
                
                if (!ETH_ADDRESS_REGEX.test(resolvedAddress)) {
                    showError('Invalid address format');
                    return;
                }
                // Create new search results container
                const searchResults = document.createElement('div');
                searchResults.id = 'searchResults';
                detailsDiv.parentNode.insertBefore(searchResults, detailsDiv);
                
                try {
                    console.log('Search initiated for ETH address:', searchValue);
                    const pageData = await fetchNFTPage(resolvedAddress);

                    
                    if (!pageData.ownedNfts || pageData.ownedNfts.length === 0) {
                        showError('No NFTs found for this address');
                        return;
                    }

                    // Add NFT count to searchResults
                    const countDiv = document.createElement('div');
                    countDiv.className = 'nft-count';
                    countDiv.textContent = `Found ${pageData.totalCount} NFTs`;
                    searchResults.appendChild(countDiv);

                    // Create analytics button
                    const analyticsBtn = document.createElement('button');
                    analyticsBtn.className = 'analytics-button';
                    analyticsBtn.innerHTML = '📊 View Holdings Analysis';
                    
                    analyticsBtn.onclick = async () => {
                        toggleAnalyticsButton(false); // Hide button when showing analytics
                        
                        try {
                            // Create overlay container
                            const overlay = document.createElement('div');
                            overlay.className = 'analytics-overlay';
                            
                            // Create modal container
                            const modal = document.createElement('div');
                            modal.className = 'analytics-modal';
                            
                            // Use resolvedAddress instead of searchValue for display
                            const displayAddress = searchValue.endsWith('.eth') ? 
                                `${searchValue} (${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)})` :
                                `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`;
                    
                            // Set initial loading state
                            modal.innerHTML = `
                                <div class="loading-container">
                                    <div class="loading-spinner"></div>
                                    <div class="loading-text">
                                        Please wait while we load your analytics...<br>
                                        <span style="font-size: 14px; color: #888; margin-top: 10px; display: block;">
                                            Fetching data for ${displayAddress}
                                        </span>
                                    </div>
                                </div>
                            `;
                            
                            // Add close button
                            const closeBtn = document.createElement('button');
                            closeBtn.className = 'analytics-close-btn';
                            closeBtn.innerHTML = '×';
                            closeBtn.onclick = () => {
                                overlay.remove();
                                
                                // Clear search results and found count
                                const searchResults = document.getElementById('searchResults');
                                if (searchResults) searchResults.remove();
                                
                                const foundCount = document.querySelector('[class*="found"]');
                                if (foundCount) foundCount.remove();
                                
                                // Reset filtered parcels to show all
                                filteredParcels = [...allParcelsData];
                                
                                // Reset the parcel details container
                                const parcelDetails = document.getElementById('parcelDetails');
                                if (parcelDetails) {
                                    parcelDetails.style.display = 'grid';
                                    parcelDetails.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
                                    parcelDetails.style.gap = '20px';
                                    parcelDetails.style.padding = '20px';
                                }
                                
                                loadMoreParcels(true);
                                
                                // Show all UI elements
                                const searchContainer = document.querySelector('.search-container');
                                const zoningLegend = document.querySelector('.zoning-legend');
                                const typewriterContainer = document.querySelector('.typewriter-container');
                                
                                if (searchContainer) searchContainer.style.display = 'flex';
                                if (zoningLegend) zoningLegend.style.display = 'block';
                                if (typewriterContainer) typewriterContainer.style.display = 'block';
                            };
                            
                            modal.appendChild(closeBtn);
                            overlay.appendChild(modal);
                            document.body.appendChild(overlay);
                    
                            // Add escape key listener
                            const escapeHandler = (e) => {
                                if (e.key === 'Escape') {
                                    overlay.remove();
                                    document.removeEventListener('keydown', escapeHandler);
                                }
                            };
                            document.addEventListener('keydown', escapeHandler);
                            
                            // Ensure the loading state is visible for at least 500ms
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            // Fetch data
                            const response = await fetch(getApiUrl(resolvedAddress));
                            const data = await response.json();
                            
                            if (!data.success) {
                                throw new Error(data.error || 'Failed to fetch analytics');
                            }
                    
                            console.log('Number of transfers to display:', data.transfers?.length);
                    
                            const analyticsHTML = `
                                <div class="analytics-container">
                                    <h3>Holdings Analysis</h3>
                                    
                                    <div class="analytics-section">
                                        <h4>Overview</h4>
                                        <div class="total-nfts">
                                            <h4>Total NFTs: ${data.totalCount}</h4>
                                        </div>
                                    </div>
                    
                                    <div class="analytics-section">
                                        <h4>Distribution by Zone</h4>
                                        <div class="zone-distribution">
                                            ${Object.entries(data.analytics?.holdingsByZone || {})
                                                .map(([zone, count]) => `
                                                    <div class="zone-stat">
                                                        <span>${getZoningIcon(zone)} ${zone}</span>
                                                        <span>${count}</span>
                                                    </div>
                                                `).join('')}
                                        </div>
                                    </div>
                    
                                    <div class="analytics-section">
                                        <h4>Distribution by Neighborhood</h4>
                                        <div class="neighborhood-distribution">
                                            ${Object.entries(data.analytics?.holdingsByNeighborhood || {})
                                                .map(([neighborhood, count]) => `
                                                    <div class="neighborhood-stat">
                                                        <span>${NEIGHBORHOOD_ICON} ${neighborhood}</span>
                                                        <span>${count}</span>
                                                    </div>
                                                `).join('')}
                                        </div>
                                    </div>
                    
                                    ${data.transfers && data.transfers.length > 0 ? `
                                        <div class="analytics-section">
                                            <h4>Recent Transfers</h4>
                                            <div class="transfer-history" style="max-height: 500px; overflow-y: auto;">
                                                ${data.transfers.slice(0, 30).map(transfer => `
                                                    <div class="transfer-item" style="
                                                        background: rgba(255, 255, 255, 0.05);
                                                        border-radius: 8px;
                                                        padding: 15px;
                                                        margin-bottom: 10px;
                                                    ">
                                                        <div class="transfer-token" style="
                                                            font-size: 16px;
                                                            margin-bottom: 8px;
                                                            display: flex;
                                                            justify-content: space-between;
                                                            align-items: center;
                                                        ">
                                                            <div>
                                                                <a href="${transfer.openSeaLink}" 
                                                                   target="_blank" 
                                                                   style="color: #00c3ff; text-decoration: none;">
                                                                    ${transfer.tokenName} 
                                                                    ${transfer.zone ? getZoningIcon(transfer.zone) : ''}
                                                                </a>
                                                                ${transfer.neighborhood ? `
                                                                    <span style="margin-left: 10px; color: #888;">
                                                                        ${NEIGHBORHOOD_ICON} ${transfer.neighborhood}
                                                                    </span>
                                                                ` : ''}
                                                            </div>
                                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                                ${transfer.transactionType === 'bought' ? 
                                                                    `<span style="color: #00ff00;">Bought 🛍️</span>` :
                                                                    transfer.transactionType === 'sale' ? 
                                                                    `<span style="color: #ffd700;">Sold 🏷️</span>` :
                                                                    `<span style="color: #888;">Transfer ↔️</span>`
                                                                }
                                                                <span style="color: #888;">${transfer.timeAgo}</span>
                                                            </div>
                                                        </div>
                                                        <div class="transfer-details" style="
                                                            display: grid;
                                                            grid-template-columns: repeat(3, 1fr);
                                                            gap: 10px;
                                                            font-size: 14px;
                                                            color: #ccc;
                                                        ">
                                                            <div>
                                                                From: <a href="https://etherscan.io/address/${transfer.fromAddress}" 
                                                                       target="_blank" 
                                                                       style="color: #00c3ff; text-decoration: none;">
                                                                    ${transfer.fromAddress.slice(0, 6)}...${transfer.fromAddress.slice(-4)}
                                                                </a>
                                                            </div>
                                                            <div>
                                                                To: <a href="https://etherscan.io/address/${transfer.toAddress}" 
                                                                     target="_blank" 
                                                                     style="color: #00c3ff; text-decoration: none;">
                                                                    ${transfer.toAddress.slice(0, 6)}...${transfer.toAddress.slice(-4)}
                                                                </a>
                                                            </div>
                                                            <div style="
                                                                color: ${transfer.transactionType === 'sale' ? 
                                                                    (transfer.value?.includes('WETH') ? '#ffd700' : '#00ff00') : 
                                                                    '#888'};
                                                                text-align: right;
                                                                font-weight: ${transfer.transactionType === 'sale' ? 'bold' : 'normal'};
                                                            ">
                                                                ${transfer.value || 'Transfer'}
                                                            </div>
                                                        </div>
                                                        <div class="transfer-links" style="
                                                            margin-top: 8px;
                                                            text-align: right;
                                                        ">
                                                            <a href="${transfer.etherscanLink}" 
                                                               target="_blank" 
                                                               style="color: #888; text-decoration: none; font-size: 12px;">
                                                                View on Etherscan
                                                            </a>
                                                            ${transfer.value !== 'No price data' ? `
                                                                <span style="color: #666; margin: 0 5px;">•</span>
                                                                <a href="${transfer.openSeaLink}" 
                                                                   target="_blank" 
                                                                   style="color: #888; text-decoration: none; font-size: 12px;">
                                                                    View on OpenSea
                                                                </a>
                                                            ` : ''}
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                    
                            modal.innerHTML = analyticsHTML;
                            modal.insertBefore(closeBtn, modal.firstChild);
                    
                        } catch (error) {
                            console.error('Analytics error:', error);
                            const errorHTML = `<div class="error">Failed to generate analytics: ${error.message}</div>`;
                            const modal = document.querySelector('.analytics-modal');
                            if (modal) {
                                modal.innerHTML = errorHTML;
                            }
                        }
                    };

                    // Add analytics button to searchResults
                    searchResults.appendChild(analyticsBtn);

                    // Process NFTs and update display
                    const initialParcels = await processNFTPage(pageData.ownedNfts);
                    filteredParcels = initialParcels;
                    currentNFTPage = pageData.pageKey;
                    currentWalletAddress = searchValue; // Update current wallet address
                    loadMoreParcels(true);
                    
                } catch (error) {
                    console.error('Search error:', error);
                    showError(`Failed to fetch wallet holdings: ${error.message}`);
                }
            } else {
                // Existing Plot ID search logic remains unchanged
                const searchTerms = searchValue.toUpperCase().split(/[\s,]+/);
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
            }
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