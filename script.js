const ZONE_COLORS = {
    'LEGENDARY': '#9933CC',
    'MIXED USE': '#FF3366',
    'INDUSTRIAL': '#FFD700',
    'RESIDENTIAL': '#0066FF',
    'COMMERCIAL': '#FF6600'
};

const RANK_ICON = '⭐';
const NEIGHBORHOOD_ICON = '📍';
const ZONING_ICONS = {
    'LEGENDARY': '💎',
    'MIXED USE': '🏆',
    'RESIDENTIAL': '🏠',
    'COMMERCIAL': '🏢',
    'INDUSTRIAL': '🏭'
};

async function loadParcelData() {
    try {
        const response = await fetch('./data/parcels.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        return XLSX.utils.sheet_to_json(firstSheet, {
            raw: true,
            header: ['RANK', 'NAME', 'NEIGHBORHOOD', 'ZONING', 'PLOT_SIZE', 'BUILDING_SIZE', 
                    'DISTANCE_TO_OCEAN', 'DISTANCE_TO_BAY', 'MAX_FLOORS', 'MIN_FLOORS', 
                    'PLOT_AREA', 'MIN_BUILDING_HEIGHT', 'MAX_BUILDING_HEIGHT', 
                    'DISTANCE_TO_OCEAN_M', 'DISTANCE_TO_BAY_M'],
            range: 1 // Skip header row
        });
    } catch (error) {
        console.error('Error loading parcel data:', error);
        throw new Error('Failed to load parcel data');
    }
}

function generateParcelCard(parcel) {
    return `
        <div class="parcel-card" style="border-left: 4px solid ${ZONE_COLORS[parcel.ZONING] || '#FFFFFF'}">
            <h2>Plot ${parcel.NAME}</h2>
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
                <span class="detail-label">
                    <span class="icon">${ZONING_ICONS[parcel.ZONING] || ''}</span>
                    Zoning:
                </span>
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

function displayParcelDetails(parcels) {
    const detailsDiv = document.getElementById('parcelDetails');
    
    if (!parcels.length) {
        detailsDiv.innerHTML = '<div class="error-message">No parcels found. Please check the Plot IDs and try again.</div>';
        return;
    }

    detailsDiv.innerHTML = `
        <div class="results-container">
            ${parcels.map(generateParcelCard).join('')}
        </div>
    `;
}

function showError(message) {
    const detailsDiv = document.getElementById('parcelDetails');
    detailsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

async function initialize() {
    try {
        const parcelsData = await loadParcelData();
        console.log('Loaded parcels:', parcelsData[0]); // Debug log

        const searchButton = document.getElementById('searchButton');
        const searchInput = document.getElementById('searchInput');

        searchButton.addEventListener('click', () => {
            const searchTerms = searchInput.value.trim().toUpperCase().split(/[\s,]+/);
            console.log('Searching for:', searchTerms); // Debug log

            const foundParcels = searchTerms
                .map(term => parcelsData.find(p => p.NAME === term))
                .filter(Boolean);

            if (foundParcels.length) {
                displayParcelDetails(foundParcels);
            } else {
                showError('No parcels found. Please check the Plot IDs and try again.');
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    } catch (error) {
        showError('Failed to initialize the application. Please try again later.');
        console.error('Initialization error:', error);
    }
}

// Start the application
initialize();