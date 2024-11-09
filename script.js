function getApiUrl(address) {
    // Check if running locally
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
        return `http://localhost:3001/api/holdings/${address}`;
    } else {
        return `/api/holdings/${address}`;
    }
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
    const content = `# Wiami Urban Planning Plot Search(UNOFFICIAL)
https://unofficialfinder.netlify.app/

Core Features:
• Official XLSX Rankings Integration
• Interactive Hologram Plot Images
• Search by Plot ID or ETH Address
• Multi-Filter System
• Real-time filtering
• Dynamic loading
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
• Media: JSON Metadata & Arweave Images
• Plot Details: Merged Data
• Blockchain: Ethereum LAND NFT Holdings

Special Features:
• 🎥 Video Preview
• 💾 Download Plot Details
• ⭐ Hover for 3D Hologram View
• 📊 Holdings Analysis Dashboard
• 📸 Plot Card Image Export
• 📈 Real-time Holdings Statistics

Advanced Features:
• Wallet Holdings Analysis
  - Total NFT Count
  - Distribution by Zone
  - Holdings Visualization
• Plot Card Export
  - High-resolution Image
  - Combined Plot & Details View
  - One-click Download
  - Wallet Address Search

Instructions:
1. Search by:
   - Plot ID for specific plots
   - ETH address for wallet holdings
2. Apply filters to narrow results
3. Hover over plots for hologram effect
4. Use function buttons:
   - 🎥 View plot video
   - 💾 Download plot details
   - 📊 View holdings analysis
   - 📸 Export plot card`;

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

// Add these global variables at the top
const INITIAL_LOAD_SIZE = 500;
let allDataLoaded = false;
let jsonData = null;
let rankings = null;

async function loadParcelData() {
    try {
        // Load both data sources if not already loaded
        if (!jsonData || !rankings) {
            const [jsonResponse, xlsxResponse] = await Promise.all([
                fetch('./data/metadata.json'),
                fetch('./data/parcels.xlsx')
            ]);

            if (!jsonResponse.ok) {
                throw new Error(`HTTP error loading JSON! status: ${jsonResponse.status}`);
            }

            // Parse JSON data
            jsonData = await jsonResponse.json();
            console.log('JSON Data loaded');

            // Parse XLSX data
            const xlsxBuffer = await xlsxResponse.arrayBuffer();
            const workbook = XLSX.read(xlsxBuffer);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Convert XLSX to JSON starting from row 3
            rankings = XLSX.utils.sheet_to_json(worksheet, {
                range: 2,
                header: ['Rank', 'Name', 'Neighborhood', 'Zoning Type', 'Plot Size', 'Building Size', 
                        'Distance to Ocean', 'Distance to Bay', 'Max # of Floors', 'Min # of Floors', 
                        'Plot Area (m²)', 'Min Building Height (m)', 'Max Building Height (m)', 
                        'Distance to Ocean (m)', 'Distance to Bay (m)']
            });
            console.log('XLSX Data loaded');
        }

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

        // Load only initial batch
        const initialRankings = rankings.slice(0, INITIAL_LOAD_SIZE);
        
        // Process initial batch
        allParcelsData = initialRankings
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

        console.log(`Initial ${INITIAL_LOAD_SIZE} parcels loaded`);
        
        filteredParcels = [...allParcelsData];
        return loadMoreParcels(true);

    } catch (error) {
        console.error('Error in loadParcelData:', error);
        showError(`Failed to load parcel data: ${error.message}`);
        throw error;
    }
}

// Add this function to load more data
async function loadMoreData() {
    if (allDataLoaded) return;

    try {
        const currentSize = allParcelsData.length;
        const nextBatch = rankings.slice(currentSize, currentSize + INITIAL_LOAD_SIZE);
        
        if (nextBatch.length === 0) {
            allDataLoaded = true;
            console.log('All data loaded:', allParcelsData.length, 'parcels');
            return;
        }

        const videoMap = new Map(
            jsonData.nfts
                .filter(nft => nft?.metadata?.name)
                .map(nft => [
                    nft.metadata.name,
                    {
                        video: nft.metadata.animation_url,
                        image: nft.metadata.image
                    }
                ])
        );

        const newParcels = nextBatch
            .map(ranking => {
                if (!ranking?.Name) {
                    console.warn('Invalid ranking data:', ranking);
                    return null;
                }

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

        allParcelsData = [...allParcelsData, ...newParcels];
        console.log(`Loaded ${newParcels.length} more parcels. Total: ${allParcelsData.length}`);
        
    } catch (error) {
        console.error('Error loading more data:', error);
        showError('Failed to load more data');
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
                if (!allDataLoaded) {
                    await loadMoreData();
                }
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

async function searchPlots(searchValue) {
    try {
        const searchTerms = searchValue.toString().toUpperCase().split(/[\s,]+/);
        
        // Show loading state
        showToast('Loading all parcels...');
        
        // Load all remaining data if not already loaded
        while (!allDataLoaded) {
            await loadMoreData();
            console.log(`Loaded parcels: ${allParcelsData.length}`);
        }
        
        console.log('Search terms:', searchTerms);
        
        // Now search through complete dataset
        filteredParcels = searchTerms
            .map(term => {
                if (!term) return null;
                
                const cleanTerm = term.replace(/\s+/g, '-');
                console.log('Looking for:', cleanTerm);
                
                const found = allParcelsData.find(p => {
                    if (!p || !p.NAME) {
                        console.warn('Invalid parcel data:', p);
                        return false;
                    }
                    const parcelName = p.NAME.toString().toUpperCase();
                    return parcelName === cleanTerm;
                });
                
                if (!found) {
                    console.log(`No parcel found for term: ${cleanTerm}`);
                }
                return found;
            })
            .filter(Boolean);
            
        console.log('Found parcels:', filteredParcels.length);
        
        if (filteredParcels.length === 0) {
            showToast('No parcels found matching your search');
        } else {
            showToast(`Found ${filteredParcels.length} parcel(s)`);
        }
        
        return loadMoreParcels(true);
    } catch (error) {
        console.error('Search error:', error);
        showError(`Search failed: ${error.message}`);
        return false;
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

        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');

        searchButton.addEventListener('click', async () => {
            try {
                const searchValue = searchInput.value.trim();
                if (!searchValue) {
                    showToast('Please enter a search term');
                    return;
                }
                
                // Clear previous results
                const existingSearchResults = document.getElementById('searchResults');
                if (existingSearchResults) {
                    existingSearchResults.remove();
                }
                
                const detailsDiv = document.getElementById('parcelDetails');
                detailsDiv.innerHTML = ''; // Clear parcel details
                
                if (ETH_ADDRESS_REGEX.test(searchValue)) {
                    // Existing wallet search code...
                } else {
                    await searchPlots(searchValue);
                }
            } catch (error) {
                console.error('Search button error:', error);
                showError(`Search failed: ${error.message}`);
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